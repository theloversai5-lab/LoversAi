import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { chromaCutout, pasteCutout } from "../media.js";
import { validateComponentSheetOptions, validateRegionEditOptions } from "../contracts.js";
import { compilePrompt } from "../prompts.js";

// A red square with a green "leaf" inside it, on a slightly off chroma-green background.
async function chromaImage() {
  const leaf = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#1f9a3a" } }).png().toBuffer();
  const obj = await sharp({ create: { width: 100, height: 120, channels: 3, background: "#c0302a" } })
    .composite([{ input: leaf, left: 40, top: 50 }])
    .png()
    .toBuffer();
  return sharp({ create: { width: 300, height: 300, channels: 3, background: "#08f50c" } })
    .composite([{ input: obj, left: 100, top: 90 }])
    .png()
    .toBuffer();
}

test("chromaCutout removes only border-connected background, keeps inner green, and trims", async () => {
  const cut = await chromaCutout(await chromaImage());
  const { data, info } = await sharp(cut).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  assert.ok(Math.abs(info.width - 104) <= 2 && Math.abs(info.height - 124) <= 2, `trimmed to the object, got ${info.width}x${info.height}`);
  const at = (x, y) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  assert.equal(at(0, 0)[3], 0, "corner is transparent");
  assert.equal(at(Math.floor(info.width / 2), 10)[3], 255, "object body is opaque");
  const leaf = at(52, 62);
  assert.equal(leaf[3], 255, "green inside the object is kept");
});

test("chromaCutout refuses an image with no separable background", async () => {
  const flat = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#00ff00" } }).png().toBuffer();
  await assert.rejects(chromaCutout(flat), { code: "CUTOUT_FAILED" });
});

test("pasteCutout places the cut-out at the exact box, keeping its aspect ratio and pixels", async () => {
  const cut = await chromaCutout(await chromaImage());
  const base = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#808080" } }).png().toBuffer();
  const out = await pasteCutout(base, cut, { x: 0.5, y: 0.25, w: 0.25 });
  const { data, info } = await sharp(out).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
  assert.deepEqual(px(10, 10), [128, 128, 128], "outside the box is untouched");
  const [r, g] = px(250, 90);
  assert.ok(r > 150 && g < 80, `object colour is unchanged inside the box, got ${px(250, 90)}`);
});

test("placed view and placement options validate and compile to strict prompts", () => {
  const ok = validateComponentSheetOptions({ componentId: "entry", viewType: "placed", azimuth: 45, elevation: 40 });
  assert.deepEqual([ok.azimuth, ok.elevation], [45, 40]);
  assert.throws(() => validateComponentSheetOptions({ componentId: "entry", viewType: "placed", azimuth: 45 }), { code: "INVALID_JOB" });
  assert.throws(() => validateComponentSheetOptions({ componentId: "entry", viewType: "front", azimuth: 45, elevation: 40 }), { code: "INVALID_JOB" });
  const project = {
    brief: {},
    components: [{ id: "entry", category: "entry", description: "Arch", referenceAssetIds: [], masterAssetId: "m" }],
    assets: [
      { id: "m", kind: "component_sheet", status: "approved", viewType: "full_sheet", componentId: "entry", mimeType: "image/png" },
      { id: "iso", kind: "venue_isometric", status: "approved", mimeType: "image/png" },
      { id: "cut", kind: "decor_cutout", status: "approved", mimeType: "image/png" },
    ],
  };
  const placed = compilePrompt("component_sheet", project, ok);
  assert.match(placed.text, /chroma-key green background/);
  assert.match(placed.text, /front-right quarter view/);
  const region = { id: "r1", cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2, rotation: 0, comment: "Placed decor", referenceAssetIds: [] };
  const opts = validateRegionEditOptions({ baseAssetId: "iso", regions: [region], place: { cutoutAssetId: "cut", x: 0.3, y: 0.3, w: 0.2, harmonize: false } }, project);
  assert.equal(opts.place.harmonize, false);
  assert.throws(() => validateRegionEditOptions({ baseAssetId: "iso", regions: [region], place: { cutoutAssetId: "m", x: 0.3, y: 0.3, w: 0.2 } }, project), { code: "ASSET_NOT_APPROVED" });
  assert.throws(() => validateRegionEditOptions({ baseAssetId: "iso", regions: [region], place: { cutoutAssetId: "cut", x: 0.3, y: 0.3, w: 3 } }, project), { code: "INVALID_JOB" });
  const text = compilePrompt("region_edit", project, opts).text;
  assert.match(text, /already contains the final decor object/);
});

