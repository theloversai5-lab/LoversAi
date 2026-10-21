import test from "node:test";
import assert from "node:assert/strict";
import { OpenAIClient, toJsonSchema, openaiSize } from "../openai.js";
import { createModelClient, providerSelection } from "../providers.js";
import { providerReadiness, GeminiClient } from "../gemini.js";

const png = Buffer.from("iVBORw0KGgo=", "base64");
const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  body: [Buffer.from(JSON.stringify(body))],
});
const client = (fetchImpl, extra = {}) =>
  new OpenAIClient({ fetchImpl, apiKey: "sk-test-123", imageModel: "gpt-image-1", visionModel: "gpt-4.1-mini", ...extra });

test("Gemini-style schemas convert to strict JSON Schema", () => {
  const out = toJsonSchema({
    type: "OBJECT",
    properties: { decision: { type: "STRING", enum: ["pass", "reject"] }, issues: { type: "ARRAY", items: { type: "STRING" } }, n: { type: "NUMBER" } },
    required: ["decision"],
  });
  assert.deepEqual(out, {
    type: "object",
    properties: { decision: { type: "string", enum: ["pass", "reject"] }, issues: { type: "array", items: { type: "string" } }, n: { type: "number" } },
    required: ["decision", "issues", "n"],
    additionalProperties: false,
  });
  assert.equal(openaiSize("21:9"), "1536x1024");
  assert.equal(openaiSize("3:4"), "1024x1536");
  assert.equal(openaiSize("1:1"), "1024x1024");
  assert.equal(openaiSize(undefined), "auto");
});

test("generation with references uses images/edits multipart with every reference and returns the image", async () => {
  let seen;
  const c = client(async (url, init) => {
    seen = { url, init };
    return jsonResponse(200, { data: [{ b64_json: png.toString("base64") }], usage: { total_tokens: 10 } });
  }, { inputFidelity: "high" });
  const out = await c.generate({
    text: "Place the arch",
    references: [
      { buffer: png, mimeType: "image/png", role: "clean base" },
      { buffer: png, mimeType: "image/jpeg", role: "region 1 reference 1" },
    ],
    aspectRatio: "3:4",
  });
  assert.equal(seen.url, "https://api.openai.com/v1/images/edits");
  assert.equal(seen.init.headers.Authorization, "Bearer sk-test-123");
  const form = seen.init.body;
  assert.equal(form.getAll("image[]").length, 2);
  assert.equal(form.get("size"), "1024x1536");
  assert.equal(form.get("input_fidelity"), "high");
  assert.match(form.get("prompt"), /IMAGE 2: region 1 reference 1/);
  assert.equal(out.provider, "openai");
  assert.equal(out.mimeType, "image/png");
  assert.deepEqual(out.buffer, png);
});

test("generation without references uses images/generations JSON", async () => {
  let body;
  const c = client(async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/images/generations");
    body = JSON.parse(init.body);
    return jsonResponse(200, { data: [{ b64_json: png.toString("base64") }] });
  });
  await c.generate({ text: "A mandap", references: [] });
  assert.equal(body.model, "gpt-image-1");
  assert.equal(body.size, "auto");
});

test("errors expose only a sanitized code, never the key or body; moderation maps to blocked", async () => {
  const bad = client(async () => jsonResponse(400, { error: { code: "invalid_value", message: "secret details sk-test-123" } }));
  await assert.rejects(bad.generate({ text: "x", references: [] }), (e) => {
    assert.equal(e.code, "PROVIDER_HTTP_ERROR");
    assert.match(e.message, /invalid_value/);
    assert.doesNotMatch(e.message, /sk-test|secret/);
    return true;
  });
  const mod = client(async () => jsonResponse(400, { error: { code: "moderation_blocked" } }));
  await assert.rejects(mod.generate({ text: "x", references: [] }), { code: "PROVIDER_BLOCKED" });
  const none = new OpenAIClient({ fetchImpl: async () => assert.fail("no call"), apiKey: "", imageModel: "gpt-image-1", visionModel: "v" });
  await assert.rejects(none.generate({ text: "x", references: [] }), { code: "PROVIDER_NOT_CONFIGURED" });
});

