import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { AssetStore } from "../media.js";
import { buildFlowHandoff } from "../flow.js";
import { designHash } from "../fingerprints.js";
import { buildFlowPackage } from "../flow-delivery.js";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";
import { createVideo } from "./video-fixture.js";
import express from "express";
import { createPipelineRouter } from "../routes.js";

const owner = { _id: "owner" },
  vendor = { _id: "vendor" };
const checks = {
  venuePreserved: true,
  componentIdentity: true,
  placementAndClearance: true,
  motionContinuity: true,
};

export async function fixture(root) {
  const assets = new AssetStore(root);
  const image = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "#ccd399" },
  })
    .jpeg()
    .toBuffer();
  const master = await assets.write(image, "image/jpeg"),
    showcase = await assets.write(image, "image/jpeg");
  const project = {
    _id: "project",
    ownerId: "owner",
    collaborators: ["vendor"],
    revision: 4,
    brief: { description: "Ivory wedding" },
    components: [
      {
        id: "stage",
        category: "stage",
        description: "Timber stage",
        masterAssetId: master.id,
      },
    ],
    canvas: null,
    activeJobs: [],
    assets: [
      { ...master, kind: "component_sheet", status: "approved" },
      { ...showcase, kind: "showcase", status: "approved" },
    ],
  };
  project.assets[1].sourceDesignHash = designHash(project);
  const handoff = buildFlowHandoff(project, { showcaseAssetId: showcase.id });
  const file = await assets.write(
    Buffer.from(JSON.stringify(handoff)),
    "application/json",
  );
  project.assets.push({
    ...file,
    kind: "flow_handoff",
    status: "approved",
    sourceDesignHash: handoff.sourceDesignHash,
  });
  return {
    project,
    assets,
    handoffId: file.id,
    image,
    showcaseId: showcase.id,
    masterId: master.id,
  };
}

