import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AssetStore } from "../media.js";
import { runStage } from "../stages.js";
import { compilePrompt } from "../prompts.js";

async function makeImage() {
  return sharp({
    create: { width: 600, height: 600, channels: 3, background: "#c0a080" },
  })
    .jpeg()
    .toBuffer();
}

const baseSnapshot = {
  _id: "p",
  revision: 1,
  brief: { description: "Wedding" },
  components: [
    {
      id: "entry",
      category: "entry",
      description: "Floral entrance arch",
      referenceAssetIds: [],
    },
  ],
  assets: [],
};

test("default viewType is full_sheet and produces the standard 2x2 grid prompt", () => {
  const project = {
    ...baseSnapshot,
    assets: [
      { id: "ref1", kind: "decor", status: "approved", mimeType: "image/jpeg" },
    ],
    components: [
      { id: "entry", category: "entry", description: "Arch", referenceAssetIds: ["ref1"] },
    ],
  };
  const result = compilePrompt("component_sheet", project, { componentId: "entry", viewType: "full_sheet" });
  assert.ok(result.text.includes("2 by 2 grid"), "full_sheet must use the grid template");
});

test("viewType=front uses single-view front elevation prompt instead of grid", () => {
  const project = {
    ...baseSnapshot,
    assets: [],
    components: [
      { id: "entry", category: "entry", description: "Arch", referenceAssetIds: [] },
    ],
  };
  const result = compilePrompt("component_sheet", project, { componentId: "entry", viewType: "front" });
  assert.ok(!result.text.includes("2 by 2 grid"), "front view must not use the grid template");
  assert.ok(result.text.includes("FRONT view"), "front view prompt expected");
});

test("viewType=top uses single-view top plan prompt", () => {
  const project = {
    ...baseSnapshot,
    assets: [],
    components: [
      { id: "entry", category: "entry", description: "Arch", referenceAssetIds: [] },
    ],
  };
  const result = compilePrompt("component_sheet", project, { componentId: "entry", viewType: "top" });
  assert.ok(result.text.includes("TOP view") && result.text.includes("plan view"), "top view prompt expected");
});

test("viewType=side uses single-view side elevation prompt", () => {
  const project = {
    ...baseSnapshot,
    assets: [],
    components: [
      { id: "entry", category: "entry", description: "Arch", referenceAssetIds: [] },
    ],
  };
  const result = compilePrompt("component_sheet", project, { componentId: "entry", viewType: "side" });
  assert.ok(result.text.includes("side elevation"), "side view prompt expected");
});

test("viewType=detail uses material detail close-up prompt", () => {
  const project = {
    ...baseSnapshot,
    assets: [],
    components: [
      { id: "entry", category: "entry", description: "Arch", referenceAssetIds: [] },
    ],
  };
  const result = compilePrompt("component_sheet", project, { componentId: "entry", viewType: "detail" });
  assert.ok(result.text.includes("detail close-up"), "detail view prompt expected");
});

test("omitting viewType defaults to full_sheet (backward compatible)", () => {
  const project = {
    ...baseSnapshot,
    assets: [],
    components: [
      { id: "entry", category: "entry", description: "Arch", referenceAssetIds: [] },
    ],
  };
  const result = compilePrompt("component_sheet", project, { componentId: "entry" });
  assert.ok(result.text.includes("2 by 2 grid"), "default must be full_sheet");
});

