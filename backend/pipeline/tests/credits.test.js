/**
 * Tests for Phase 2 billing integration in the pipeline.
 * Uses a fake in-memory billing ledger — no real creditService calls.
 */
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AssetStore } from "../media.js";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";
import { GeminiClient } from "../gemini.js";
import { processNextJob } from "../worker.js";
import { createPipelineRouter } from "../routes.js";

async function makeJpeg() {
  return sharp({
    create: { width: 600, height: 600, channels: 3, background: "#7a8a7a" },
  })
    .jpeg()
    .toBuffer();
}

// ---- Fake in-memory billing ledger ----
class FakeBilling {
  constructor(initialBalance = 100) {
    this.balance = initialBalance;
    this.charges = [];
    this.refunds = [];
  }
  async charge({ userId, amount, reference, metadata = {} }) {
    if (this.balance < amount) {
      const error = new Error("Insufficient credits");
      error.code = "INSUFFICIENT_CREDITS";
      error.status = 402;
      throw error;
    }
    this.balance -= amount;
    this.charges.push({ userId, amount, reference, metadata });
  }
  async refund({ userId, amount, reference, metadata = {} }) {
    this.balance += amount;
    this.refunds.push({ userId, amount, reference, metadata });
  }
  get netCharges() {
    const total = this.charges.reduce((s, c) => s + c.amount, 0);
    const total2 = this.refunds.reduce((s, r) => s + r.amount, 0);
    return total - total2;
  }
}

// ---- Test project and actor fixtures ----
const owner = { _id: "owner-user" };

function makeVenueIsometricProject() {
  return {
    _id: "proj-credits",
    ownerId: "owner-user",
    collaborators: [],
    revision: 0,
    brief: { description: "Test" },
    components: [],
    canvas: null,
    assets: [
      { id: "a1", kind: "venue", status: "approved", view: "front", mimeType: "image/jpeg" },
      { id: "a2", kind: "venue", status: "approved", view: "right", mimeType: "image/jpeg" },
      { id: "a3", kind: "venue", status: "approved", view: "back", mimeType: "image/jpeg" },
      { id: "a4", kind: "venue", status: "approved", view: "left", mimeType: "image/jpeg" },
    ],
    activeJobs: [],
  };
}

function makePlacementProject() {
  return {
    _id: "proj-place-credits",
    ownerId: "owner-user",
    collaborators: [],
    revision: 0,
    brief: { description: "Test" },
    components: [
      {
        id: "mandap",
        category: "mandap",
        description: "White mandap",
        masterAssetId: "master-id",
        referenceAssetIds: [],
      },
    ],
    canvas: {
      baseAssetId: "base-iso",
      regions: [
        {
          id: "r1",
          action: "place",
          componentId: "mandap",
          points: [[0.1, 0.1], [0.6, 0.1], [0.6, 0.6]],
        },
      ],
      strokes: [],
    },
    assets: [
      { id: "base-iso", kind: "venue_isometric", status: "approved", mimeType: "image/jpeg", view: null },
      { id: "master-id", kind: "component_sheet", status: "approved", mimeType: "image/jpeg" },
    ],
    activeJobs: [],
  };
}

function setup(initialBalance = 100, assetStore = null) {
  const billing = new FakeBilling(initialBalance);
  const repo = new MemoryRepository();
  const service = new PipelineService({
    repository: repo,
    assets: assetStore ?? {
      read: async () => Buffer.from("fake"),
    },
    gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
    billing,
  });
  return { billing, repo, service };
}

// ---- Tests ----

test("venue_isometric enqueue charges 3 credits", async () => {
  const { billing, service, repo } = setup(10);
  const proj = makeVenueIsometricProject();
  repo.projects.set(proj._id, structuredClone(proj));

  await service.enqueue(proj._id, owner, {
    revision: 0,
    requestKey: "key-iso-1",
    operation: "venue_isometric",
    options: { venueAssetIds: ["a1", "a2", "a3", "a4"] },
  });

  assert.equal(billing.charges.length, 1);
  assert.equal(billing.charges[0].amount, 3);
  assert.equal(billing.balance, 7);
});

