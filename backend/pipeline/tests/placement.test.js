import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AssetStore } from "../media.js";
import { runStage } from "../stages.js";

async function makeImage() {
  return sharp({
    create: { width: 600, height: 600, channels: 3, background: "#7a8a7a" },
  })
    .jpeg()
    .toBuffer();
}

function makePlacementSnapshot({ baseKind = "venue_isometric" } = {}) {
  return {
    _id: "proj-place",
    ownerId: "owner",
    revision: 2,
    brief: { description: "Elegant venue" },
    components: [
      {
        id: "mandap",
        category: "mandap",
        description: "White mandap with flowers",
        masterAssetId: "master-sheet",
        referenceAssetIds: [],
      },
    ],
    canvas: {
      baseAssetId: "base-iso",
      regions: [
        {
          id: "place-mandap",
          action: "place",
          componentId: "mandap",
          points: [
            [0.2, 0.2],
            [0.7, 0.2],
            [0.7, 0.7],
          ],
        },
      ],
      strokes: [],
    },
    assets: [
      {
        id: "base-iso",
        kind: baseKind,
        status: "approved",
        mimeType: "image/jpeg",
        view: null,
      },
      {
        id: "master-sheet",
        kind: "component_sheet",
        status: "approved",
        mimeType: "image/jpeg",
      },
    ],
    activeJobs: [],
    collaborators: [],
  };
}

