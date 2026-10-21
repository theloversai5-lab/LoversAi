// OpenAI provider: GPT Image models for generation/editing and the Responses API
// (strict JSON schema) for screening, QA and analysis. Same interface as GeminiClient.
import { fail } from "./contracts.js";
import {
  ModelClient,
  GENERATION_SYSTEM,
  MAX_REQUEST_BYTES,
  keyLooksReal,
  modelValid,
  parseStructured,
} from "./gemini.js";

const API = "https://api.openai.com/v1";
const MAX_RESPONSE_BYTES = 40 * 1024 * 1024;

// Gemini-style schema (type: "OBJECT" ...) -> strict JSON Schema (all keys required, no extras).
export function toJsonSchema(s) {
  const type = String(s.type || "").toLowerCase();
  if (type === "object") {
    const properties = Object.fromEntries(
      Object.entries(s.properties || {}).map(([k, v]) => [k, toJsonSchema(v)]),
    );
    return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
  }
  if (type === "array") return { type: "array", items: toJsonSchema(s.items || { type: "STRING" }) };
  return { type, ...(s.enum ? { enum: s.enum } : {}) };
}

// GPT Image supports three sizes; pick the closest to the requested aspect ratio.
export function openaiSize(aspectRatio) {
  if (!aspectRatio) return "auto";
  const [w, h] = String(aspectRatio).split(":").map(Number);
  const r = w / h;
  if (!Number.isFinite(r)) return "auto";
  return r >= 1.2 ? "1536x1024" : r <= 0.83 ? "1024x1536" : "1024x1024";
}

const errorCode = (data) => {
  const code = data?.error?.code || data?.error?.type;
  return typeof code === "string" && /^[a-z0-9_.-]{1,60}$/i.test(code) ? code : null;
};

async function limitedJson(response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > MAX_RESPONSE_BYTES) {
      await response.body?.cancel?.().catch(() => {});
      fail("PROVIDER_RESPONSE_TOO_LARGE", "OpenAI response exceeded the byte limit", 502);
    }
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    fail("PROVIDER_INVALID_RESPONSE", "OpenAI returned invalid JSON", 502);
  }
}

const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const referenceManifest = (references) =>
  references.length
    ? `\n\nReference images are attached in this order:\n${references
        .map((r, i) => `IMAGE ${i + 1}: ${r.role || "reference"}`)
        .join("\n")}`
    : "";

