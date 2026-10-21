import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { startDevServer, parseDevOptions } from "../dev-server.js";
import { loadCase, runAcceptance } from "../acceptance.js";
import { GeminiClient } from "../gemini.js";
import { PipelineProject } from "../models.js";

async function caseFixture(root) {
  await mkdir(root, { recursive: true });
  const venue = [];
  for (const [i, view] of ["front", "right", "back", "left"].entries()) {
    const data = Buffer.alloc(600 * 600 * 3);
    for (let n = 0; n < data.length; n++)
      data[n] = (n * 17 + Math.floor(n / 1800) * 11 + i * 37) % 256;
    const file = `${view}.jpg`;
    await writeFile(
      path.join(root, file),
      await sharp(data, { raw: { width: 600, height: 600, channels: 3 } })
        .jpeg()
        .toBuffer(),
    );
    venue.push({ file, view });
  }
  const value = {
    formatVersion: 1,
    name: "synthetic-smoke",
    provenance: "synthetic_fixture",
    brief: { description: "Synthetic test wedding" },
    venue,
    components: [
      { id: "stage", category: "stage", description: "Timber stage" },
    ],
    canvas: {
      baseView: "front",
      regions: [
        {
          id: "stage-zone",
          action: "place",
          componentId: "stage",
          points: [
            [0.2, 0.2],
            [0.5, 0.2],
            [0.5, 0.6],
          ],
        },
      ],
      strokes: [],
    },
  };
  const file = path.join(root, "case.json");
  await writeFile(file, JSON.stringify(value));
  return { file, value };
}
test("acceptance rejects escaping case files and preserves declared synthetic provenance", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-case-"));
  try {
    const f = await caseFixture(path.join(root, "input"));
    const valid = await loadCase(f.file);
    assert.equal(valid.provenance, "synthetic_fixture");
    assert.equal(valid.venue.length, 4);
    f.value.venue[0].file = "../outside.jpg";
    await writeFile(f.file, JSON.stringify(f.value));
    await assert.rejects(loadCase(f.file), { code: "CASE_PATH_ESCAPE" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keyless acceptance prepares through real JWT API, survives rerun, and reserves no paid job", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-acceptance-"));
  let runtime;
  try {
    const f = await caseFixture(path.join(root, "input"));
    runtime = await startDevServer({
      ...parseDevOptions(["--local-db", "--test-accounts", "--port=0"], {
        WEDDING_PIPELINE_ENABLED: "true",
      }),
      localRoot: path.join(root, "local"),
    });
    const options = {
      caseFile: f.file,
      sessionFile: path.join(root, "local", "session.json"),
      stateRoot: path.join(root, "runs"),
      client: new GeminiClient({ apiKey: "", imageModel: "", visionModel: "" }),
    };
    const prepared = await runAcceptance({ ...options, step: "prepare" });
    assert.equal(prepared.prepared, true);
    assert.equal(prepared.venueAssets.length, 4);
    const repeated = await runAcceptance({ ...options, step: "prepare" });
    assert.equal(repeated.projectId, prepared.projectId);
    await assert.rejects(runAcceptance({ ...options, step: "screen" }), {
      code: "PAID_OPT_IN_REQUIRED",
    });
    await assert.rejects(
      runAcceptance({
        ...options,
        step: "screen",
        allowPaid: true,
        maxPaidCalls: 20,
      }),
      { code: "PROVIDER_NOT_CONFIGURED" },
    );
    const report = await runAcceptance({ ...options, step: "report" });
    assert.equal(report.reservedProviderCalls, 0);
    assert.equal(report.actualCost, null);
    assert.equal(report.liveAcceptanceCompleted, false);
    assert.equal(report.provenance, "synthetic_fixture");
    const session = JSON.parse(await readFile(options.sessionFile, "utf8"));
    assert.equal(JSON.stringify(report).includes(session.owner.token), false);
    assert.equal(JSON.stringify(report).includes("jwtSecret"), false);
    await assert.rejects(runAcceptance({ ...options, step: "panorama" }), {
      code: "VENUE_APPROVAL_REQUIRED",
    });
    // A known pre-enqueue refusal must not pin the old project revision forever.
    await PipelineProject.updateOne(
      { _id: prepared.projectId },
      {
        $set: { "assets.$[].status": "approved" },
        $inc: { revision: 1 },
      },
    );
    const panorama = await runAcceptance({
      ...options,
      step: "panorama",
      waitMs: 0,
    });
    assert.ok(panorama.jobs.find((j) => j.operation === "panorama").jobId);
  } finally {
    await runtime?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("mocked-network acceptance uses real accounts, preserves human gates and recovers jobs without another paid call", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-acceptance-flow-"));
  let runtime;
  const previous = Object.fromEntries(
    [
      "GEMINI_API_KEY",
      "WEDDING_GEMINI_IMAGE_MODEL",
      "WEDDING_GEMINI_VISION_MODEL",
      "WEDDING_AI_PROVIDER",
      "WEDDING_IMAGE_PROVIDER",
      "WEDDING_VISION_PROVIDER",
    ].map((k) => [k, process.env[k]]),
  );
  const originalFetch = globalThis.fetch;
  let imageCalls = 0,
    loseComponentResponse = true;
  try {
    const f = await caseFixture(path.join(root, "input"));
    const pixels = await readFile(path.join(root, "input", "front.jpg"));
    // Pin the provider: a developer .env selecting OpenAI must not bypass the mocked Gemini network.
  process.env.WEDDING_AI_PROVIDER = "gemini";
  delete process.env.WEDDING_IMAGE_PROVIDER;
  delete process.env.WEDDING_VISION_PROVIDER;
  process.env.GEMINI_API_KEY = "mock-network-key";
    process.env.WEDDING_GEMINI_IMAGE_MODEL = "image";
    process.env.WEDDING_GEMINI_VISION_MODEL = "vision";
    globalThis.fetch = async (url, init) => {
      if (
        !String(url).startsWith("https://generativelanguage.googleapis.com/")
      ) {
        const response = await originalFetch(url, init);
        if (
          loseComponentResponse &&
          init?.method === "POST" &&
          String(url).endsWith("/jobs") &&
          JSON.parse(init.body).operation === "component_sheet" &&
          response.ok
        ) {
          loseComponentResponse = false;
          await response.arrayBuffer();
          throw new TypeError("Simulated lost accepted response");
        }
        return response;
      }
      const payload = JSON.parse(init.body),
        image = !!payload.generationConfig.responseModalities;
      if (image) imageCalls++;
      const screen =
        !image && !payload.generationConfig.responseSchema.properties.issues;
      return new Response(
        JSON.stringify({
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: image
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
                        text: JSON.stringify(
                          screen
                            ? {
                                decision: "accept",
                                category: "venue",
                                reason: "Controlled synthetic fixture",
                              }
                            : {
                                decision: "pass",
                                reason: "Controlled synthetic fixture",
                                issues: [],
                              },
                        ),
                      },
                    ],
              },
            },
          ],
        }),
      );
    };
    runtime = await startDevServer({
      ...parseDevOptions(
        ["--local-db", "--test-accounts", "--worker", "--port=0"],
        { WEDDING_PIPELINE_ENABLED: "true" },
      ),
      localRoot: path.join(root, "local"),
    });
    const options = {
      caseFile: f.file,
      sessionFile: path.join(root, "local", "session.json"),
      stateRoot: path.join(root, "runs"),
      allowPaid: true,
      maxPaidCalls: 10,
      waitMs: 12000,
    };
    const prepared = await runAcceptance({ ...options, step: "prepare" });
    await runAcceptance({ ...options, step: "screen" });
    await assert.rejects(
      runAcceptance({ ...options, step: "components", maxPaidCalls: 4 }),
      { code: "PAID_BUDGET_EXCEEDED" },
    );
    await assert.rejects(runAcceptance({ ...options, step: "components" }), {
      code: "ACCEPTANCE_API_UNAVAILABLE",
    });
    const stateFile = path.join(
      options.stateRoot,
      prepared.caseId,
      "state.json",
    );
    const uncertain = JSON.parse(await readFile(stateFile, "utf8"));
    const uncertainRecord = Object.values(uncertain.requests).find(
      (r) => r.body.operation === "component_sheet",
    );
    assert.equal(uncertainRecord.jobId, undefined);
    await PipelineProject.updateOne(
      { _id: prepared.projectId },
      { $inc: { revision: 1 } },
    );
    const sheets = await runAcceptance({
      ...options,
      step: "components",
      allowPaid: false,
      client: new GeminiClient({ apiKey: "", imageModel: "", visionModel: "" }),
    });
    const recoveredState = JSON.parse(await readFile(stateFile, "utf8"));
    assert.deepEqual(
      Object.values(recoveredState.requests).find(
        (r) => r.body.operation === "component_sheet",
      ).body,
      uncertainRecord.body,
    );
    assert.equal(imageCalls, 1);
    await assert.rejects(runAcceptance({ ...options, step: "showcase" }), {
      code: "COMPONENT_APPROVAL_REQUIRED",
    });
    // Another nonbillable edit advances the revision before recovering the original job.
    const session = JSON.parse(await readFile(options.sessionFile, "utf8"));
    const project = await (
      await originalFetch(
        `${session.baseUrl}/api/wedding-pipeline/projects/${prepared.projectId}`,
        { headers: { Authorization: `Bearer ${session.owner.token}` } },
      )
    ).json();
    const saved = JSON.parse(
      await readFile(
        path.join(options.stateRoot, prepared.caseId, "state.json"),
        "utf8",
      ),
    );
    const originalBody = Object.values(saved.requests).find(
      (r) => r.body.operation === "component_sheet",
    ).body;
    const recovered = await runAcceptance({
      ...options,
      step: "components",
      client: new GeminiClient({ apiKey: "", imageModel: "", visionModel: "" }),
      allowPaid: false,
    });
    assert.equal(imageCalls, 1);
    assert.equal(
      recovered.jobs.find((j) => j.operation === "component_sheet").jobId,
      sheets.jobs.find((j) => j.operation === "component_sheet").jobId,
    );
    const after = JSON.parse(
      await readFile(
        path.join(options.stateRoot, prepared.caseId, "state.json"),
        "utf8",
      ),
    );
    assert.deepEqual(
      Object.values(after.requests).find(
        (r) => r.body.operation === "component_sheet",
      ).body,
      originalBody,
    );
    assert.ok(project.project.revision > originalBody.revision);
    const sheet = sheets.outputs.find((a) => a.kind === "component_sheet");
    await runAcceptance({
      ...options,
      step: "approve",
      assetId: sheet.id,
      reason: "Explicit synthetic fixture approval for transport test",
    });
    const scene = await runAcceptance({ ...options, step: "showcase" });
    assert.equal(imageCalls, 2);
    assert.equal(scene.reservedProviderCalls, 8);
    assert.ok(scene.measurements.length >= 8);
    assert.equal(scene.actualCost, null);
    assert.equal(scene.liveAcceptanceCompleted, false);
  } finally {
    await runtime?.close();
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("a definitively refused paid job releases its reservation and requires fresh explicit authorization", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-refusal-"));
  const keys = [
    "GEMINI_API_KEY",
    "WEDDING_GEMINI_IMAGE_MODEL",
    "WEDDING_GEMINI_VISION_MODEL",
  ];
  const previous = keys.map((k) => process.env[k]);
  let runtime;
  try {
    // No worker is started: this tests server enqueue refusals without provider I/O.
    process.env.GEMINI_API_KEY = "unused-fixture-key";
    process.env.WEDDING_GEMINI_IMAGE_MODEL = "image";
    process.env.WEDDING_GEMINI_VISION_MODEL = "vision";
    const f = await caseFixture(path.join(root, "input"));
    runtime = await startDevServer({
      ...parseDevOptions(["--local-db", "--test-accounts", "--port=0"], {
        WEDDING_PIPELINE_ENABLED: "true",
      }),
      localRoot: path.join(root, "local"),
    });
    const options = {
      caseFile: f.file,
      sessionFile: path.join(root, "local", "session.json"),
      stateRoot: path.join(root, "runs"),
      allowPaid: true,
      maxPaidCalls: 4,
      waitMs: 0,
    };
    const prepared = await runAcceptance({ ...options, step: "prepare" });
    await PipelineProject.updateOne(
      { _id: prepared.projectId },
      { $set: { activeJobs: ["slot-one", "slot-two"] }, $inc: { revision: 1 } },
    );
    await assert.rejects(runAcceptance({ ...options, step: "screen" }), {
      code: "ACTIVE_JOB_LIMIT",
    });
    const refused = await runAcceptance({ ...options, step: "report" });
    assert.equal(refused.reservedProviderCalls, 0);
    assert.equal(refused.jobs[0].status, "rejected_before_enqueue");
    await assert.rejects(
      runAcceptance({ ...options, step: "screen", allowPaid: false }),
      { code: "PAID_OPT_IN_REQUIRED" },
    );
    await PipelineProject.updateOne(
      { _id: prepared.projectId },
      { $set: { activeJobs: [] }, $inc: { revision: 1 } },
    );
    const retried = await runAcceptance({ ...options, step: "screen" });
    assert.ok(retried.jobs[0].jobId);
    assert.equal(retried.reservedProviderCalls, 4);
    assert.equal(retried.jobs[0].requestKey, refused.jobs[0].requestKey);
  } finally {
    await runtime?.close();
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
    await rm(root, { recursive: true, force: true });
  }
});
