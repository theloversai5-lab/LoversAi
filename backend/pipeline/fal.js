// fal.ai queue adapter for the Qwen multiple-angles element re-render.
// The key is only ever sent to the fixed queue.fal.run endpoints, never to provider-supplied URLs.
import { setTimeout as delay } from "node:timers/promises";
import { fail } from "./contracts.js";

export const FAL_ANGLES_MODEL = "fal-ai/qwen-image-edit-2511-multiple-angles";
const QUEUE_URL = `https://queue.fal.run/${FAL_ANGLES_MODEL}`;
export const MAX_FAL_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_FAL_JSON_BYTES = 1024 * 1024;

export function falConfigured(apiKey = process.env.FAL_KEY) {
  return (
    typeof apiKey === "string" &&
    !!apiKey.trim() &&
    !/^(your_|<|placeholder|changeme)/i.test(apiKey.trim())
  );
}

// SSRF guard: only HTTPS fal media hosts on the default port, without credentials.
export function allowedFalMediaUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    url.port === "" &&
    (host === "fal.media" || host.endsWith(".fal.media") || host.endsWith(".fal.run"))
  );
}

async function limitedBody(response, max, label) {
  if (Number(response.headers?.get?.("content-length")) > max)
    fail("PROVIDER_RESPONSE_TOO_LARGE", `fal ${label} exceeded the byte limit`, 502);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > max) {
      await response.body?.cancel?.().catch(() => {});
      fail("PROVIDER_RESPONSE_TOO_LARGE", `fal ${label} exceeded the byte limit`, 502);
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
async function limitedJson(response) {
  try {
    const value = JSON.parse(
      (await limitedBody(response, MAX_FAL_JSON_BYTES, "response")).toString("utf8"),
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch (e) {
    if (e.code && e.status) throw e;
    fail("PROVIDER_INVALID_RESPONSE", "fal returned invalid JSON", 502);
  }
}

export class FalClient {
  constructor({
    fetchImpl = globalThis.fetch,
    apiKey = process.env.FAL_KEY,
    pollIntervalMs = 2000,
    timeoutMs = 180000,
  } = {}) {
    Object.assign(this, { fetchImpl, apiKey, pollIntervalMs, timeoutMs });
  }
  configured() {
    return falConfigured(this.apiKey);
  }
  // Provider errors expose only a code and HTTP status, never bodies, URLs or the key.
  async call(url, init, signal) {
    let response;
    try {
      response = await this.fetchImpl(url, { ...init, signal });
    } catch {
      if (signal.aborted)
        fail("PROVIDER_TIMEOUT", "fal request timed out; do not automatically resubmit an uncertain job", 504);
      fail("PROVIDER_UNAVAILABLE", "fal request failed; do not automatically resubmit an uncertain job", 503);
    }
    if (!response.ok) {
      await response.body?.cancel?.().catch(() => {});
      fail("PROVIDER_HTTP_ERROR", `fal returned HTTP ${response.status}`, 502);
    }
    return response;
  }
  async angles({
    buffer,
    mimeType,
    horizontalAngle,
    verticalAngle,
    zoom,
    note = null,
    assertOwnership = async () => {},
  }) {
    if (!this.configured())
      fail("PROVIDER_NOT_CONFIGURED", "Configure FAL_KEY for fal angle renders", 503);
    if (!Buffer.isBuffer(buffer) || !["image/jpeg", "image/png", "image/webp"].includes(mimeType))
      fail("INVALID_REFERENCE", "fal source must be a decoded JPEG, PNG or WebP image");
    const signal = AbortSignal.timeout(this.timeoutMs);
    const headers = { Authorization: `Key ${this.apiKey}`, "Content-Type": "application/json" };
    const started = performance.now();
    await assertOwnership();
    const submitted = await limitedJson(
      await this.call(
        QUEUE_URL,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            image_urls: [`data:${mimeType};base64,${buffer.toString("base64")}`],
            horizontal_angle: horizontalAngle,
            vertical_angle: verticalAngle,
            zoom,
            lora_scale: 1,
            num_images: 1,
            output_format: "jpeg",
            additional_prompt: note || null,
            enable_safety_checker: true,
          }),
        },
        signal,
      ),
    );
    const requestId = submitted.request_id;
    if (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(requestId))
      fail("PROVIDER_INVALID_RESPONSE", "fal did not return a valid request id", 502);
    // Poll fixed URLs built from the validated id; provider status_url/response_url are ignored.
    const requestUrl = `${QUEUE_URL}/requests/${requestId}`;
    for (;;) {
      await assertOwnership();
      const status = await limitedJson(
        await this.call(`${requestUrl}/status`, { method: "GET", headers }, signal),
      );
      if (status.status === "COMPLETED") break;
      if (!["IN_QUEUE", "IN_PROGRESS"].includes(status.status))
        fail("PROVIDER_FAILED", "fal did not complete the request", 502);
      try {
        await delay(this.pollIntervalMs, undefined, { signal });
      } catch {
        fail("PROVIDER_TIMEOUT", "fal request timed out; do not automatically resubmit an uncertain job", 504);
      }
    }
    await assertOwnership();
    const result = await limitedJson(
      await this.call(requestUrl, { method: "GET", headers }, signal),
    );
    const url = Array.isArray(result.images) ? result.images[0]?.url : null;
    if (typeof url !== "string" || !allowedFalMediaUrl(url))
      fail("PROVIDER_INVALID_IMAGE", "fal returned no image from an allowed fal media host", 502);
    // Media download carries no credentials and refuses redirects to other hosts.
    const image = await limitedBody(
      await this.call(url, { method: "GET", redirect: "error" }, signal),
      MAX_FAL_IMAGE_BYTES,
      "image",
    );
    if (!image.length) fail("PROVIDER_INVALID_IMAGE", "fal returned an empty image", 502);
    return {
      buffer: image,
      provider: "fal",
      model: FAL_ANGLES_MODEL,
      telemetry: {
        provider: "fal",
        model: FAL_ANGLES_MODEL,
        requestId,
        elapsedMs: Math.max(0, Math.round(performance.now() - started)),
      },
    };
  }
}