test("screening runs through the Responses API with a strict schema and shared verdict checks", async () => {
  let body;
  const c = client(async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    body = JSON.parse(init.body);
    return jsonResponse(200, {
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ decision: "accept", category: "venue", reason: "Lawn venue" }) }] }],
    });
  });
  const v = await c.screen({ buffer: png, mimeType: "image/png", kind: "venue", view: "front" });
  assert.equal(v.decision, "accept");
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.equal(body.input[0].content.find((p) => p.type === "input_image").image_url.slice(0, 22), "data:image/png;base64,");
  const refusal = client(async () => jsonResponse(200, { status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] }));
  await assert.rejects(refusal.screen({ buffer: png, mimeType: "image/png", kind: "venue" }), { code: "PROVIDER_BLOCKED" });
  const wrong = client(async () => jsonResponse(200, { output: [{ content: [{ type: "output_text", text: JSON.stringify({ decision: "accept", category: "decor", reason: "x" }) }] }] }));
  await assert.rejects(wrong.screen({ buffer: png, mimeType: "image/png", kind: "venue" }), { code: "PROVIDER_INVALID_VERDICT" });
});

test(".env switch selects providers per role with explicit overrides and rejects unknown names", () => {
  assert.deepEqual(providerSelection({}), { image: "gemini", vision: "gemini" });
  assert.deepEqual(providerSelection({ WEDDING_AI_PROVIDER: "openai" }), { image: "openai", vision: "openai" });
  assert.deepEqual(providerSelection({ WEDDING_AI_PROVIDER: "openai", WEDDING_VISION_PROVIDER: "gemini" }), { image: "openai", vision: "gemini" });
  assert.throws(() => providerSelection({ WEDDING_AI_PROVIDER: "flux" }), { code: "PROVIDER_NOT_CONFIGURED" });

  const openai = new OpenAIClient({ apiKey: "", imageModel: "gpt-image-1", visionModel: "gpt-4.1-mini" });
  const gemini = new GeminiClient({ apiKey: "g-key", imageModel: "img", visionModel: "vis" });
  const routed = createModelClient({ WEDDING_AI_PROVIDER: "openai" }, { openai, gemini });
  const r = providerReadiness(routed);
  assert.equal(r.generationReady, false);
  assert.ok(r.blockers.includes("OPENAI_KEY_MISSING"));
  assert.deepEqual(r.providers, { image: "openai", vision: "openai" });
  assert.equal(routed.imageModel, "gpt-image-1");

  const mixed = createModelClient({ WEDDING_IMAGE_PROVIDER: "openai" }, { openai: client(async () => {}), gemini });
  assert.equal(providerReadiness(mixed).generationReady, true);
  assert.deepEqual(mixed.providers, { image: "openai", vision: "gemini" });
  assert.equal(mixed.visionModel, "vis");
});

test("high input fidelity is requested per task and dropped once when the model rejects it", async () => {
  const { OpenAIClient } = await import("../openai.js");
  const sent = [];
  const png = Buffer.from("iVBORw0KGgo=", "base64");
  const fetchImpl = async (_url, init) => {
    sent.push(init.body.get("input_fidelity"));
    if (sent.length === 1)
      return new Response(JSON.stringify({ error: { code: "invalid_value" } }), { status: 400, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ data: [{ b64_json: "aGVsbG8=" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const client = new OpenAIClient({ fetchImpl, apiKey: "sk-test-real", imageModel: "gpt-image-1", visionModel: "gpt-5", inputFidelity: "" });
  const out = await client.generate({ text: "x", references: [{ buffer: png, mimeType: "image/png" }], fidelity: "high" });
  assert.deepEqual(sent, ["high", null]);
  assert.equal(out.provider, "openai");
});
