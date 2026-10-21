import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoRepository } from "../repository.js";
import { PipelineJob, PipelineProject } from "../models.js";
import { processNextJob } from "../worker.js";
import { PipelineService } from "../service.js";
import { AssetStore } from "../media.js";
import { GeminiClient } from "../gemini.js";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
let mongo, repo;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([PipelineJob.init(), PipelineProject.init()]);
  repo = new MongoRepository();
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
test("Mongo claims a queued job only once under concurrent workers", async () => {
  await repo.createJob({
    id: "claim-job",
    projectId: "p",
    requestKey: "key1",
    requestHash: "hash",
    operation: "showcase",
    snapshot: {},
    options: {},
    status: "queued",
  });
  const claims = await Promise.all([
    repo.claim("worker-a"),
    repo.claim("worker-b"),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
});
test("unique request key is enforced by Mongo rather than a preflight read", async () => {
  const a = {
    id: "id-1",
    projectId: "p2",
    requestKey: "same-key",
    requestHash: "hash",
    operation: "showcase",
    snapshot: {},
    options: {},
    status: "queued",
  };
  await repo.createJob(a);
  await assert.rejects(
    repo.createJob({ ...a, id: "id-2" }),
    (e) => e.code === 11000,
  );
});
test("expired uncertain provider work becomes review, never queued", async () => {
  await repo.createProject({
    _id: "recover-project",
    ownerId: "owner",
    collaborators: [],
    revision: 0,
    brief: {},
    components: [],
    assets: [],
    activeJobs: ["expired-job"],
  });
  await repo.createJob({
    id: "expired-job",
    projectId: "recover-project",
    requestKey: "k",
    requestHash: "h",
    operation: "showcase",
    snapshot: {},
    options: {},
    status: "running",
    leaseOwner: "dead",
    leaseUntil: new Date(0),
  });
  await repo.reconcile();
  assert.equal((await repo.getJob("expired-job")).status, "needs_review");
  assert.deepEqual((await repo.getProject("recover-project")).activeJobs, []);
});

test("durable lifecycle generates a sheet and drawn showcase then exports a Flow handoff", async () => {
  // The first queued job in the claim test remains running; this lifecycle uses a fresh queue.
  await PipelineJob.deleteMany({ projectId: { $in: ["p", "p2"] } });
  const dir = await mkdtemp(path.join(tmpdir(), "wedding-e2e-"));
  try {
    const assets = new AssetStore(dir),
      pixels = await sharp({
        create: { width: 600, height: 600, channels: 3, background: "#d6b283" },
      })
        .jpeg()
        .toBuffer();
    let generationCalls = 0;
    const gemini = new GeminiClient({
      apiKey: "test",
      imageModel: "image",
      visionModel: "vision",
      fetchImpl: async (_, init) => {
        const payload = JSON.parse(init.body),
          isImage =
            payload.generationConfig.responseModalities?.includes("IMAGE");
        if (isImage) generationCalls++;
        const parts = isImage
          ? [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: pixels.toString("base64"),
                },
              },
            ]
          : [
              {
                text: JSON.stringify({
                  decision: "pass",
                  reason: "Consistent controlled fixture",
                  issues: [],
                }),
              },
            ];
        return new Response(
          JSON.stringify({
            candidates: [{ finishReason: "STOP", content: { parts } }],
          }),
        );
      },
    });
    const service = new PipelineService({ repository: repo, assets, gemini }),
      owner = { _id: "lifecycle-owner" };
    let p = await service.create(owner, {
      description: "Jasmine garden wedding",
    });
    p = await service.update(p._id, owner, p.revision, {
      components: [
        { id: "stage", category: "stage", description: "Timber jasmine stage" },
      ],
    });
    const sheetJob = await service.enqueue(p._id, owner, {
      revision: p.revision,
      requestKey: "sheet",
      operation: "component_sheet",
      options: { componentId: "stage" },
    });
    await processNextJob(
      { repository: repo, assets, gemini },
      "lifecycle-worker",
    );
    const sheet = (await repo.getJob(sheetJob.id)).result.assets[0];
    p = await service.get(p._id, owner);
    p = await service.approve(
      p._id,
      owner,
      p.revision,
      sheet.id,
      "Approved matching front/side/top views",
    );
    // Use an approved venue fixture to exercise the real canvas image path.
    const file = await assets.write(pixels, "image/jpeg");
    p.assets.push({
      ...file,
      kind: "venue",
      status: "approved",
      view: "front",
    });
    p = await repo.casProject(p._id, p.revision, p);
    p = await service.update(p._id, owner, p.revision, {
      canvas: {
        baseAssetId: file.id,
        regions: [
          {
            id: "stage-position",
            action: "place",
            componentId: "stage",
            points: [
              [0.2, 0.2],
              [0.7, 0.2],
              [0.7, 0.7],
            ],
          },
        ],
        strokes: [],
      },
    });
    const showJob = await service.enqueue(p._id, owner, {
      revision: p.revision,
      requestKey: "showcase",
      operation: "showcase",
      options: {},
    });
    await processNextJob(
      { repository: repo, assets, gemini },
      "lifecycle-worker",
    );
    const rendered = await repo.getJob(showJob.id);
    assert.equal(rendered.status, "needs_review");
    const showcase = rendered.result.assets.find((a) => a.kind === "showcase");
    p = await service.get(p._id, owner);
    p = await service.approve(
      p._id,
      owner,
      p.revision,
      showcase.id,
      "Approved composition and placement",
    );
    const flowJob = await service.enqueue(p._id, owner, {
      revision: p.revision,
      requestKey: "flow",
      operation: "flow_handoff",
      options: { showcaseAssetId: showcase.id },
    });
    await processNextJob(
      { repository: repo, assets, gemini },
      "lifecycle-worker",
    );
    const flow = await repo.getJob(flowJob.id);
    assert.equal(flow.status, "awaiting_flow");
    assert.equal(generationCalls, 2);
    const saved = JSON.parse(
      (await assets.read(flow.result.assets[0].id)).toString(),
    );
    assert.equal(saved.startFrameAssetId, showcase.id);
    assert.deepEqual((await service.get(p._id, owner)).activeJobs, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
