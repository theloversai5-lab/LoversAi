import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { protect } from "../middleware/auth.js";
import { PipelineProject, PipelineJob } from "./models.js";
import { MongoRepository } from "./repository.js";
import { AssetStore, DEFAULT_DATA_DIR } from "./media.js";
import { providerReadiness } from "./gemini.js";
import { createModelClient } from "./providers.js";
import { PipelineService } from "./service.js";
import { createPipelineRouter } from "./routes.js";
import { processNextJob } from "./worker.js";
import {
  prepareLocalWorkspace,
  provisionLocalAccounts,
  LOCAL_DB_NAME,
} from "./local-workspace.js";
dotenv.config({ quiet: true });

export function parseDevOptions(argv, env = process.env) {
  if (env.WEDDING_PIPELINE_ENABLED !== "true")
    throw new Error(
      "Set WEDDING_PIPELINE_ENABLED=true to start the isolated local pipeline",
    );
  if (
    argv.some(
      (arg) =>
        ![
          "--temporary-db",
          "--worker",
          "--local-db",
          "--test-accounts",
        ].includes(arg) && !/^--port=\d{1,5}$/.test(arg),
    )
  )
    throw new Error(
      "Supported flags: --temporary-db, --local-db, --test-accounts, --worker, --port=<0..65535>. Host is always 127.0.0.1",
    );
  const ports = argv.filter((arg) => arg.startsWith("--port="));
  if (new Set(argv).size !== argv.length || ports.length > 1)
    throw new Error("Duplicate local runtime flags");
  const port = Number(
    ports[0]?.split("=")[1] ?? env.WEDDING_PIPELINE_PORT ?? 5000,
  );
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Invalid local port");
  const temporaryDb = argv.includes("--temporary-db");
  const localDb = argv.includes("--local-db"),
    testAccounts = argv.includes("--test-accounts");
  if (
    (localDb && temporaryDb) ||
    (testAccounts && !localDb) ||
    (localDb && env.NODE_ENV === "production")
  )
    throw new Error(
      "Test accounts require explicit owned local database mode outside production",
    );
  if ((temporaryDb || localDb) && env.MONGO_URI)
    throw new Error(
      "Do not combine --temporary-db with MONGO_URI; select the intended database explicitly",
    );
  if (!temporaryDb && !localDb && (!env.MONGO_URI || !env.JWT_SECRET?.trim()))
    throw new Error(
      "MONGO_URI and JWT_SECRET are required; --temporary-db is for empty infrastructure previews only",
    );
  return {
    port,
    temporaryDb,
    localDb,
    testAccounts,
    worker: argv.includes("--worker"),
    mongoUri: env.MONGO_URI,
    jwtSecret: env.JWT_SECRET,
  };
}

const LOOPBACK = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
const loopbackRequest = (req) =>
  LOOPBACK.includes(req.socket.remoteAddress) &&
  /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(req.headers.host || "");

