import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import User from "../../models/User.js";
import mongoose from "mongoose";
import { PipelineProject } from "../models.js";
import { parseDevOptions, startDevServer } from "../dev-server.js";

test("owned local database keeps projects and fixture identity across restarts with real JWT authentication", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-persistent-test-"));
  let runtime;
  const options = {
    ...parseDevOptions(["--local-db", "--test-accounts", "--port=0"], {
      WEDDING_PIPELINE_ENABLED: "true",
    }),
    localRoot: root,
  };
  try {
    runtime = await startDevServer(options);
    const session = JSON.parse(
      await readFile(path.join(root, "session.json"), "utf8"),
    );
    const workspace = JSON.parse(
      await readFile(path.join(root, "workspace.json"), "utf8"),
    );
    const owner = await User.findById(session.owner.userId).select("+password");
    assert.equal(owner.role, "planner");
    assert.equal(owner.isAdmin, false);
    assert.equal(
      await owner.comparePassword(workspace.accounts.owner.password),
      true,
    );
    assert.equal(await User.countDocuments({ isAdmin: true }), 0);
    const base = `http://127.0.0.1:${runtime.server.address().port}`;
    const health = await (await fetch(`${base}/health`)).json();
    assert.equal(health.database.temporary, false);
    assert.equal(health.database.managedLocal, true);
    assert.equal(JSON.stringify(health).includes(session.owner.token), false);
    assert.equal(JSON.stringify(health).includes(workspace.jwtSecret), false);
    const created = await fetch(`${base}/api/wedding-pipeline/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.owner.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ brief: { description: "Persistent wedding" } }),
    });
    assert.equal(created.status, 201);
    const { project } = await created.json(),
      passwordHash = owner.password;
    await runtime.close();
    runtime = null;
    await access(path.join(root, "database"));
    runtime = await startDevServer(options);
    const next = JSON.parse(
      await readFile(path.join(root, "session.json"), "utf8"),
    );
    assert.equal(next.owner.userId, session.owner.userId);
    assert.equal(
      (await User.findById(next.owner.userId).select("+password")).password,
      passwordHash,
    );
    const persisted = await PipelineProject.findById(project._id).lean();
    assert.ok(persisted, "project must still exist in the reopened database");
    assert.equal(persisted.ownerId, next.owner.userId);
    const response = await fetch(
      `http://127.0.0.1:${runtime.server.address().port}/api/wedding-pipeline/projects/${project._id}`,
      { headers: { Authorization: `Bearer ${next.owner.token}` } },
    );
    assert.equal(response.status, 200);
    assert.equal(
      (await response.json()).project.brief.description,
      "Persistent wedding",
    );
    await User.updateOne(
      { _id: next.owner.userId },
      { $set: { isBlocked: true } },
    );
    await runtime.close();
    runtime = null;
    await assert.rejects(startDevServer(options), {
      code: "LOCAL_ACCOUNT_CONFLICT",
    });
  } finally {
    await runtime?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("test fixtures require explicit owned local mode and never production or external database settings", () => {
  const enabled = { WEDDING_PIPELINE_ENABLED: "true" };
  for (const [argv, env] of [
    [["--test-accounts", "--temporary-db"], enabled],
    [["--local-db", "--temporary-db"], enabled],
    [
      ["--local-db", "--test-accounts"],
      { ...enabled, MONGO_URI: "mongodb://external" },
    ],
    [["--local-db"], { ...enabled, NODE_ENV: "production" }],
  ])
    assert.throws(() => parseDevOptions(argv, env));
});

test("flush failure still closes HTTP and Mongo and restores the previous signing secret", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-cleanup-test-"));
  const previous = process.env.JWT_SECRET;
  let runtime, admin;
  try {
    runtime = await startDevServer({
      ...parseDevOptions(["--local-db", "--port=0"], {
        WEDDING_PIPELINE_ENABLED: "true",
      }),
      localRoot: root,
    });
    const db = mongoose.connection.db;
    admin = db.admin;
    // Inject only the database flush I/O failure, keeping actual runtime cleanup.
    db.admin = () => ({
      command: async () => {
        throw new Error("flush failed");
      },
    });
    await assert.rejects(runtime.close());
    db.admin = admin;
    assert.equal(runtime.server.listening, false);
    assert.equal(mongoose.connection.readyState, 0);
    assert.equal(process.env.JWT_SECRET, previous);
    await access(path.join(root, "database"));
    runtime = null;
    runtime = await startDevServer({
      ...parseDevOptions(["--local-db", "--port=0"], {
        WEDDING_PIPELINE_ENABLED: "true",
      }),
      localRoot: root,
    });
    await runtime.close();
    runtime = null;
  } finally {
    if (mongoose.connection.db && admin) mongoose.connection.db.admin = admin;
    await runtime?.close().catch(() => {});
    await mongoose.disconnect();
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
    // On RED the old runtime leaves its Mongo child alive; keep its files intact.
    if (!runtime) await rm(root, { recursive: true, force: true });
  }
});
