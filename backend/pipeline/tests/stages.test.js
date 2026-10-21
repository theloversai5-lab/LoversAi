import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AssetStore } from "../media.js";
import { runStage } from "../stages.js";

test("satellite context is not stitched as a ground-level panorama frame", async () => {
  const project = {
    _id: "p",
    revision: 0,
    assets: [
      ...["front", "right", "back", "left"].map((id) => ({
        id,
        kind: "venue",
        status: "approved",
        view: id,
      })),
      { id: "satellite", kind: "venue", status: "approved", view: "satellite" },
    ],
  };
  let count;
  let next = 0;
  const result = await runStage(
    { operation: "panorama", snapshot: project, options: {} },
    {
      assets: {
        read: async (id) => Buffer.from(id),
        write: async () => ({ id: `output-${next++}` }),
        remove: async () => {},
      },
      stitch: async ({ buffers }) => {
        count = buffers.length;
        return {
          buffer: Buffer.from("image"),
          width: 2400,
          height: 900,
          trueHdri: false,
          usedInputIndices: [0, 1, 2, 3],
        };
      },
    },
  );
  assert.equal(count, 4);
  assert.deepEqual(result.assets[0].referenceAssetIds, [
    "front",
    "right",
    "back",
    "left",
  ]);
});

test("screening rejection cannot enter the accepted input pool", async () => {
  const assets = { read: async () => Buffer.from("image") };
  const result = await runStage(
    {
      operation: "screen_assets",
      snapshot: {
        assets: [
          {
            id: "photo",
            kind: "venue",
            status: "pending_screen",
            mimeType: "image/jpeg",
          },
        ],
      },
      options: {},
    },
    {
      assets,
      gemini: {
        screen: async () => ({
          decision: "reject",
          category: "irrelevant",
          reason: "invoice",
        }),
      },
    },
  );
  assert.equal(result.assetUpdates[0].status, "rejected");
});

test("lease loss stops further paid screening requests", async () => {
  let calls = 0,
    checks = 0;
  const job = {
    operation: "screen_assets",
    snapshot: {
      assets: ["one", "two"].map((id) => ({
        id,
        kind: "venue",
        status: "pending_screen",
        mimeType: "image/jpeg",
      })),
    },
    options: {},
  };
  await assert.rejects(
    runStage(job, {
      assets: { read: async () => Buffer.from("image") },
      gemini: {
        screen: async () => {
          calls++;
          return { decision: "accept", category: "venue", reason: "venue" };
        },
      },
      assertOwnership: async () => {
        if (++checks > 1) {
          const e = new Error("Lease lost");
          e.code = "WORKER_LEASE_LOST";
          throw e;
        }
      },
    }),
    { code: "WORKER_LEASE_LOST" },
  );
  assert.equal(calls, 1);
});

test("screening has a five-image external call budget per job", async () => {
  let calls = 0;
  const job = {
    operation: "screen_assets",
    snapshot: {
      assets: Array.from({ length: 6 }, (_, i) => ({
        id: `a${i}`,
        kind: "venue",
        status: "pending_screen",
      })),
    },
    options: {},
  };
  const result = await runStage(job, {
    assets: { read: async () => Buffer.from("image") },
    gemini: {
      screen: async () => {
        calls++;
        return { decision: "accept", category: "venue", reason: "venue" };
      },
    },
  });
  assert.equal(calls, 5);
  assert.equal(result.pendingRemaining, 1);
});
test("showcase sends rasterized drawing plus master and all source views; QA review stays review", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wedding-stage-"));
  try {
    const assets = new AssetStore(dir),
      image = await sharp({
        create: { width: 600, height: 600, channels: 3, background: "white" },
      })
        .jpeg()
        .toBuffer();
    const base = await assets.write(image, "image/jpeg"),
      sheet = await assets.write(image, "image/jpeg");
    const snapshot = {
      _id: "p",
      revision: 4,
      brief: { description: "Garden wedding" },
      assets: [
        { ...base, kind: "venue", status: "approved", view: "front" },
        { ...sheet, kind: "component_sheet", status: "approved" },
      ],
      components: [
        {
          id: "stage",
          category: "stage",
          description: "timber",
          masterAssetId: sheet.id,
        },
      ],
      canvas: {
        baseAssetId: base.id,
        regions: [
          {
            id: "r",
            componentId: "stage",
            action: "place",
            points: [
              [0.1, 0.1],
              [0.8, 0.1],
              [0.8, 0.8],
            ],
          },
        ],
        strokes: [],
      },
    };
    let sent;
    const result = await runStage(
      { id: "job1", operation: "showcase", snapshot, options: {} },
      {
        assets,
        gemini: {
          generate: async (request) => {
            sent = request;
            return { buffer: image, model: "test", provider: "gemini" };
          },
          assess: async () => ({
            decision: "review",
            reason: "Placement needs confirmation",
            issues: ["unclear stage footprint"],
          }),
        },
      },
    );
    assert.equal(sent.references.length, 3);
    assert.ok(
      sent.references.some((r) => r.role.includes("spatial annotation")),
    );
    assert.equal(
      result.assets.find((a) => a.kind === "showcase").status,
      "review",
    );
    assert.equal(result.status, "needs_review");
    assert.equal(
      result.assets.find((a) => a.kind === "showcase").sourceRevision,
      4,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("successful billable image is retained for review when QA exceeds its payload budget", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wedding-qa-review-"));
  try {
    const assets = new AssetStore(dir);
    const pixels = await sharp({
      create: { width: 600, height: 600, channels: 3, background: "#cd9873" },
    })
      .jpeg()
      .toBuffer();
    const result = await runStage(
      {
        id: "qa-budget",
        operation: "component_sheet",
        options: { componentId: "stage" },
        snapshot: {
          revision: 1,
          brief: { description: "Wedding" },
          components: [
            { id: "stage", category: "stage", description: "Timber stage" },
          ],
          assets: [],
        },
      },
      {
        assets,
        gemini: {
          generate: async () => ({
            buffer: pixels,
            provider: "gemini",
            model: "image",
          }),
          assess: async () => {
            const error = new Error("Too much data");
            error.code = "REFERENCE_LIMIT";
            error.status = 400;
            throw error;
          },
        },
      },
    );
    assert.equal(result.status, "needs_review");
    assert.equal(result.assets[0].status, "review");
    assert.equal(result.assets[0].qa.errorCode, "REFERENCE_LIMIT");
    assert.ok(result.assets[0].qa.issues.includes("QA_INCOMPLETE"));
    assert.equal(
      (await sharp(await assets.read(result.assets[0].id)).metadata()).format,
      "jpeg",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
