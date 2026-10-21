import test from "node:test";
import assert from "node:assert/strict";
import { buildGeminiRequest } from "../gemini.js";
import { compilePrompt } from "../prompts.js";
import { validateVenue360Options } from "../contracts.js";
import { ASPECT_RATIO, GENERATIVE_OPERATIONS } from "../preparation.js";

const img = { buffer: Buffer.from([1, 2, 3]), mimeType: "image/jpeg" };
const project = () => ({
  brief: { description: "Lawn wedding" },
  components: [{ id: "stage", category: "stage", description: "LED stage", masterAssetId: "top" }],
  assets: [
    { id: "v1", kind: "venue", status: "approved", view: "front" },
    { id: "v2", kind: "venue", status: "approved", view: "right" },
    { id: "v3", kind: "venue", status: "pending_screen", view: "back" },
    { id: "iso", kind: "venue_isometric", status: "approved" },
    { id: "show", kind: "showcase", status: "approved" },
    { id: "front", kind: "component_sheet", status: "approved", componentId: "stage", viewType: "front" },
    { id: "top", kind: "component_sheet", status: "approved", componentId: "stage", viewType: "top" },
    { id: "cand", kind: "component_sheet", status: "candidate", componentId: "stage" },
  ],
});

test("aspect ratio is sent as imageConfig only for generation and only when supported", () => {
  const wide = JSON.parse(buildGeminiRequest({ system: "s", text: "t", references: [img], aspectRatio: "21:9" }).body);
  assert.deepEqual(wide.generationConfig.imageConfig, { aspectRatio: "21:9" });
  const plain = JSON.parse(buildGeminiRequest({ system: "s", text: "t", references: [img] }).body);
  assert.equal(plain.generationConfig.imageConfig, undefined);
  assert.throws(() => buildGeminiRequest({ system: "s", text: "t", aspectRatio: "2:1" }), { code: "INVALID_ASPECT_RATIO" });
  assert.ok(GENERATIVE_OPERATIONS.includes("venue_360"));
  assert.equal(ASPECT_RATIO.venue_360, "21:9");
});

test("venue_360 accepts an approved design and rejects unknown keys or unapproved designs", () => {
  assert.deepEqual(validateVenue360Options({ designAssetId: "show" }, project()), { designAssetId: "show" });
  assert.deepEqual(validateVenue360Options({}, project()), {});
  assert.throws(() => validateVenue360Options({ extra: 1 }, project()), { code: "INVALID_JOB" });
  assert.throws(() => validateVenue360Options({ designAssetId: "cand" }, project()));
  const empty = { ...project(), assets: [] };
  assert.throws(() => validateVenue360Options({}, empty), { code: "INVALID_JOB" });
});

test("venue_360 prompt sends approved venue photos and the design, never pending photos", () => {
  const out = compilePrompt("venue_360", project(), { designAssetId: "show" });
  assert.deepEqual(out.references.map((r) => r.assetId), ["v1", "v2", "show"]);
  assert.match(out.text, /360-degree eye-level panorama/);
});

test("placement and showcase include every approved view of a component, not only the master", () => {
  const p = project();
  const placement = compilePrompt("placement", p, { baseAssetId: "iso", componentId: "stage" });
  const ids = placement.references.map((r) => r.assetId);
  assert.ok(ids.includes("top") && ids.includes("front"));
  assert.ok(!ids.includes("cand"));
  assert.match(placement.references.find((r) => r.assetId === "front").role, /front view/);
});

test("isometric minimum view count defaults to 3 and only an explicit 1-3 override lowers it", async () => {
  const { isometricMinViews } = await import("../contracts.js");
  assert.equal(isometricMinViews({}), 3);
  assert.equal(isometricMinViews({ WEDDING_PIPELINE_ISOMETRIC_MIN_VIEWS: "1" }), 1);
  assert.equal(isometricMinViews({ WEDDING_PIPELINE_ISOMETRIC_MIN_VIEWS: "0" }), 3);
  assert.equal(isometricMinViews({ WEDDING_PIPELINE_ISOMETRIC_MIN_VIEWS: "9" }), 3);
});