test("component_sheet stage with viewType=front still produces a component_sheet output", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "viewtype-stage-"));
  try {
    const assets = new AssetStore(dir);
    const img = await makeImage();
    const result = await runStage(
      {
        id: "job-view",
        operation: "component_sheet",
        options: { componentId: "entry", viewType: "front" },
        snapshot: {
          _id: "p",
          revision: 1,
          brief: { description: "Wedding" },
          components: [
            { id: "entry", category: "entry", description: "Floral arch", referenceAssetIds: [] },
          ],
          assets: [],
        },
      },
      {
        assets,
        gemini: {
          generate: async () => ({ buffer: img, provider: "gemini", model: "image" }),
          assess: async () => ({ decision: "pass", reason: "front elevation looks correct", issues: [] }),
        },
      },
    );
    assert.equal(result.status, "needs_review");
    assert.equal(result.assets[0].kind, "component_sheet");
    assert.equal(result.assets[0].status, "candidate");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("invalid viewType is rejected", async () => {
  const { validateComponentSheetOptions } = await import("../contracts.js");
  assert.throws(
    () => validateComponentSheetOptions({ viewType: "invalid_view" }),
    { code: "INVALID_JOB" },
  );
});

test("viewType=board validates specs and compiles a six-view presentation board prompt", async () => {
  const { validateComponentSheetOptions } = await import("../contracts.js");
  const dims = { depthFt: 16, widthFt: 12 };
  const options = validateComponentSheetOptions({
    componentId: "entry",
    viewType: "board",
    dimensions: dims,
    specNotes: "  Five alternating half arches, lamp racks each side  ",
  });
  assert.deepEqual(options.dimensions, dims);
  assert.equal(options.specNotes, "Five alternating half arches, lamp racks each side");
  assert.throws(
    () => validateComponentSheetOptions({ componentId: "entry", viewType: "front", specNotes: "x" }),
    { code: "INVALID_JOB" },
  );
  assert.throws(
    () => validateComponentSheetOptions({ componentId: "entry", viewType: "board", specNotes: "x".repeat(1501) }),
    { code: "INVALID_JOB" },
  );
  const out = compilePrompt("component_sheet", { ...baseSnapshot }, options);
  assert.match(out.text, /ARCHITECTURAL PRESENTATION BOARD/);
  assert.match(out.text, /06\. ISOMETRIC VIEW/);
  assert.match(out.text, /"vendorSpecNotes":"Five alternating/);
  assert.match(out.text, /"suppliedDimensionsFt":\{"depthFt":16/);
});

test("approved drawings are never reused as render references", () => {
  const project = {
    ...baseSnapshot,
    assets: [
      { id: "master", kind: "component_sheet", status: "approved", componentId: "entry", viewType: "full_sheet", mimeType: "image/png" },
      { id: "board1", kind: "component_sheet", status: "approved", componentId: "entry", viewType: "board", mimeType: "image/png" },
      { id: "front1", kind: "component_sheet", status: "approved", componentId: "entry", viewType: "front", mimeType: "image/png" },
      { id: "iso", kind: "venue_isometric", status: "approved", mimeType: "image/png" },
    ],
    components: [{ id: "entry", category: "entry", description: "Arch", referenceAssetIds: [], masterAssetId: "master" }],
    canvas: { baseAssetId: "iso", regions: [] },
  };
  const ids = compilePrompt("placement", project, { baseAssetId: "iso", componentId: "entry" }).references.map((r) => r.assetId);
  assert.ok(ids.includes("front1"));
  assert.ok(!ids.includes("board1"));
});

test("character sheet treats the first reference as the authoritative primary source and skips the old master", () => {
  const project = {
    ...baseSnapshot,
    assets: [
      { id: "edited", kind: "region_edit", status: "approved", mimeType: "image/png" },
      { id: "extra", kind: "reference", status: "approved", mimeType: "image/png" },
      { id: "oldmaster", kind: "component_sheet", status: "approved", componentId: "entry", viewType: "full_sheet", mimeType: "image/png" },
    ],
    components: [{ id: "entry", category: "entry", description: "Arch", referenceAssetIds: ["edited", "extra"], masterAssetId: "oldmaster" }],
  };
  const sheet = compilePrompt("component_sheet", project, { componentId: "entry", viewType: "full_sheet" });
  assert.deepEqual(sheet.references.map((r) => r.assetId), ["edited", "extra"]);
  assert.match(sheet.references[0].role, /PRIMARY SOURCE/);
  assert.match(sheet.text, /Never revert an edit/);
  const left = compilePrompt("component_sheet", project, { componentId: "entry", viewType: "left" });
  assert.ok(left.references.some((r) => r.assetId === "oldmaster"), "single views copy from the character sheet");
  assert.match(left.text, /LEFT SIDE view/);
  assert.match(left.text, /Only the camera changes/);
});

test("splitSheet cuts an approved character sheet into four approved views in the fixed layout", async () => {
  const { PipelineService } = await import("../service.js");
  const { GeminiClient } = await import("../gemini.js");
  const { MemoryRepository } = await import("./helpers.js");
  const dir = await mkdtemp(path.join(tmpdir(), "split-sheet-"));
  try {
    const assets = new AssetStore(dir);
    // Quadrants coloured so each cut can be identified: TL red, TR green, BL blue, BR white.
    const q = (c) => ({ create: { width: 400, height: 400, channels: 3, background: c } });
    const sheetPng = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#000" } })
      .composite([
        { input: await sharp(q("#ff0000")).png().toBuffer(), left: 0, top: 0 },
        { input: await sharp(q("#00ff00")).png().toBuffer(), left: 400, top: 0 },
        { input: await sharp(q("#0000ff")).png().toBuffer(), left: 0, top: 400 },
        { input: await sharp(q("#ffffff")).png().toBuffer(), left: 400, top: 400 },
      ])
      .png()
      .toBuffer();
    const sheet = await assets.write(sheetPng, "image/png");
    const repo = new MemoryRepository();
    const service = new PipelineService({ repository: repo, assets, gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }) });
    const p = {
      ...baseSnapshot,
      _id: "split",
      ownerId: "owner",
      collaborators: [],
      activeJobs: [],
      revision: 0,
      assets: [
        { id: sheet.id, kind: "component_sheet", viewType: "full_sheet", sheetLayout: "front-right-top-left", status: "approved", componentId: "entry", mimeType: "image/png" },
        { id: "oldsheet", kind: "component_sheet", viewType: "full_sheet", status: "approved", componentId: "entry", mimeType: "image/png" },
      ],
    };
    repo.projects.set(p._id, structuredClone(p));
    await assert.rejects(service.splitSheet("split", { _id: "owner" }, 0, "oldsheet"), { code: "SHEET_OUTDATED" });
    const out = await service.splitSheet("split", { _id: "owner" }, 0, sheet.id);
    assert.deepEqual(out.assets.map((a) => a.viewType), ["front", "right", "top", "left"]);
    assert.ok(out.assets.every((a) => a.status === "approved" && a.componentId === "entry" && a.derivedFromSheet === sheet.id));
    assert.ok(out.assets.every((a) => a.cutVersion === 2));
    const colour = async (a) => [...(await sharp(await assets.read(a.id)).raw().toBuffer()).subarray(0, 3)];
    assert.deepEqual(await colour(out.assets[0]), [255, 0, 0]);
    assert.deepEqual(await colour(out.assets[1]), [0, 255, 0]);
    assert.deepEqual(await colour(out.assets[2]), [0, 0, 255]);
    // Idempotent: a second split returns the same views.
    const again = await service.splitSheet("split", { _id: "owner" }, out.project.revision, sheet.id);
    assert.deepEqual(again.assets.map((a) => a.id), out.assets.map((a) => a.id));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