test("placement stage: exact paste skips the AI; the AI pass cannot change the object's pixels", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = (await import("node:path")).default;
  const { AssetStore } = await import("../media.js");
  const { runStage } = await import("../stages.js");
  const dir = await mkdtemp(path.join(tmpdir(), "place-stage-"));
  try {
    const assets = new AssetStore(dir);
    const venue = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#3a7a3a" } }).png().toBuffer();
    const base = await assets.write(venue, "image/png");
    const cut = await assets.write(await chromaCutout(await chromaImage()), "image/png");
    const snapshot = {
      _id: "p", revision: 1, brief: {}, components: [],
      assets: [
        { id: base.id, kind: "venue_isometric", status: "approved", mimeType: "image/png" },
        { id: cut.id, kind: "decor_cutout", status: "approved", mimeType: "image/png" },
      ],
    };
    const region = { id: "r1", cx: 0.45, cy: 0.5, rx: 0.2, ry: 0.25, rotation: 0, comment: "Placed decor", referenceAssetIds: [] };
    const run = (harmonize, generate) =>
      runStage(
        { id: `job-${harmonize}`, operation: "region_edit", snapshot, options: validateRegionEditOptions({ baseAssetId: base.id, regions: [region], place: { cutoutAssetId: cut.id, x: 0.35, y: 0.3, w: 0.2, harmonize } }, snapshot) },
        { assets, gemini: { generate, assess: async () => ({ decision: "pass", reason: "ok", issues: [] }) } },
      );
    let called = 0;
    const plain = await run(false, async () => (called++, { buffer: venue, provider: "gemini", model: "image" }));
    assert.equal(called, 0, "no AI call for an exact paste");
    const out = plain.assets.find((a) => a.kind === "region_edit");
    const pixel = async (id, x, y) => {
      const { data, info } = await sharp(await assets.read(id)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      return [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
    };
    const [r, g] = await pixel(out.id, 360, 230);
    assert.ok(r > 150 && g < 80, "the decor is pasted");
    // The "AI" repaints everything blue; the object must still come back red, the rest of the region blue.
    const blue = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#2030c0" } }).png().toBuffer();
    const harmonized = await run(true, async () => ({ buffer: blue, provider: "gemini", model: "image" }));
    const out2 = harmonized.assets.find((a) => a.kind === "region_edit");
    const [r2, g2] = await pixel(out2.id, 360, 230);
    assert.ok(r2 > 150 && g2 < 80, `object pixels are protected, got ${[r2, g2]}`);
    const [, , b3] = await pixel(out2.id, 300, 400);
    assert.ok(b3 > 150, "the AI may change the ground around the object (shadow and light)");
    const [, g4] = await pixel(out2.id, 20, 20);
    assert.ok(g4 > 100, "outside the region stays the venue");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("compositeRegions keeps an AI object that grows past the marked area, but nothing far away", async () => {
  const { compositeRegions } = await import("../media.js");
  const W = 400, H = 300;
  const base = await sharp({ create: { width: W, height: H, channels: 3, background: "#3a7a3a" } }).png().toBuffer();
  // The AI draws a white block that starts inside the mark and extends well past it,
  // and also changes a far corner it should not touch.
  const block = await sharp({ create: { width: 120, height: 60, channels: 3, background: "#f0f0f0" } }).png().toBuffer();
  const corner = await sharp({ create: { width: 30, height: 30, channels: 3, background: "#ff00ff" } }).png().toBuffer();
  const gen = await sharp(base).composite([{ input: block, left: 180, top: 120 }, { input: corner, left: 0, top: 0 }]).png().toBuffer();
  const region = { cx: 0.5, cy: 0.5, rx: 0.06, ry: 0.06, rotation: 0 };
  const out = await compositeRegions(base, gen, [region]);
  const { data, info } = await sharp(out).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
  assert.ok(px(285, 150)[0] > 200, `the part of the object outside the mark is kept, got ${px(285, 150)}`);
  assert.ok(px(10, 10)[0] < 100, `a change far outside the zone is discarded, got ${px(10, 10)}`);
  assert.ok(px(60, 250)[1] > 100 && px(60, 250)[0] < 100, "untouched ground stays the base");
});

test("fit mode sends the cut-out as an identity reference and keeps the AI's re-rendered object", async () => {
  const project = {
    brief: {}, components: [],
    assets: [
      { id: "iso", kind: "venue_isometric", status: "approved", mimeType: "image/png" },
      { id: "cut", kind: "decor_cutout", status: "approved", mimeType: "image/png" },
    ],
  };
  const region = { id: "r1", cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2, rotation: 0, comment: "Placed decor", referenceAssetIds: [] };
  const fit = validateRegionEditOptions({ baseAssetId: "iso", regions: [region], place: { cutoutAssetId: "cut", x: 0.3, y: 0.3, w: 0.2, mode: "fit" } }, project);
  assert.equal(fit.place.mode, "fit");
  assert.equal(fit.place.harmonize, true);
  const compiled = compilePrompt("region_edit", project, fit);
  assert.match(compiled.text, /rough paste of a decor object/);
  assert.ok(compiled.references.some((r) => r.assetId === "cut" && /decor object being placed/.test(r.role)));
  assert.equal(validateRegionEditOptions({ baseAssetId: "iso", regions: [region], place: { cutoutAssetId: "cut", x: 0.3, y: 0.3, w: 0.2, harmonize: false } }, project).place.mode, "exact");
  assert.throws(() => validateRegionEditOptions({ baseAssetId: "iso", regions: [region], place: { cutoutAssetId: "cut", x: 0.3, y: 0.3, w: 0.2, mode: "warp" } }, project), { code: "INVALID_JOB" });
});
