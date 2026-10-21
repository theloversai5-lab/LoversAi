import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  angleLabel,
  azimuthWords,
  elevationWords,
  distanceWords,
  validateElementViewOptions,
} from "../element-view.js";
import { compilePrompt } from "../prompts.js";
import { AssetStore } from "../media.js";
import { runStage } from "../stages.js";
import { PipelineService } from "../service.js";
import { GeminiClient } from "../gemini.js";
import { GENERATIVE_OPERATIONS } from "../preparation.js";
import { MemoryRepository } from "./helpers.js";

const project = () => ({
  _id: "proj-angle",
  ownerId: "owner",
  collaborators: [],
  revision: 0,
  brief: { description: "Palace wedding" },
  components: [{ id: "arch", category: "entry", description: "Floral arch" }],
  canvas: null,
  activeJobs: [],
  assets: [
    { id: "sheet", kind: "component_sheet", status: "approved", componentId: "arch", mimeType: "image/jpeg" },
    { id: "ref", kind: "reference", status: "approved", mimeType: "image/jpeg" },
    { id: "iso", kind: "venue_isometric", status: "approved", mimeType: "image/jpeg" },
    { id: "cand", kind: "decor", status: "candidate", mimeType: "image/jpeg" },
  ],
});

test("angles map to the Qwen multiple-angles vocabulary", () => {
  assert.deepEqual(
    [0, 45, 90, 135, 180, 225, 270, 315, 359, 20, 23].map(azimuthWords),
    [
      "front view",
      "front-right quarter view",
      "right side view",
      "back-right quarter view",
      "back view",
      "back-left quarter view",
      "left side view",
      "front-left quarter view",
      "front view",
      "front view",
      "front-right quarter view",
    ],
  );
  assert.deepEqual(
    [-30, -16, 0, 14, 30, 44, 60, 74, 75, 90].map(elevationWords),
    [
      "low-angle shot",
      "low-angle shot",
      "eye-level shot",
      "eye-level shot",
      "elevated shot",
      "elevated shot",
      "high-angle shot",
      "high-angle shot",
      "bird's-eye top-down shot",
      "bird's-eye top-down shot",
    ],
  );
  assert.deepEqual(
    [0, 2, 3, 5, 7, 8, 10].map(distanceWords),
    ["wide shot", "wide shot", "medium shot", "medium shot", "medium shot", "close-up", "close-up"],
  );
  assert.equal(
    angleLabel({ azimuth: 45, elevation: 30, zoom: 5 }),
    "front-right quarter view, elevated shot, medium shot",
  );
});

test("element_view validation bounds angles, kinds, provider and note", () => {
  const p = project();
  const base = { sourceAssetId: "sheet", azimuth: 90, elevation: 0, zoom: 5 };
  assert.deepEqual(validateElementViewOptions(base, p, {}), { ...base, provider: "gemini" });
  assert.equal(validateElementViewOptions(base, p, { WEDDING_ANGLES_PROVIDER: "fal" }).provider, "fal");
  assert.equal(validateElementViewOptions({ ...base, provider: "gemini" }, p, { WEDDING_ANGLES_PROVIDER: "fal" }).provider, "gemini");
  assert.equal(validateElementViewOptions({ ...base, note: "  softer light " }, p, {}).note, "softer light");
  const bad = (options, code = "INVALID_JOB", env = {}) =>
    assert.throws(() => validateElementViewOptions(options, p, env), { code });
  bad({ ...base, azimuth: 360 });
  bad({ ...base, azimuth: -1 });
  bad({ ...base, elevation: -31 });
  bad({ ...base, elevation: 91 });
  bad({ ...base, zoom: 11 });
  bad({ ...base, zoom: "5" });
  bad({ ...base, provider: "openai" });
  bad(base, "INVALID_JOB", { WEDDING_ANGLES_PROVIDER: "other" });
  bad({ ...base, note: "x".repeat(201) });
  bad({ ...base, extra: true });
  bad({ ...base, sourceAssetId: "iso" }, "ASSET_NOT_APPROVED");
  bad({ ...base, sourceAssetId: "cand" }, "ASSET_NOT_APPROVED");
  assert.ok(GENERATIVE_OPERATIONS.includes("element_view"));
});

test("element_view prompt carries server camera words and keeps the note as untrusted data", () => {
  const out = compilePrompt("element_view", project(), {
    sourceAssetId: "ref",
    azimuth: 180,
    elevation: 80,
    zoom: 9,
    provider: "gemini",
    note: "make it gold",
  });
  assert.match(
    out.text,
    /^Re-render exactly the same decor element from: back view, bird's-eye top-down shot, close-up\./,
  );
  assert.match(out.text, /preserve the element's identity, construction, materials/);
  assert.deepEqual(out.references.map((r) => r.role), ["source decor element to re-render"]);
  const [rules, data] = out.text.split("UNTRUSTED PROJECT DATA (JSON):\n");
  assert.doesNotMatch(rules, /make it gold/);
  assert.equal(JSON.parse(data).note, "make it gold");
});

async function stageSetup() {
  const dir = await mkdtemp(path.join(tmpdir(), "element-view-"));
  const assets = new AssetStore(dir);
  const img = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "#8a6a5a" },
  })
    .jpeg()
    .toBuffer();
  const source = await assets.write(img, "image/jpeg");
  const snapshot = {
    ...project(),
    assets: [
      { id: source.id, kind: "component_sheet", status: "approved", componentId: "arch", mimeType: "image/jpeg" },
    ],
  };
  return { dir, assets, img, source, snapshot };
}