export function createDevApp({ service, authenticate, status, studioSession, demoDir }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "128kb" }));
  if (studioSession) {
    // Local demo studio: loopback only; Host check blocks DNS-rebinding reads of the session.
    app.get("/studio/session", async (req, res) => {
      if (!loopbackRequest(req)) return res.status(403).json({ success: false, error: "Loopback only" });
      const token = await studioSession();
      if (!token) return res.status(503).json({ success: false, error: "Start with --test-accounts" });
      res.set("Cache-Control", "no-store").json({ success: true, token });
    });
    if (demoDir)
      app.use(
        "/studio/demo",
        (req, res, next) => (loopbackRequest(req) ? next() : res.status(403).end()),
        express.static(demoDir, { index: false, dotfiles: "deny", fallthrough: false }),
      );
    app.use(
      "/studio",
      (req, res, next) => (loopbackRequest(req) ? next() : res.status(403).end()),
      express.static(fileURLToPath(new URL("./studio/", import.meta.url)), { index: "index.html" }),
    );
  }
  app.get("/", async (_req, res) =>
    res
      .set("Cache-Control", "no-store")
      .type("text/plain")
      .send(await readFile(new URL("./README.md", import.meta.url), "utf8")),
  );
  app.get("/health", (_req, res) =>
    res.set("Cache-Control", "no-store").json({
      service: "Wedding image pipeline",
      mode: "local backend preview",
      authenticationRequired: true,
      api: "/api/wedding-pipeline",
      documentation: "/",
      ...status(),
      provider: providerReadiness(service.gemini),
      videoMode: "google_flow_handoff",
      trueHdri: false,
      reconstructedGeometry: false,
      physicalVenues: {
        timedBracketHdr: true,
        nativeColmapAdapter: true,
        measuredProxyScenes: true,
        runtimeVerified: false,
      },
      venueEnvironments: {
        captureReadiness: true,
        embeddedGlb: true,
        approvedPackage: true,
        measuredGeometry: false,
      },
    }),
  );
  app.use(
    "/api/wedding-pipeline",
    createPipelineRouter({ service, authenticate }),
  );
  app.use((error, _req, res, _next) =>
    res
      .status(error.type === "entity.too.large" ? 413 : 500)
      .json({ success: false, error: "Local pipeline request failed" }),
  );
  return app;
}

