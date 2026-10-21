import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AssetStore } from "../media.js";
import { runStage } from "../stages.js";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";
import { GeminiClient } from "../gemini.js";

async function makeImage() {
  return sharp({
    create: { width: 600, height: 600, channels: 3, background: "#8a7a6a" },
  })
    .jpeg()
    .toBuffer();
}

// Build a minimal project with approved venue assets for isometric generation.
function makeProject(assets) {
  return {
    _id: "proj-iso",
    ownerId: "owner",
    collaborators: [],
    revision: 0,
    brief: { description: "Garden wedding" },
    components: [],
    canvas: null,
    venueCapture: null,
    assets,
    activeJobs: [],
  };
}

test("venue_isometric stage generates and QA-assesses an isometric output", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "iso-stage-"));
  try {
    const assets = new AssetStore(dir);
    const img = await makeImage();
    const views = ["front", "right", "back", "left", "satellite"];
    const stored = [];
    for (const view of views) {
      const f = await assets.write(img, "image/jpeg");
      stored.push({ ...f, kind: "venue", status: "approved", view, mimeType: "image/jpeg" });
    }
    const snapshot = makeProject(stored);
    const venueAssetIds = stored.map((a) => a.id);
    let generateCalled = false;
    const result = await runStage(
      {
        id: "job-iso",
        operation: "venue_isometric",
        options: { venueAssetIds },
        snapshot,
      },
      {
        assets,
        gemini: {
          generate: async (req) => {
            generateCalled = true;
            // 5 venue references
            assert.equal(req.references.length, 5);
            return { buffer: img, provider: "gemini", model: "image" };
          },
          assess: async () => ({
            decision: "pass",
            reason: "All four sides visible, no invented structures",
            issues: [],
          }),
        },
      },
    );
    assert.ok(generateCalled, "generate must be called");
    assert.equal(result.status, "needs_review");
    assert.equal(result.assets.length, 1);
    assert.equal(result.assets[0].kind, "venue_isometric");
    assert.equal(result.assets[0].status, "candidate");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("venue_isometric QA review yields review status", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "iso-review-"));
  try {
    const assets = new AssetStore(dir);
    const img = await makeImage();
    const views = ["front", "right", "back", "left"];
    const stored = [];
    for (const view of views) {
      const f = await assets.write(img, "image/jpeg");
      stored.push({ ...f, kind: "venue", status: "approved", view, mimeType: "image/jpeg" });
    }
    const snapshot = makeProject(stored);
    const result = await runStage(
      {
        id: "job-iso-review",
        operation: "venue_isometric",
        options: { venueAssetIds: stored.map((a) => a.id) },
        snapshot,
      },
      {
        assets,
        gemini: {
          generate: async () => ({ buffer: img, provider: "gemini", model: "image" }),
          assess: async () => ({
            decision: "review",
            reason: "Perspective uncertain",
            issues: ["perspective_ambiguous"],
          }),
        },
      },
    );
    assert.equal(result.assets[0].status, "review");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("validateVenueIsometricOptions rejects fewer than 3 ground views", async () => {
  const service = new PipelineService({
    repository: new MemoryRepository(),
    assets: {},
    gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
  });
  // This is tested via enqueue which calls validateVenueIsometricOptions
  // We test it indirectly through the service
  const project = {
    _id: "p",
    ownerId: "owner",
    collaborators: [],
    revision: 0,
    brief: {},
    components: [],
    canvas: null,
    assets: [
      { id: "a1", kind: "venue", status: "approved", view: "front", mimeType: "image/jpeg" },
      { id: "a2", kind: "venue", status: "approved", view: "right", mimeType: "image/jpeg" },
      { id: "a3", kind: "venue", status: "approved", view: "satellite", mimeType: "image/jpeg" },
    ],
    activeJobs: [],
  };
  service.repository.projects.set("p", structuredClone(project));
  await assert.rejects(
    service.enqueue("p", { _id: "owner" }, {
      revision: 0,
      requestKey: "req-iso",
      operation: "venue_isometric",
      options: { venueAssetIds: ["a1", "a2", "a3"] },
    }),
    { code: "INVALID_JOB" },
  );
});

test("validateVenueIsometricOptions rejects more than one satellite view", async () => {
  const project = {
    _id: "p",
    ownerId: "owner",
    collaborators: [],
    revision: 0,
    brief: {},
    components: [],
    canvas: null,
    assets: [
      { id: "a1", kind: "venue", status: "approved", view: "front", mimeType: "image/jpeg" },
      { id: "a2", kind: "venue", status: "approved", view: "right", mimeType: "image/jpeg" },
      { id: "a3", kind: "venue", status: "approved", view: "back", mimeType: "image/jpeg" },
      { id: "a4", kind: "venue", status: "approved", view: "left", mimeType: "image/jpeg" },
      { id: "sat1", kind: "venue", status: "approved", view: "satellite", mimeType: "image/jpeg" },
      { id: "sat2", kind: "venue", status: "approved", view: "aerial", mimeType: "image/jpeg" },
    ],
    activeJobs: [],
  };
  const service = new PipelineService({
    repository: new MemoryRepository(),
    assets: {},
    gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
  });
  service.repository.projects.set("p", structuredClone(project));
  await assert.rejects(
    service.enqueue("p", { _id: "owner" }, {
      revision: 0,
      requestKey: "req-iso2",
      operation: "venue_isometric",
      options: { venueAssetIds: ["a1", "a2", "a3", "a4", "sat1", "sat2"] },
    }),
    { code: "INVALID_JOB" },
  );
});

test("satellite asset is included as a reference in venue_isometric (not excluded like panorama)", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "iso-sat-"));
  try {
    const assets = new AssetStore(dir);
    const img = await makeImage();
    const views = ["front", "right", "back", "left", "satellite"];
    const stored = [];
    for (const view of views) {
      const f = await assets.write(img, "image/jpeg");
      stored.push({ ...f, kind: "venue", status: "approved", view, mimeType: "image/jpeg" });
    }
    let sentCount = 0;
    const result = await runStage(
      {
        id: "job-sat",
        operation: "venue_isometric",
        options: { venueAssetIds: stored.map((a) => a.id) },
        snapshot: makeProject(stored),
      },
      {
        assets,
        gemini: {
          generate: async (req) => {
            sentCount = req.references.length;
            return { buffer: img, provider: "gemini", model: "image" };
          },
          assess: async () => ({ decision: "pass", reason: "ok", issues: [] }),
        },
      },
    );
    // All 5 references including satellite sent to generate
    assert.equal(sentCount, 5);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