test("element_view gemini stage renders, runs QA and records the angle metadata", async () => {
  const { dir, assets, img, source, snapshot } = await stageSetup();
  try {
    let generated = 0;
    const result = await runStage(
      {
        id: "job-angle",
        operation: "element_view",
        options: { sourceAssetId: source.id, azimuth: 270, elevation: 0, zoom: 1, provider: "gemini" },
        snapshot,
      },
      {
        assets,
        gemini: {
          generate: async (req) => {
            generated++;
            assert.match(req.text, /left side view, eye-level shot, wide shot/);
            return { buffer: img, provider: "gemini", model: "image" };
          },
          assess: async () => ({ decision: "pass", reason: "ok", issues: [] }),
        },
        fal: { angles: async () => assert.fail("fal must not be called") },
      },
    );
    assert.equal(generated, 1);
    const out = result.assets[0];
    assert.equal(out.kind, "element_view");
    assert.equal(out.status, "candidate");
    assert.equal(out.angleLabel, "left side view, eye-level shot, wide shot");
    assert.equal(out.componentId, "arch");
    assert.equal(out.sourceAssetId, source.id);
    assert.equal(out.provider, "gemini");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("element_view fal stage uses the fal adapter, never gemini.generate, and still runs Gemini QA", async () => {
  const { dir, assets, img, source, snapshot } = await stageSetup();
  try {
    let falInput, assessed = 0;
    const result = await runStage(
      {
        id: "job-angle-fal",
        operation: "element_view",
        options: { sourceAssetId: source.id, azimuth: 45, elevation: 30, zoom: 5, provider: "fal", note: "dusk" },
        snapshot,
      },
      {
        assets,
        gemini: {
          generate: async () => assert.fail("gemini.generate must not be called for fal"),
          assess: async ({ references }) => {
            assessed++;
            assert.equal(references.length, 1);
            return { decision: "review", reason: "check back", issues: ["hidden side"] };
          },
        },
        fal: {
          angles: async (input) => {
            falInput = input;
            return {
              buffer: img,
              provider: "fal",
              model: "fal-ai/qwen-image-edit-2511-multiple-angles",
              telemetry: { provider: "fal" },
            };
          },
        },
      },
    );
    assert.equal(falInput.horizontalAngle, 45);
    assert.equal(falInput.verticalAngle, 30);
    assert.equal(falInput.zoom, 5);
    assert.equal(falInput.note, "dusk");
    assert.equal(falInput.mimeType, "image/jpeg");
    assert.equal(typeof falInput.assertOwnership, "function");
    assert.equal(assessed, 1);
    const out = result.assets[0];
    assert.equal(out.provider, "fal");
    assert.equal(out.model, "fal-ai/qwen-image-edit-2511-multiple-angles");
    assert.equal(out.status, "review");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("element_view with fal and no FAL key fails 503 at enqueue without charging", async () => {
  const charges = [];
  const repo = new MemoryRepository();
  const make = (fal) =>
    new PipelineService({
      repository: repo,
      assets: { read: async () => Buffer.from("x") },
      gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
      billing: { charge: async (c) => charges.push(c), refund: async () => {} },
      fal,
    });
  const p = project();
  repo.projects.set(p._id, structuredClone(p));
  const request = {
    revision: 0,
    requestKey: "angle-fal",
    operation: "element_view",
    options: { sourceAssetId: "sheet", azimuth: 90, elevation: 0, zoom: 5, provider: "fal" },
  };
  await assert.rejects(make({ configured: () => false }).enqueue(p._id, { _id: "owner" }, request), {
    code: "PROVIDER_NOT_CONFIGURED",
    status: 503,
  });
  // Default adapter reads process.env.FAL_KEY.
  const saved = process.env.FAL_KEY;
  delete process.env.FAL_KEY;
  try {
    await assert.rejects(make(null).enqueue(p._id, { _id: "owner" }, request), {
      code: "PROVIDER_NOT_CONFIGURED",
      status: 503,
    });
  } finally {
    if (saved !== undefined) process.env.FAL_KEY = saved;
  }
  assert.equal(charges.length, 0);
  const job = await make({ configured: () => true }).enqueue(p._id, { _id: "owner" }, request);
  assert.equal(job.options.provider, "fal");
  assert.equal(charges.length, 1);
  assert.equal(charges[0].amount, 1);
});