test("placement stage composites component into marked region with overlay and master references", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "placement-stage-"));
  try {
    const assets = new AssetStore(dir);
    const img = await makeImage();
    // Pre-write assets matching the IDs expected in snapshot
    const baseFile = await assets.write(img, "image/jpeg");
    const masterFile = await assets.write(img, "image/jpeg");
    const snapshot = makePlacementSnapshot();
    snapshot.assets[0].id = baseFile.id;
    snapshot.assets[1].id = masterFile.id;
    snapshot.canvas.baseAssetId = baseFile.id;
    snapshot.canvas.regions[0].componentId = "mandap";
    snapshot.components[0].masterAssetId = masterFile.id;
    let sentRefs;
    const result = await runStage(
      {
        id: "job-place",
        operation: "placement",
        options: { baseAssetId: baseFile.id, componentId: "mandap" },
        snapshot,
      },
      {
        assets,
        gemini: {
          generate: async (req) => {
            sentRefs = req.references.map((r) => r.role);
            return { buffer: img, provider: "gemini", model: "image" };
          },
          assess: async () => ({
            decision: "pass",
            reason: "Component placed correctly inside region",
            issues: [],
          }),
        },
      },
    );
    assert.ok(sentRefs.some((r) => r.includes("clean isometric base view")), "base ref required");
    assert.ok(sentRefs.some((r) => r.includes("placement region overlay")), "overlay ref required");
    assert.ok(sentRefs.some((r) => r.includes("approved component master sheet")), "master ref required");
    assert.equal(result.status, "needs_review");
    assert.equal(result.assets.length, 2); // overlay + output
    const output = result.assets.find((a) => a.kind === "placement");
    assert.ok(output, "placement asset must be produced");
    assert.equal(output.status, "candidate");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("placement stage output kind is placement not showcase", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "placement-kind-"));
  try {
    const assets = new AssetStore(dir);
    const img = await makeImage();
    const baseFile = await assets.write(img, "image/jpeg");
    const masterFile = await assets.write(img, "image/jpeg");
    const snapshot = makePlacementSnapshot();
    snapshot.assets[0].id = baseFile.id;
    snapshot.assets[1].id = masterFile.id;
    snapshot.canvas.baseAssetId = baseFile.id;
    snapshot.components[0].masterAssetId = masterFile.id;
    const result = await runStage(
      {
        id: "job-place-kind",
        operation: "placement",
        options: { baseAssetId: baseFile.id, componentId: "mandap" },
        snapshot,
      },
      {
        assets,
        gemini: {
          generate: async () => ({ buffer: img, provider: "gemini", model: "image" }),
          assess: async () => ({ decision: "pass", reason: "ok", issues: [] }),
        },
      },
    );
    assert.equal(result.assets.find((a) => a.kind === "placement")?.kind, "placement");
    assert.ok(!result.assets.some((a) => a.kind === "showcase"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("two-step placement chain: approved placement asset can be the next base", async () => {
  // Step 1: placement produces a 'placement' asset, which is approved.
  // Step 2: that asset becomes the base for the next placement job.
  const dir = await mkdtemp(path.join(tmpdir(), "placement-chain-"));
  try {
    const assets = new AssetStore(dir);
    const img = await makeImage();

    // Step 1 base: a venue_isometric
    const isoFile = await assets.write(img, "image/jpeg");
    const masterFile = await assets.write(img, "image/jpeg");

    const snapshot1 = {
      _id: "chain-proj",
      ownerId: "owner",
      revision: 1,
      brief: { description: "Chain venue" },
      components: [
        {
          id: "stage",
          category: "stage",
          description: "Timber stage",
          masterAssetId: masterFile.id,
          referenceAssetIds: [],
        },
      ],
      canvas: {
        baseAssetId: isoFile.id,
        regions: [
          {
            id: "r1",
            action: "place",
            componentId: "stage",
            points: [[0.1, 0.1], [0.5, 0.1], [0.5, 0.5]],
          },
        ],
        strokes: [],
      },
      assets: [
        { id: isoFile.id, kind: "venue_isometric", status: "approved", mimeType: "image/jpeg", view: null },
        { id: masterFile.id, kind: "component_sheet", status: "approved", mimeType: "image/jpeg" },
      ],
      activeJobs: [],
      collaborators: [],
    };

    const result1 = await runStage(
      {
        id: "job-chain-1",
        operation: "placement",
        options: { baseAssetId: isoFile.id, componentId: "stage" },
        snapshot: snapshot1,
      },
      {
        assets,
        gemini: {
          generate: async () => ({ buffer: img, provider: "gemini", model: "image" }),
          assess: async () => ({ decision: "pass", reason: "ok", issues: [] }),
        },
      },
    );
    const placementAsset1 = result1.assets.find((a) => a.kind === "placement");
    assert.ok(placementAsset1, "first placement asset produced");

    // Simulate approval of the first placement
    const approvedPlacement1 = { ...placementAsset1, status: "approved", mimeType: "image/jpeg" };

    // Step 2: use the approved placement as the base for the second placement
    const master2File = await assets.write(img, "image/jpeg");
    const snapshot2 = {
      _id: "chain-proj",
      ownerId: "owner",
      revision: 2,
      brief: { description: "Chain venue" },
      components: [
        {
          id: "lounge",
          category: "lounge",
          description: "Lounge seating",
          masterAssetId: master2File.id,
          referenceAssetIds: [],
        },
      ],
      canvas: {
        baseAssetId: approvedPlacement1.id,
        regions: [
          {
            id: "r2",
            action: "place",
            componentId: "lounge",
            points: [[0.5, 0.5], [0.9, 0.5], [0.9, 0.9]],
          },
        ],
        strokes: [],
      },
      assets: [
        approvedPlacement1,
        { id: master2File.id, kind: "component_sheet", status: "approved", mimeType: "image/jpeg" },
      ],
      activeJobs: [],
      collaborators: [],
    };

    const result2 = await runStage(
      {
        id: "job-chain-2",
        operation: "placement",
        options: { baseAssetId: approvedPlacement1.id, componentId: "lounge" },
        snapshot: snapshot2,
      },
      {
        assets,
        gemini: {
          generate: async () => ({ buffer: img, provider: "gemini", model: "image" }),
          assess: async () => ({ decision: "pass", reason: "ok", issues: [] }),
        },
      },
    );
    assert.equal(result2.assets.find((a) => a.kind === "placement")?.kind, "placement");
    assert.equal(result2.status, "needs_review");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