export async function startDevServer(options) {
  if (mongoose.connection.readyState !== 0)
    throw new Error("Local runtime must own its database connection");
  let database, temporaryRoot, server, workerTask, closingPromise, workspace;
  let stopping = false,
    workerRunning = false,
    lastCycleFailed = false;
  const controller = new AbortController();
  const originalSecret = process.env.JWT_SECRET;
  let localSecret;
  const close = () => {
    if (closingPromise) return closingPromise;
    stopping = true;
    controller.abort();
    closingPromise = (async () => {
      const errors = [];
      const cleanup = async (action) => {
        try {
          await action();
        } catch (error) {
          errors.push(error);
        }
      };
      try {
        await cleanup(async () => {
          if (server?.listening)
            await new Promise((resolve, reject) =>
              server.close((error) => (error ? reject(error) : resolve())),
            );
        });
        await cleanup(async () => {
          await workerTask;
        });
        await cleanup(async () => {
          if (workspace && mongoose.connection.readyState === 1)
            await mongoose.connection.db
              .admin()
              .command({ fsync: 1, maxTimeMS: 10000 });
        });
        await cleanup(() => mongoose.disconnect());
        await cleanup(async () => {
          await database?.stop();
        });
        await cleanup(async () => {
          if (!temporaryRoot) return;
          // Only remove the exact temporary directory created and owned by this run.
          if (
            path.dirname(temporaryRoot) !== path.resolve(tmpdir()) ||
            !path.basename(temporaryRoot).startsWith("wedding-pipeline-dev-")
          )
            throw new Error(
              "Refusing to remove an unexpected temporary runtime directory",
            );
          await rm(temporaryRoot, { recursive: true, force: true });
        });
      } finally {
        if (process.env.JWT_SECRET === localSecret) {
          if (originalSecret === undefined) delete process.env.JWT_SECRET;
          else process.env.JWT_SECRET = originalSecret;
        }
      }
      if (errors.length)
        throw new AggregateError(
          errors,
          "Local runtime cleanup encountered errors",
        );
    })();
    return closingPromise;
  };
  try {
    if (options.localDb)
      workspace = await prepareLocalWorkspace(options.localRoot);
    localSecret =
      workspace?.config.jwtSecret ||
      options.jwtSecret ||
      randomBytes(48).toString("hex");
    process.env.JWT_SECRET = localSecret;
    let mongoUri = options.mongoUri;
    if (options.temporaryDb) {
      temporaryRoot = await mkdtemp(
        path.join(tmpdir(), "wedding-pipeline-dev-"),
      );
      const dbPath = path.join(temporaryRoot, "mongo");
      await mkdir(dbPath);
      database = await MongoMemoryServer.create({
        instance: {
          dbPath,
          storageEngine: "wiredTiger",
          dbName: "wedding_pipeline_local",
        },
      });
      mongoUri = database.getUri();
    }
    if (workspace) {
      database = await MongoMemoryServer.create({
        instance: {
          ip: "127.0.0.1",
          dbPath: workspace.databasePath,
          storageEngine: "wiredTiger",
          dbName: LOCAL_DB_NAME,
        },
      });
      mongoUri = database.getUri(LOCAL_DB_NAME);
    }
    if (!mongoUri)
      throw new Error("Explicit local database configuration required");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      ...(workspace ? { writeConcern: { w: "majority", journal: true } } : {}),
    });
    await Promise.all([PipelineProject.init(), PipelineJob.init()]);
    const deps = {
      repository: new MongoRepository(),
      assets: workspace
        ? new AssetStore(workspace.assetsPath)
        : options.temporaryDb
          ? new AssetStore(path.join(temporaryRoot, "assets"))
          : new AssetStore(),
      gemini: createModelClient(),
    };
    const service = new PipelineService(deps);
    const app = createDevApp({
      service,
      authenticate: protect,
      demoDir: options.testAccounts
        ? path.join(DEFAULT_DATA_DIR, "demo-presets")
        : undefined,
      studioSession: options.testAccounts
        ? async () =>
            JSON.parse(await readFile(workspace.sessionFile, "utf8")).owner?.token
        : undefined,
      status: () => ({
        database: {
          connected: mongoose.connection.readyState === 1,
          temporary: !!options.temporaryDb,
          managedLocal: !!workspace,
        },
        worker: { running: workerRunning, lastCycleFailed },
        accountsSeeded: !!options.testAccounts,
      }),
    });
    server = await new Promise((resolve, reject) => {
      const pending = app.listen(options.port, "127.0.0.1", () =>
        resolve(pending),
      );
      pending.once("error", reject);
    });
    if (options.testAccounts)
      await provisionLocalAccounts(workspace, {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
      });
    if (options.worker) {
      // Several loops so screening is not stuck behind a slow image render. Default 3, max 6.
      const loops = Math.min(6, Math.max(1, Number(process.env.WEDDING_PIPELINE_WORKERS) || 3));
      const runLoop = async () => {
        const workerId = randomUUID();
        while (!stopping) {
          let worked = false;
          try {
            worked = await processNextJob(deps, workerId);
            lastCycleFailed = false;
          } catch {
            lastCycleFailed = true;
            console.error(
              "Local pipeline worker cycle failed; inspect the private job status",
            );
          }
          if (!worked && !stopping)
            await delay(1500, undefined, { signal: controller.signal }).catch(
              () => {},
            );
        }
      };
      workerTask = (async () => {
        workerRunning = true;
        try {
          await Promise.all(Array.from({ length: loops }, runLoop));
        } finally {
          workerRunning = false;
        }
      })();
    }
    return { server, close, temporaryRoot, localRoot: workspace?.root };
  } catch (error) {
    await close();
    throw error;
  }
}

async function main() {
  const options = parseDevOptions(process.argv.slice(2));
  const runtime = await startDevServer(options);
  console.log(
    `Pipeline local preview ready: http://localhost:${runtime.server.address().port} | /health`,
  );
  console.log(
    `Database: ${options.localDb ? "owned persistent local development" : options.temporaryDb ? "temporary, empty; discarded on shutdown" : "configured development database"} | Worker: ${options.worker ? "enabled" : "disabled"} | Authentication: required`,
  );
  if (options.testAccounts)
    console.log(
      "Explicit planner/vendor fixtures ready. Bearer sessions are in the private local workspace session.json; credentials are never printed.",
    );
  const stop = () =>
    runtime.close().then(
      () => {
        process.exitCode = 0;
      },
      () => {
        console.error("Local runtime cleanup failed");
        process.exitCode = 1;
      },
    );
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
)
  main().catch(() => {
    console.error(
      "Local pipeline failed to start. Check feature flag, database mode, JWT_SECRET, port and local Mongo runtime.",
    );
    process.exitCode = 1;
  });
