import test from "node:test";
import assert from "node:assert/strict";
import { estimateCost, projectCosts } from "../pricing.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("OpenAI image cost splits text input, image input and image output tokens", () => {
  const { cost, verified } = estimateCost({
    provider: "openai",
    model: "gpt-image-2",
    kind: "image",
    usage: { input_tokens: 1500, input_tokens_details: { text_tokens: 500, image_tokens: 1000 }, output_tokens: 2000 },
  });
  close(cost, (500 * 5 + 1000 * 8 + 2000 * 30) / 1e6);
  assert.equal(verified, true);
});

test("OpenAI vision cost honours cached input; Gemini bills thinking tokens as text output", () => {
  close(
    estimateCost({ provider: "openai", model: "gpt-4.1", kind: "vision", usage: { input_tokens: 1000, input_tokens_details: { cached_tokens: 400 }, output_tokens: 100 } }).cost,
    (600 * 2 + 400 * 0.5 + 100 * 8) / 1e6,
  );
  close(
    estimateCost({ provider: "gemini", model: "gemini-3.6-flash", kind: "vision", usage: { promptTokenCount: 2000, candidatesTokenCount: 100, thoughtsTokenCount: 300 } }).cost,
    (2000 * 0.75 + 100 * 3.75 + 300 * 3.75) / 1e6,
  );
  const img = estimateCost({ provider: "gemini", model: "gemini-nano-banana-2.1", kind: "image", usage: { promptTokenCount: 1000, candidatesTokenCount: 1120 } });
  close(img.cost, (1000 * 1.5 + 1120 * 30) / 1e6);
  assert.equal(img.verified, false);
});

test("unknown models and missing usage are reported as unpriced, fal bills per megapixel", () => {
  assert.equal(estimateCost({ provider: "openai", model: "mystery", usage: {} }).reason, "unpriced_model");
  assert.equal(estimateCost({ provider: "openai", model: "gpt-4.1" }).reason, "missing_usage");
  close(estimateCost({ provider: "fal", model: "fal-ai/qwen-image-edit-2511-multiple-angles", width: 1000, height: 1000 }).cost, 0.035);
});

test("project costs aggregate generation, QA, screening, analysis and ledger entries", () => {
  const vision = { provider: "openai", model: "gpt-4.1", usage: { input_tokens: 1000, output_tokens: 100 } };
  const image = { provider: "openai", model: "gpt-image-2", usage: { input_tokens_details: { text_tokens: 100, image_tokens: 0 }, output_tokens: 1000 } };
  const out = projectCosts(
    {
      assets: [
        { kind: "venue", screening: { decision: "accept", telemetry: vision } },
        { kind: "venue_isometric", generationTelemetry: image, qa: { decision: "pass", telemetry: vision } },
        { kind: "component_specs", generationTelemetry: vision },
        { kind: "region_edit", generationTelemetry: { provider: "openai", model: "unknown-model", usage: {} } },
      ],
    },
    [{ operation: "suggest", kind: "vision", telemetry: vision }],
  );
  assert.equal(out.byOperation.screen_assets.calls, 1);
  assert.equal(out.byOperation.venue_isometric.calls, 1);
  assert.equal(out.byOperation["venue_isometric QA"].calls, 1);
  assert.equal(out.byOperation.suggest.calls, 1);
  assert.equal(out.unpricedCalls, 1);
  const v = (1000 * 2 + 100 * 8) / 1e6, i = (100 * 5 + 1000 * 30) / 1e6;
  close(out.total, Math.round((4 * v + i) * 10000) / 10000);
  assert.ok(out.byProvider.openai > 0);
});
