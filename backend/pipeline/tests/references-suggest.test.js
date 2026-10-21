import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import sharp from "sharp";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AssetStore } from "../media.js";
import { PipelineService, validatePresetPath, sanitizeSuggestions } from "../service.js";
import { PipelineError } from "../contracts.js";
import { createPipelineRouter } from "../routes.js";
import { MemoryRepository } from "./helpers.js";

async function harness(gemini = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "refs-suggest-"));
  const presetRoot = path.join(dir, "presets", "references");
  await mkdir(path.join(presetRoot, "arches"), { recursive: true });
  const jpeg = await sharp({
    create: { width: 640, height: 640, channels: 3, background: "#c08a60" },
  })
    .jpeg()
    .toBuffer();
  await writeFile(path.join(presetRoot, "arches", "rose-arch.jpg"), jpeg);
  await writeFile(path.join(dir, "presets", "secret.jpg"), jpeg);
  const repo = new MemoryRepository();
  const assets = new AssetStore(path.join(dir, "assets"));
  const service = new PipelineService({ repository: repo, assets, gemini, presetRoot });
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createPipelineRouter({
      service,
      authenticate: (req, res, next) => {
        if (!req.headers["x-test-user"]) return res.status(401).json({});
        req.user = { _id: req.headers["x-test-user"] };
        next();
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (user, url, body) =>
    fetch(`${base}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": user },
      body: JSON.stringify(body),
    });
  const p = {
    _id: "proj-refs",
    ownerId: "owner",
    collaborators: ["helper"],
    revision: 0,
    brief: { description: "Lawn wedding" },
    components: [],
    canvas: null,
    activeJobs: [],
    assets: [],
  };
  const baseFile = await assets.write(
    await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#4a7a4a" } })
      .jpeg()
      .toBuffer(),
    "image/jpeg",
  );
  p.assets.push(
    { ...baseFile, kind: "venue_isometric", status: "approved" },
    { id: "cand", kind: "venue_isometric", status: "candidate", mimeType: "image/jpeg" },
  );
  repo.projects.set(p._id, structuredClone(p));
  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  };
  return { repo, service, call, close, baseId: baseFile.id, projectId: p._id };
}

test("preset paths reject traversal, absolute paths, odd characters and non-images", () => {
  assert.equal(validatePresetPath("arches/rose-arch.jpg"), "arches/rose-arch.jpg");
  for (const bad of [
    "../secret.jpg",
    "arches/../../secret.jpg",
    "arches/..hidden.jpg",
    "/etc/passwd.jpg",
    "arches//rose.jpg",
    "arches\\rose.jpg",
    "C:/x.jpg",
    "Arches/Rose.JPG",
    "arches/rose.gif",
    "arches/rose.jpg.txt",
    "arches/rose arch.jpg",
    "",
    42,
  ])
    assert.throws(() => validatePresetPath(bad), { code: "INVALID_PRESET_PATH" }, String(bad));
});

test("reference import creates an approved preset reference for owner or collaborator only", async () => {
  const h = await harness();
  try {
    const url = `/projects/${h.projectId}/references/import`;
    const traversal = await h.call("owner", url, { revision: 0, presetPath: "../secret.jpg" });
    assert.equal(traversal.status, 400);
    assert.equal((await traversal.json()).code, "INVALID_PRESET_PATH");
    const missing = await h.call("owner", url, { revision: 0, presetPath: "arches/none.jpg" });
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).code, "PRESET_NOT_FOUND");
    assert.equal((await h.call("stranger", url, { revision: 0, presetPath: "arches/rose-arch.jpg" })).status, 404);
    assert.equal((await h.call("owner", url, { revision: 0, presetPath: "arches/rose-arch.jpg", extra: 1 })).status, 400);
    assert.equal((await h.call("owner", url, { revision: 0, presetPath: "arches/rose-arch.jpg", label: "x".repeat(81) })).status, 400);
    assert.equal((await h.call("owner", url, { revision: 5, presetPath: "arches/rose-arch.jpg" })).status, 409);
    const ok = await h.call("helper", url, { revision: 0, presetPath: "arches/rose-arch.jpg", label: " Rose arch " });
    assert.equal(ok.status, 201);
    const body = await ok.json();
    assert.equal(body.duplicate, false);
    assert.equal(body.project.revision, 1);
    const asset = body.asset;
    assert.equal(asset.kind, "reference");
    assert.equal(asset.status, "approved");
    assert.equal(asset.view, "detail");
    assert.equal(asset.referenceSource, "preset");
    assert.equal(asset.referenceLabel, "Rose arch");
    assert.equal(asset.mimeType, "image/jpeg");
    assert.ok(body.project.assets.some((a) => a.id === asset.id));
    // Re-importing the same preset is idempotent and does not advance the revision.
    const again = await h.call("owner", url, { revision: 1, presetPath: "arches/rose-arch.jpg" });
    assert.equal(again.status, 200);
    const againBody = await again.json();
    assert.equal(againBody.duplicate, true);
    assert.equal(againBody.asset.id, asset.id);
    assert.equal((await h.repo.getProject(h.projectId)).revision, 1);
  } finally {
    await h.close();
  }
});

test("suggest crops the circled area, sends crop + full view and sanitizes the provider output", async () => {
  let request;
  const gemini = {
    apiKey: "k",
    imageModel: "i",
    visionModel: "v",
    analyze: async (r) => {
      request = r;
      return {
        value: {
          suggestions: [
            { label: "Entrance arch\u0000<script>", prompt: "Marigold and rose arch at the gate", elementType: "entrance" },
            { label: "Entrance arch<script>", prompt: "duplicate label", elementType: "entrance" },
            { label: "L".repeat(80), prompt: "P".repeat(500), elementType: "lounge" },
            { label: "Mystery", prompt: "Something", elementType: "spaceship" },
            { label: "", prompt: "no label", elementType: "decor" },
            { label: "Fairy lights", prompt: "Warm canopy lights", elementType: "lighting" },
            { label: "Bar", prompt: "Mirrored bar", elementType: "bar" },
            { label: "Dance floor", prompt: "LED floor", elementType: "dance_floor" },
            { label: "Photo booth", prompt: "Floral booth", elementType: "photo_booth" },
          ],
        },
      };
    },
  };
  const h = await harness(gemini);
  try {
    const url = `/projects/${h.projectId}/suggest`;
    const region = { cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1, rotation: 20 };
    const res = await h.call("helper", url, { baseAssetId: h.baseId, region, elementHint: "entry" });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    const { suggestions } = await res.json();
    assert.equal(suggestions.length, 6);
    assert.deepEqual(suggestions[0], {
      label: "Entrance arch script",
      prompt: "Marigold and rose arch at the gate",
      elementType: "entrance",
    });
    assert.equal(suggestions[1].label.length, 40);
    assert.equal(suggestions[1].prompt.length, 200);
    assert.equal(suggestions[2].elementType, "other");
    assert.ok(suggestions.every((s) => !/[<>\u0000]/.test(s.label + s.prompt)));
    // Crop is the ellipse bounding box plus margin; full image is downscaled to <= 1024px.
    assert.equal(request.references.length, 2);
    const crop = await sharp(request.references[0].buffer).metadata();
    const full = await sharp(request.references[1].buffer).metadata();
    assert.ok(crop.width < 400 && crop.width > 240, `crop width ${crop.width}`);
    assert.equal(full.width, 1024);
    assert.equal(request.schema.properties.suggestions.items.properties.elementType.enum.length, 11);
    assert.match(request.system, /Indian wedding production designer/);
    assert.match(request.text, /UNTRUSTED PROJECT DATA/);
    assert.match(request.text, /"elementHint":"entry"/);

    assert.equal((await h.call("stranger", url, { baseAssetId: h.baseId, region })).status, 404);
    for (const body of [
      { baseAssetId: h.baseId, region: { ...region, cx: 1.5 } },
      { baseAssetId: h.baseId, region: { ...region, extra: 1 } },
      { baseAssetId: h.baseId, region, elementHint: "x".repeat(41) },
      { baseAssetId: h.baseId, region, revision: 0 },
    ])
      assert.equal((await h.call("owner", url, body)).status, 400);
    const cand = await h.call("owner", url, { baseAssetId: "cand", region });
    assert.equal((await cand.json()).code, "ASSET_NOT_APPROVED");
  } finally {
    await h.close();
  }
});

test("suggest maps provider failures to 502 and requires a configured vision model", async () => {
  const h = await harness({
    apiKey: "k",
    visionModel: "v",
    analyze: async () => {
      throw new PipelineError("PROVIDER_HTTP_ERROR", "Gemini returned HTTP 500", 502);
    },
  });
  try {
    const body = { baseAssetId: h.baseId, region: { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2 } };
    const res = await h.call("owner", `/projects/${h.projectId}/suggest`, body);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).code, "PROVIDER_HTTP_ERROR");
    h.service.gemini = {};
    const unconfigured = await h.call("owner", `/projects/${h.projectId}/suggest`, body);
    assert.equal(unconfigured.status, 503);
  } finally {
    await h.close();
  }
  assert.throws(() => sanitizeSuggestions({ suggestions: [{ label: " ", prompt: "x" }] }), {
    code: "PROVIDER_INVALID_RESPONSE",
  });
});