test("Flow ZIP includes actual approved references, prompt and independent verified checksums without persisting files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-flow-package-"));
  try {
    const f = await fixture(root),
      before = await readdir(root),
      snapshot = structuredClone(f.project);
    const result = await buildFlowPackage(f.project, f.handoffId, f.assets);
    assert.deepEqual(await readdir(root), before);
    assert.deepEqual(f.project, snapshot);
    const zipPath = path.join(root, "result.zip");
    await writeFile(zipPath, result.buffer);
    const inspected = JSON.parse(
      execFileSync(
        "python",
        [
          "-c",
          'import sys,zipfile,json,hashlib; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; m=json.loads(z.read("manifest.json")); [(_ for _ in ()).throw(AssertionError("checksum")) for r in m["references"] if hashlib.sha256(z.read(r["file"])).hexdigest()!=r["sha256"]]; print(json.dumps({"names":z.namelist(),"manifest":m,"prompt":z.read("prompt.txt").decode()}))',
          zipPath,
        ],
        { encoding: "utf8" },
      ),
    );
    assert.equal(inspected.manifest.references.length, 2);
    assert.ok(inspected.names.includes(`references/${f.showcaseId}.jpg`));
    assert.ok(inspected.names.includes(`references/${f.masterId}.jpg`));
    assert.match(inspected.prompt, /isometric-style drone/);
    assert.equal(inspected.manifest.automatedSubmission, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Flow package rejects a stale design or unapproved component rather than dropping it", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-flow-stale-"));
  try {
    const f = await fixture(root);
    f.project.assets[0].status = "candidate";
    await assert.rejects(buildFlowPackage(f.project, f.handoffId, f.assets), {
      code: "ASSET_NOT_APPROVED",
    });
    f.project.assets[0].status = "approved";
    f.project.brief.description = "Different venue";
    await assert.rejects(buildFlowPackage(f.project, f.handoffId, f.assets), {
      code: "STALE_FLOW_HANDOFF",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Flow video import remains review-only until owner completes the continuity checklist", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-flow-review-"));
  try {
    const f = await fixture(root),
      repository = new MemoryRepository();
    await repository.createProject(f.project);
    const service = new PipelineService({
        repository,
        assets: f.assets,
        gemini: {},
      }),
      input = await createVideo(root);
    const imported = await service.importFlowVideo(
      "project",
      vendor,
      4,
      f.handoffId,
      input,
      "generated_with_google_flow",
    );
    const video = imported.video;
    assert.equal(video.status, "review");
    assert.equal(video.attestation.verified, false);
    assert.equal(video.attestation.claimedProvider, "google_flow");
    assert.equal(imported.project.revision, 5);
    await assert.rejects(
      service.approve(
        "project",
        owner,
        5,
        video.id,
        "Approve this generated video",
      ),
      { code: "FLOW_REVIEW_REQUIRED" },
    );
    await assert.rejects(
      service.reviewFlowVideo("project", vendor, video.id, {
        revision: 5,
        decision: "approve",
        reason: "Reviewed every frame carefully",
        checks,
      }),
      { code: "OWNER_REQUIRED" },
    );
    await assert.rejects(
      service.reviewFlowVideo("project", owner, video.id, {
        revision: 5,
        decision: "approve",
        reason: "Reviewed every frame carefully",
        checks: { ...checks, motionContinuity: false },
      }),
      { code: "FLOW_CHECKS_REQUIRED" },
    );
    await assert.rejects(
      service.importFlowVideo(
        "project",
        owner,
        5,
        f.handoffId,
        input,
        "generated_with_google_flow",
      ),
      { code: "DUPLICATE_VIDEO" },
    );
    const approved = await service.reviewFlowVideo("project", owner, video.id, {
      revision: 5,
      decision: "approve",
      reason: "Venue and component continuity reviewed",
      checks,
    });
    assert.equal(
      approved.assets.find((a) => a.id === video.id).status,
      "approved",
    );
    assert.equal(
      approved.assets.find((a) => a.id === video.contactSheetAssetId).status,
      "approved",
    );
    assert.equal(
      approved.assets.find((a) => a.id === video.id).review.actorId,
      "owner",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stale video cannot be approved and failed CAS import removes both owned output files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-flow-conflict-"));
  try {
    const f = await fixture(root),
      repository = new MemoryRepository();
    await repository.createProject(f.project);
    const service = new PipelineService({
        repository,
        assets: f.assets,
        gemini: {},
      }),
      input = await createVideo(root);
    const imported = await service.importFlowVideo(
      "project",
      owner,
      4,
      f.handoffId,
      input,
      "generated_with_google_flow",
    );
    await service.update("project", owner, 5, {
      brief: { description: "Different venue design" },
    });
    await assert.rejects(
      service.reviewFlowVideo("project", owner, imported.video.id, {
        revision: 6,
        decision: "approve",
        reason: "Reviewed the older video output",
        checks,
      }),
      { code: "STALE_FLOW_HANDOFF" },
    );
    // Restore a fresh project to reproduce a concurrent update at publication time.
    repository.projects.set("project", structuredClone(f.project));
    const before = await readdir(root);
    repository.casProject = async () => null;
    await assert.rejects(
      service.importFlowVideo(
        "project",
        owner,
        4,
        f.handoffId,
        input,
        "generated_with_google_flow",
      ),
      { code: "REVISION_CONFLICT" },
    );
    assert.deepEqual(await readdir(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HTTP Flow delivery protects ZIP/import/review and returns private media downloads", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-flow-http-"));
  let server;
  try {
    const f = await fixture(root),
      repository = new MemoryRepository();
    await repository.createProject(f.project);
    const service = new PipelineService({
        repository,
        assets: f.assets,
        gemini: {},
      }),
      app = express();
    app.use(express.json());
    app.use(
      "/api/wedding-pipeline",
      createPipelineRouter({
        service,
        authenticate: (req, res, next) => {
          if (!req.headers["x-test-user"])
            return res.status(401).json({ error: "login" });
          req.user = { _id: req.headers["x-test-user"] };
          next();
        },
      }),
    );
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/wedding-pipeline/projects/project`;
    const packageRequest = (user) =>
      fetch(`${base}/flow/${f.handoffId}/package`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { "x-test-user": user } : {}),
        },
        body: JSON.stringify({ revision: 4 }),
      });
    assert.equal((await packageRequest(null)).status, 401);
    assert.equal((await packageRequest("intruder")).status, 404);
    const response = await packageRequest("owner");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/zip/);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
    assert.equal(
      Buffer.from(await response.arrayBuffer()).readUInt32LE(),
      0x04034b50,
    );
    const video = await createVideo(root),
      form = new FormData();
    form.append("revision", "4");
    form.append("attestation", "generated_with_google_flow");
    form.append(
      "video",
      new Blob([video], { type: "application/octet-stream" }),
      "untrusted-name.mp4",
    );
    const imported = await fetch(`${base}/flow/${f.handoffId}/videos`, {
      method: "POST",
      headers: { "x-test-user": "vendor" },
      body: form,
    });
    assert.equal(imported.status, 201);
    const body = await imported.json();
    const media = await fetch(`${base}/assets/${body.video.id}`, {
      headers: { "x-test-user": "owner" },
    });
    assert.equal(media.status, 200);
    assert.match(media.headers.get("content-type"), /video\/mp4/);
    assert.match(media.headers.get("content-disposition"), /attachment.*\.mp4/);
    const review = await fetch(`${base}/flow/videos/${body.video.id}/review`, {
      method: "POST",
      headers: { "x-test-user": "owner", "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: 5,
        decision: "reject",
        reason: "Venue continuity needs another Flow pass",
        checks: { ...checks, motionContinuity: false },
      }),
    });
    assert.equal(review.status, 200);
    assert.equal(
      (await review.json()).project.assets.find((a) => a.id === body.video.id)
        .status,
      "rejected",
    );
    const oversized = new FormData();
    oversized.append(
      "video",
      new Blob([Buffer.alloc(24 * 1024 * 1024 + 1)]),
      "too-large.mp4",
    );
    assert.equal(
      (
        await fetch(`${base}/flow/${f.handoffId}/videos`, {
          method: "POST",
          headers: { "x-test-user": "owner" },
          body: oversized,
        })
      ).status,
      413,
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