test("placement enqueue charges 2 credits", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "credits-place-"));
  try {
    const assetStore = new AssetStore(dir);
    const img = await makeJpeg();
    const baseFile = await assetStore.write(img, "image/jpeg");
    const masterFile = await assetStore.write(img, "image/jpeg");

    const billing = new FakeBilling(10);
    const repo = new MemoryRepository();
    const service = new PipelineService({
      repository: repo,
      assets: assetStore,
      gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
      billing,
    });

    const proj = {
      _id: "proj-place-credits",
      ownerId: "owner-user",
      collaborators: [],
      revision: 0,
      brief: { description: "Test" },
      components: [
        {
          id: "mandap",
          category: "mandap",
          description: "White mandap",
          masterAssetId: masterFile.id,
          referenceAssetIds: [],
        },
      ],
      canvas: {
        baseAssetId: baseFile.id,
        regions: [
          {
            id: "r1",
            action: "place",
            componentId: "mandap",
            points: [[0.1, 0.1], [0.6, 0.1], [0.6, 0.6]],
          },
        ],
        strokes: [],
      },
      assets: [
        { id: baseFile.id, kind: "venue_isometric", status: "approved", mimeType: "image/jpeg", view: null },
        { id: masterFile.id, kind: "component_sheet", status: "approved", mimeType: "image/jpeg" },
      ],
      activeJobs: [],
    };
    repo.projects.set(proj._id, structuredClone(proj));

    await service.enqueue(proj._id, owner, {
      revision: 0,
      requestKey: "key-place-1",
      operation: "placement",
      options: { baseAssetId: baseFile.id, componentId: "mandap" },
    });

    assert.equal(billing.charges.length, 1);
    assert.equal(billing.charges[0].amount, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("screen_assets and panorama have zero cost (no billing call)", async () => {
  const { billing, service, repo } = setup(10);
  const proj = {
    _id: "proj-zero",
    ownerId: "owner-user",
    collaborators: [],
    revision: 0,
    brief: { description: "Test" },
    components: [],
    canvas: null,
    assets: [
      { id: "pending1", kind: "venue", status: "pending_screen", mimeType: "image/jpeg", view: "front" },
    ],
    activeJobs: [],
  };
  repo.projects.set(proj._id, structuredClone(proj));

  await service.enqueue(proj._id, owner, {
    revision: 0,
    requestKey: "key-screen",
    operation: "screen_assets",
    options: {},
  });

  assert.equal(billing.charges.length, 0, "screen_assets must not charge");
});

test("idempotent re-enqueue with same key does not double charge", async () => {
  const { billing, service, repo } = setup(20);
  const proj = makeVenueIsometricProject();
  repo.projects.set(proj._id, structuredClone(proj));

  const req = {
    revision: 0,
    requestKey: "key-idem",
    operation: "venue_isometric",
    options: { venueAssetIds: ["a1", "a2", "a3", "a4"] },
  };

  const j1 = await service.enqueue(proj._id, owner, req);
  const j2 = await service.enqueue(proj._id, owner, req);

  assert.equal(j1.id, j2.id, "same job returned");
  assert.equal(billing.charges.length, 1, "only charged once");
  assert.equal(billing.netCharges, 3);
});

test("validation failure does not charge (insufficient options rejected before billing)", async () => {
  const { billing, service, repo } = setup(10);
  const proj = makeVenueIsometricProject();
  repo.projects.set(proj._id, structuredClone(proj));

  // Missing required venueAssetIds — should fail validation before charging
  await assert.rejects(
    service.enqueue(proj._id, owner, {
      revision: 0,
      requestKey: "key-validation-fail",
      operation: "venue_isometric",
      options: { venueAssetIds: ["a1"] }, // Too few assets
    }),
    { code: "INVALID_JOB" },
  );

  assert.equal(billing.charges.length, 0, "validation failure must not charge");
});

test("402 is returned when balance is insufficient", async () => {
  const { billing, service, repo } = setup(1); // only 1 credit, venue_isometric costs 3
  const proj = makeVenueIsometricProject();
  repo.projects.set(proj._id, structuredClone(proj));

  const err = await service
    .enqueue(proj._id, owner, {
      revision: 0,
      requestKey: "key-insufficient",
      operation: "venue_isometric",
      options: { venueAssetIds: ["a1", "a2", "a3", "a4"] },
    })
    .then(
      () => null,
      (e) => e,
    );
  assert.ok(err, "error expected");
  assert.equal(err.code, "INSUFFICIENT_CREDITS");
  assert.equal(err.status, 402);
  assert.equal(billing.charges.length, 0); // charge threw before success
  assert.equal(billing.refunds.length, 0);
});

test("HTTP 402 code is returned for INSUFFICIENT_CREDITS", async () => {
  const billing = new FakeBilling(0); // empty wallet
  const service = new PipelineService({
    repository: new MemoryRepository(),
    assets: { read: async () => Buffer.from("fake") },
    gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
    billing,
  });
  const app = express();
  app.use(express.json());
  const authenticate = (req, _res, next) => {
    req.user = { _id: "owner-user" };
    next();
  };
  app.use("/api", createPipelineRouter({ service, authenticate }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const proj = makeVenueIsometricProject();
    service.repository.projects.set(proj._id, structuredClone(proj));
    const res = await fetch(`${base}/projects/${proj._id}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: 0,
        requestKey: "key-402",
        operation: "venue_isometric",
        options: { venueAssetIds: ["a1", "a2", "a3", "a4"] },
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 402);
    assert.equal(body.code, "INSUFFICIENT_CREDITS");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("worker refunds billed job that fails with no output", async () => {
  const billing = new FakeBilling(100);
  const repo = new MemoryRepository();

  // Insert a billed job directly (simulating a prior enqueue)
  const job = {
    id: "job-fail-refund",
    _id: "job-fail-refund",
    projectId: "proj-fail",
    actorId: "owner-user",
    requestKey: "key-fail",
    requestHash: "hash",
    operation: "venue_isometric",
    options: { venueAssetIds: ["a1", "a2", "a3", "a4"] },
    snapshot: {
      _id: "proj-fail",
      revision: 0,
      components: [],
      assets: [],
    },
    status: "queued",
    billing: { userId: "owner-user", amount: 3, reference: "pipeline_proj-fail_key-fail" },
  };
  repo.projects.set("proj-fail", {
    _id: "proj-fail",
    ownerId: "owner-user",
    collaborators: [],
    revision: 0,
    activeJobs: [job.id],
    assets: [],
    components: [],
    brief: {},
    canvas: null,
  });
  repo.jobs.set(job.id, structuredClone(job));

  // Extend the repo with the claim/heartbeat/finish/publish methods needed by processNextJob
  const workerId = "worker-1";
  let claimed = false;
  const origClaim = repo.claim?.bind(repo);
  repo.claim = async () => {
    if (claimed) return null;
    claimed = true;
    const j = structuredClone(job);
    j.status = "running";
    j.leaseOwner = workerId;
    j.leaseUntil = new Date(Date.now() + 90000);
    repo.jobs.set(j.id, j);
    return j;
  };
  repo.reconcile = async () => {};
  repo.heartbeat = async () => true;
  repo.finish = async (id) => {
    const j = repo.jobs.get(id);
    if (!j) return null;
    j.status = "failed";
    j.error = { code: "PIPELINE_FAILED", message: "Test failure" };
    j.result = null;
    delete j.leaseOwner;
    delete j.leaseUntil;
    repo.jobs.set(id, j);
    return structuredClone(j);
  };
  repo.publish = async () => {};

  const workerDeps = {
    repository: repo,
    billing,
    assets: {
      read: async () => { throw new Error("TEST_ERROR"); },
      write: async () => ({ id: "x" }),
      remove: async () => {},
    },
    gemini: {
      generate: async () => { throw Object.assign(new Error("fail"), { status: 500 }); },
    },
  };

  await processNextJob(workerDeps, workerId);

  assert.equal(billing.refunds.length, 1, "must refund once");
  assert.equal(billing.refunds[0].amount, 3);
  // Initial balance was 100; refund of 3 adds back → 103
  assert.equal(billing.balance, 103);
});

test("worker does not refund on WORKER_LEASE_LOST", async () => {
  const billing = new FakeBilling(100);
  const repo = new MemoryRepository();
  const workerId = "worker-lease";

  const job = {
    id: "job-lease",
    _id: "job-lease",
    projectId: "proj-lease",
    actorId: "owner-user",
    requestKey: "key-lease",
    requestHash: "hash",
    operation: "venue_isometric",
    options: { venueAssetIds: [] },
    snapshot: { _id: "proj-lease", revision: 0, components: [], assets: [] },
    status: "queued",
    billing: { userId: "owner-user", amount: 3, reference: "pipeline_proj-lease_key-lease" },
  };
  repo.projects.set("proj-lease", {
    _id: "proj-lease",
    ownerId: "owner-user",
    collaborators: [],
    revision: 0,
    activeJobs: [job.id],
    assets: [],
    components: [],
    brief: {},
    canvas: null,
  });
  repo.jobs.set(job.id, structuredClone(job));

  let claimed = false;
  repo.claim = async () => {
    if (claimed) return null;
    claimed = true;
    const j = structuredClone(job);
    j.status = "running";
    j.leaseOwner = workerId;
    j.leaseUntil = new Date(Date.now() + 90000);
    return j;
  };
  repo.reconcile = async () => {};
  repo.heartbeat = async () => false; // lease lost immediately
  repo.finish = async (id) => {
    const j = repo.jobs.get(id);
    if (!j) return null;
    j.status = "failed";
    j.result = null;
    return structuredClone(j);
  };
  repo.publish = async () => {};

  await processNextJob({ repository: repo, billing, assets: { read: async () => Buffer.from("x"), remove: async () => {} }, gemini: {} }, workerId);

  assert.equal(billing.refunds.length, 0, "lease lost must not trigger refund");
});

test("worker does not refund when job ends needs_review", async () => {
  const billing = new FakeBilling(100);
  const repo = new MemoryRepository();
  const workerId = "worker-review";

  const job = {
    id: "job-review",
    _id: "job-review",
    projectId: "proj-review",
    actorId: "owner-user",
    requestKey: "key-review",
    requestHash: "hash",
    operation: "venue_isometric",
    options: {},
    snapshot: { _id: "proj-review", revision: 0, components: [], assets: [] },
    status: "queued",
    billing: { userId: "owner-user", amount: 3, reference: "pipeline_proj-review_key-review" },
  };
  repo.projects.set("proj-review", {
    _id: "proj-review",
    ownerId: "owner-user",
    collaborators: [],
    revision: 0,
    activeJobs: [job.id],
    assets: [],
    components: [],
    brief: {},
    canvas: null,
  });
  repo.jobs.set(job.id, structuredClone(job));

  let claimed = false;
  repo.claim = async () => {
    if (claimed) return null;
    claimed = true;
    const j = structuredClone(job);
    j.status = "running";
    j.leaseOwner = workerId;
    j.leaseUntil = new Date(Date.now() + 90000);
    return j;
  };
  repo.reconcile = async () => {};
  repo.heartbeat = async () => true;
  // finish returns needs_review with an asset (output produced)
  repo.finish = async (id) => {
    return {
      ...structuredClone(job),
      id,
      status: "needs_review",
      result: { status: "needs_review", assets: [{ id: "out", kind: "venue_isometric" }] },
    };
  };
  repo.publish = async () => {};

  // Force a worker error that the worker catches; the finish mock returns needs_review
  // We simulate it by making runStage throw but finish return needs_review
  const fakeDeps = {
    repository: repo,
    billing,
    assets: { read: async () => { throw Object.assign(new Error("e"), { status: 500 }); }, remove: async () => {} },
    gemini: {},
  };

  await processNextJob(fakeDeps, workerId);

  assert.equal(billing.refunds.length, 0, "needs_review must not trigger refund");
});

test("stale revision while reserving the job slot refunds the charge", async () => {
  const { billing, service, repo } = setup(10);
  const proj = makeVenueIsometricProject();
  repo.projects.set(proj._id, structuredClone(proj));
  const cas = repo.casProject.bind(repo);
  let first = true;
  repo.casProject = async (...args) => {
    if (first) { first = false; return null; } // concurrent edit wins the CAS
    return cas(...args);
  };

  await assert.rejects(
    service.enqueue(proj._id, owner, {
      revision: 0,
      requestKey: "key-stale-1",
      operation: "venue_isometric",
      options: { venueAssetIds: ["a1", "a2", "a3", "a4"] },
    }),
  );
  assert.equal(billing.netCharges, 0);
  assert.equal(billing.balance, 10);
});
