import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";
import { GeminiClient } from "../gemini.js";
import { createPipelineRouter } from "../routes.js";

test("capabilities reports billingIntegrated true and lists new operations", async () => {
  const service = new PipelineService({
    repository: new MemoryRepository(),
    assets: {},
    gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
  });
  const app = express();
  app.use(express.json());
  const authenticate = (req, res, next) => {
    if (!req.headers["x-test-user"])
      return res.status(401).json({ error: "login required" });
    req.user = { _id: req.headers["x-test-user"] };
    next();
  };
  app.use("/api", createPipelineRouter({ service, authenticate }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    // Requires authentication
    const unauthed = await fetch(`${base}/capabilities`);
    assert.equal(unauthed.status, 401);

    // With auth: returns billingIntegrated=true and operation costs
    const res = await fetch(`${base}/capabilities`, {
      headers: { "x-test-user": "owner" },
    });
    assert.equal(res.status, 200);
    const caps = await res.json();
    assert.equal(caps.billingIntegrated, true);
    assert.ok(caps.operations?.venue_isometric, "venue_isometric op listed");
    assert.equal(caps.operations.venue_isometric.creditCost, 3);
    assert.ok(caps.operations?.component_sheet, "component_sheet op listed");
    assert.equal(caps.operations.component_sheet.creditCost, 1);
    assert.ok(caps.operations?.placement, "placement op listed");
    assert.equal(caps.operations.placement.creditCost, 2);
    assert.ok(caps.operations?.showcase, "showcase op listed");
    assert.equal(caps.operations.showcase.creditCost, 2);
    assert.equal(caps.operations.region_edit.creditCost, 2);
    assert.equal(caps.operations.element_view.creditCost, 1);
    assert.deepEqual(caps.angleProviders, {
      gemini: true,
      fal: Boolean(process.env.FAL_KEY),
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /projects/:projectId/jobs returns latest 20 jobs with access control", async () => {
  const repo = new MemoryRepository();
  const service = new PipelineService({
    repository: repo,
    assets: {},
    gemini: new GeminiClient({ apiKey: "k", imageModel: "i", visionModel: "v" }),
  });
  const app = express();
  app.use(express.json());
  const authenticate = (req, res, next) => {
    if (!req.headers["x-test-user"])
      return res.status(401).json({ error: "login required" });
    req.user = { _id: req.headers["x-test-user"], role: "planner" };
    next();
  };
  app.use("/api", createPipelineRouter({ service, authenticate }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    // Create a project
    const createRes = await fetch(`${base}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": "owner" },
      body: JSON.stringify({ brief: { description: "Test" } }),
    });
    assert.equal(createRes.status, 201);
    const { project } = await createRes.json();

    // Jobs list for empty project
    const listRes = await fetch(`${base}/projects/${project._id}/jobs`, {
      headers: { "x-test-user": "owner" },
    });
    assert.equal(listRes.status, 200);
    const { jobs } = await listRes.json();
    assert.ok(Array.isArray(jobs));
    assert.equal(jobs.length, 0);

    // Stranger cannot list jobs
    const strangerRes = await fetch(`${base}/projects/${project._id}/jobs`, {
      headers: { "x-test-user": "stranger" },
    });
    assert.equal(strangerRes.status, 404);

    // Verify jobs list does not leak sensitive fields
    // Insert a fake job into repo
    const fakeJob = {
      id: "job-list-test",
      _id: "job-list-test",
      projectId: project._id,
      actorId: "owner",
      requestKey: "rk1",
      requestHash: "hash123",
      operation: "screen_assets",
      options: {},
      snapshot: { _id: project._id, secret: "DO_NOT_EXPOSE" },
      status: "queued",
      billing: { userId: "owner", amount: 0, reference: "ref" },
    };
    repo.jobs.set(fakeJob.id, structuredClone(fakeJob));

    const listRes2 = await fetch(`${base}/projects/${project._id}/jobs`, {
      headers: { "x-test-user": "owner" },
    });
    assert.equal(listRes2.status, 200);
    const { jobs: jobs2 } = await listRes2.json();
    assert.equal(jobs2.length, 1);
    // snapshot and billing must not be exposed
    assert.ok(!("snapshot" in jobs2[0]), "snapshot must not be in response");
    assert.ok(!("billing" in jobs2[0]), "billing must not be in response");
    assert.ok(!("requestHash" in jobs2[0]), "requestHash must not be in response");
    assert.equal(jobs2[0].operation, "screen_assets");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("HTTP boundary requires login, enforces project access and rejects stale writes", async () => {
  const service = new PipelineService({
      repository: new MemoryRepository(),
      assets: {},
      gemini: {},
    }),
    app = express();
  app.use(express.json());
  const authenticate = (req, res, next) => {
    if (!req.headers["x-test-user"])
      return res.status(401).json({ error: "login required" });
    req.user = { _id: req.headers["x-test-user"], role: "planner" };
    next();
  };
  app.use(
    "/api/wedding-pipeline",
    createPipelineRouter({ service, authenticate }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/wedding-pipeline`;
  try {
    assert.equal(
      (
        await fetch(`${base}/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      401,
    );
    const created = await fetch(`${base}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": "owner" },
      body: JSON.stringify({ brief: { description: "Garden" } }),
    });
    assert.equal(created.status, 201);
    const { project } = await created.json();
    const inspect = (user, revision) =>
      fetch(`${base}/projects/${project._id}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { "x-test-user": user } : {}),
        },
        body: JSON.stringify({ revision, operation: "showcase" }),
      });
    assert.equal((await inspect(null, 0)).status, 401);
    assert.equal((await inspect("intruder", 0)).status, 404);
    const inspected = await inspect("owner", 0);
    assert.equal(inspected.status, 200);
    const inspection = await inspected.json();
    assert.equal(inspection.preview.sourceRevision, 0);
    assert.match(inspection.preview.prompt, /Garden/);
    assert.equal((await inspect("owner", 1)).status, 409);
    assert.equal(
      (
        await fetch(`${base}/projects/${project._id}`, {
          headers: { "x-test-user": "intruder" },
        })
      ).status,
      404,
    );
    const patch = {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-test-user": "owner" },
      body: JSON.stringify({
        revision: 0,
        changes: { brief: { description: "New scene" } },
      }),
    };
    assert.equal(
      (await fetch(`${base}/projects/${project._id}`, patch)).status,
      200,
    );
    assert.equal(
      (await fetch(`${base}/projects/${project._id}`, patch)).status,
      409,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
