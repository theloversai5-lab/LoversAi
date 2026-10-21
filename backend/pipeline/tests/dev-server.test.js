import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { parseDevOptions, startDevServer } from "../dev-server.js";

test("local runtime requires explicit database mode and rejects host widening or invalid ports", () => {
  const enabled = { WEDDING_PIPELINE_ENABLED: "true" };
  for (const [argv, env] of [
    [[], enabled],
    [["--temporary-db"], {}],
    [["--temporary-db"], { ...enabled, MONGO_URI: "mongodb://do-not-connect" }],
    [["--host=0.0.0.0", "--temporary-db"], enabled],
    [["--port=-1", "--temporary-db"], enabled],
    [["--port=70000", "--temporary-db"], enabled],
    [[], { ...enabled, MONGO_URI: "mongodb://local-dev" }],
  ])
    assert.throws(() => parseDevOptions(argv, env));
  const parsed = parseDevOptions(
    ["--temporary-db", "--port=0", "--worker"],
    enabled,
  );
  assert.equal(parsed.port, 0);
  assert.equal(parsed.worker, true);
  assert.equal(parsed.temporaryDb, true);
  const persistent = parseDevOptions([], {
    ...enabled,
    MONGO_URI: "mongodb://local-dev",
    JWT_SECRET: "test-private-secret",
  });
  assert.equal(persistent.temporaryDb, false);
});

test("temporary runtime exposes honest readiness, uses real authentication and cleans owned resources", async () => {
  const runtime = await startDevServer(
    parseDevOptions(["--temporary-db", "--port=0"], {
      WEDDING_PIPELINE_ENABLED: "true",
    }),
  );
  const address = runtime.server.address();
  assert.equal(address.address, "127.0.0.1");
  const url = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${url}/health`),
      health = await response.json();
    assert.equal(response.status, 200);
    assert.equal(health.database.connected, true);
    assert.equal(health.database.temporary, true);
    assert.equal(health.worker.running, false);
    assert.equal(health.authenticationRequired, true);
    assert.equal(health.provider.availabilityVerified, false);
    assert.equal(JSON.stringify(health).includes("mongodb://"), false);
    assert.equal(JSON.stringify(health).includes(runtime.temporaryRoot), false);
    assert.equal(
      (await fetch(`${url}/api/wedding-pipeline/capabilities`)).status,
      401,
    );
    assert.match(
      await (await fetch(url)).text(),
      /Wedding visualization pipeline/,
    );
  } finally {
    await runtime.close();
  }
  await assert.rejects(access(runtime.temporaryRoot), { code: "ENOENT" });
  await runtime.close(); // shutdown is idempotent.
});

test("studio session is served to loopback hosts only and rejects rebinding hosts", async () => {
  const { createDevApp: makeApp } = await import("../dev-server.js");
  const http = await import("node:http");
  const app = makeApp({
    service: {},
    authenticate: (_req, _res, next) => next(),
    status: () => ({}),
    studioSession: async () => "local-token",
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const get = (host) =>
    new Promise((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port: server.address().port, path: "/studio/session", headers: { host } }, (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => resolve({ status: res.statusCode, body }));
        })
        .on("error", reject);
    });
  try {
    const ok = await get(`127.0.0.1:${server.address().port}`);
    assert.equal(ok.status, 200);
    assert.equal(JSON.parse(ok.body).token, "local-token");
    assert.equal((await get("evil.example.com")).status, 403);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