export class OpenAIClient extends ModelClient {
  constructor({
    fetchImpl = globalThis.fetch,
    // Project-specific variable first: a user-level OPENAI_API_KEY must not silently win over .env.
    apiKey = process.env.WEDDING_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    imageModel = process.env.WEDDING_OPENAI_IMAGE_MODEL,
    visionModel = process.env.WEDDING_OPENAI_VISION_MODEL,
    quality = process.env.WEDDING_OPENAI_IMAGE_QUALITY || "medium",
    inputFidelity = process.env.WEDDING_OPENAI_INPUT_FIDELITY,
    timeoutMs = 240000,
  } = {}) {
    super();
    Object.assign(this, { fetchImpl, apiKey, imageModel, visionModel, quality, inputFidelity, timeoutMs });
    this.provider = "openai";
  }
  readiness() {
    const key = keyLooksReal(this.apiKey),
      image = modelValid(this.imageModel),
      vision = modelValid(this.visionModel);
    return {
      generationReady: key && image && vision,
      screeningReady: key && vision,
      availabilityVerified: false,
      blockers: [
        ...(!key ? ["OPENAI_KEY_MISSING"] : []),
        ...(!image ? ["OPENAI_IMAGE_MODEL_INVALID"] : []),
        ...(!vision ? ["OPENAI_VISION_MODEL_INVALID"] : []),
      ],
    };
  }
  async call(path, init) {
    if (!keyLooksReal(this.apiKey))
      fail("PROVIDER_NOT_CONFIGURED", "Configure WEDDING_OPENAI_API_KEY and the OpenAI image/vision models", 503);
    const started = performance.now();
    let response;
    try {
      response = await this.fetchImpl(`${API}${path}`, {
        ...init,
        redirect: "error",
        headers: { ...(init.headers || {}), Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      fail("PROVIDER_UNAVAILABLE", "OpenAI request failed or timed out; do not automatically resubmit an uncertain job", 503);
    }
    const data = await limitedJson(response);
    if (!response.ok) {
      const code = errorCode(data);
      if (code === "moderation_blocked" || code === "content_policy_violation")
        fail("PROVIDER_BLOCKED", "OpenAI blocked the request under its content policy", 422);
      fail("PROVIDER_HTTP_ERROR", `OpenAI returned HTTP ${response.status}${code ? ` (${code})` : ""}`, 502);
    }
    return { data, elapsedMs: Math.max(0, Math.round(performance.now() - started)) };
  }
  async generate({ text, references = [], aspectRatio, mask, quality: qualityOverride, fidelity }) {
    if (!modelValid(this.imageModel))
      fail("PROVIDER_NOT_CONFIGURED", "Invalid configured OpenAI image model", 503);
    const referenceBytes = references.reduce((s, r) => s + r.buffer.length, 0);
    if (references.length > 16 || referenceBytes > MAX_REQUEST_BYTES)
      fail("REFERENCE_LIMIT", "Reference count or combined byte budget exceeded", 400);
    const prompt = `${GENERATION_SYSTEM}\n\n${text}${referenceManifest(references)}`;
    const size = openaiSize(aspectRatio);
    const quality = qualityOverride || this.quality;
    let result;
    // Preservation tasks ask for high input fidelity; a model that rejects the parameter (HTTP 400)
    // is retried once with the configured default, which is a certain failure, not an uncertain one.
    const wanted = this.inputFidelity || fidelity || null;
    const edit = async (inputFidelity) => {
      const form = new FormData();
      form.append("model", this.imageModel);
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", size);
      form.append("quality", quality);
      if (inputFidelity) form.append("input_fidelity", inputFidelity);
      // Inpainting mask (PNG, transparent = editable) applies to the first image.
      if (mask) form.append("mask", new Blob([mask], { type: "image/png" }), "mask.png");
      references.forEach((r, i) => {
        if (!extension[r.mimeType]) fail("INVALID_REFERENCE", "Provider references must be JPEG, PNG or WebP", 400);
        form.append("image[]", new Blob([r.buffer], { type: r.mimeType }), `ref-${i + 1}.${extension[r.mimeType]}`);
      });
      return this.call("/images/edits", { method: "POST", body: form });
    };
    if (references.length) {
      try {
        result = await edit(wanted);
      } catch (e) {
        if (!(wanted && !this.inputFidelity && e.code === "PROVIDER_HTTP_ERROR" && /HTTP 400/.test(e.message))) throw e;
        result = await edit(null);
      }
    } else {
      result = await this.call("/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.imageModel, prompt, n: 1, size, quality }),
      });
    }
    const images = Array.isArray(result.data?.data) ? result.data.data.filter((d) => d?.b64_json) : [];
    if (images.length !== 1) fail("PROVIDER_NO_IMAGE", "OpenAI must return exactly one image for this task", 502);
    const b64 = images[0].b64_json;
    if (typeof b64 !== "string" || !b64.length || b64.length > 48 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64))
      fail("PROVIDER_INVALID_IMAGE", "OpenAI returned invalid image bytes", 502);
    return {
      buffer: Buffer.from(b64, "base64"),
      mimeType: "image/png",
      model: this.imageModel,
      provider: "openai",
      telemetry: {
        provider: "openai",
        model: this.imageModel,
        elapsedMs: result.elapsedMs,
        size,
        quality,
        usage: result.data?.usage ?? null,
      },
    };
  }
  async structured({ system, text, references = [], schema, invalidCode }) {
    if (!modelValid(this.visionModel))
      fail("PROVIDER_NOT_CONFIGURED", "Invalid configured OpenAI vision model", 503);
    const referenceBytes = references.reduce((s, r) => s + r.buffer.length, 0);
    if (referenceBytes > MAX_REQUEST_BYTES)
      fail("REFERENCE_LIMIT", "Combined reference byte budget exceeded", 400);
    const content = [
      { type: "input_text", text },
      ...references.flatMap((r, i) => [
        { type: "input_text", text: `IMAGE ${i + 1}: ${r.role || "reference"}` },
        { type: "input_image", image_url: `data:${r.mimeType};base64,${r.buffer.toString("base64")}`, detail: "high" },
      ]),
    ];
    const { data, elapsedMs } = await this.call("/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.visionModel,
        instructions: system,
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "result", schema: toJsonSchema(schema), strict: true } },
      }),
    });
    const parts = (Array.isArray(data.output) ? data.output : []).flatMap((o) => (Array.isArray(o?.content) ? o.content : []));
    if (data.status === "incomplete" || parts.some((p) => p?.type === "refusal"))
      fail("PROVIDER_BLOCKED", "OpenAI refused or did not complete the request", 422);
    const raw = parts.filter((p) => p?.type === "output_text" && typeof p.text === "string").map((p) => p.text).join("");
    return {
      value: parseStructured(raw, invalidCode, "OpenAI"),
      telemetry: { provider: "openai", model: this.visionModel, elapsedMs, usage: data.usage ?? null },
    };
  }
}
