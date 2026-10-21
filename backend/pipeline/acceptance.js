import dotenv from "dotenv";
import { readFile, stat, realpath, mkdir, open, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createHash } from "node:crypto";
import {
  validateBrief,
  validateComponents,
  validateCanvas,
  id,
  fail,
  PipelineError,
} from "./contracts.js";
import { normalizeImage, DEFAULT_DATA_DIR } from "./media.js";
import { fingerprint, componentHash, designHash } from "./fingerprints.js";
import { GeminiClient, providerReadiness } from "./gemini.js";
import { DEFAULT_LOCAL_ROOT, localOrigin } from "./local-workspace.js";
import { writePrivateJson } from "./private-files.js";
dotenv.config({ quiet: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
// Only these service failures guarantee that enqueue did not create a job.
// Transport, generic server and idempotency errors remain uncertain submissions.
const PRE_ENQUEUE_REFUSALS = new Map([
  ["REVISION_CONFLICT", 409],
  ["PROVIDER_NOT_CONFIGURED", 503],
  ["ACTIVE_JOB_LIMIT", 429],
  ["ASSET_LIMIT", 400],
  ["NO_PENDING_IMAGES", 400],
  ["VENUE_VIEW_COUNT", 400],
  ["INVALID_VENUE_SELECTION", 400],
  ["VENUE_APPROVAL_REQUIRED", 400],
  ["IMAGE_TOO_SMALL", 400],
  ["DUPLICATE_IMAGE", 400],
  ["DUPLICATE_GROUND_VIEW", 400],
  ["CAMERA_TRANSLATION_UNSUPPORTED", 400],
  ["STALE_ENVIRONMENT", 409],
]);
function within(root, file) {
  const relative = path.relative(root, file);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}
export async function loadCase(caseFile) {
  const root = await realpath(path.dirname(path.resolve(caseFile)));
  if ((await stat(caseFile)).size > 65536)
    fail("INVALID_CASE", "Case JSON must be at most 64 KiB");
  let value;
  try {
    value = JSON.parse(await readFile(caseFile, "utf8"));
  } catch {
    fail("INVALID_CASE", "Case JSON is invalid");
  }
  if (
    value?.formatVersion !== 1 ||
    !id(value.name) ||
    !["real_venue", "synthetic_fixture"].includes(value.provenance) ||
    Object.keys(value).some(
      (k) =>
        ![
          "formatVersion",
          "name",
          "provenance",
          "brief",
          "venue",
          "components",
          "canvas",
        ].includes(k),
    )
  )
    fail(
      "INVALID_CASE",
      "Use formatVersion 1, a case name and explicit real_venue or synthetic_fixture provenance",
    );
  const brief = validateBrief(value.brief),
    components = validateComponents(value.components);
  if (
    !Array.isArray(value.venue) ||
    value.venue.length < 4 ||
    value.venue.length > 5 ||
    !components.length ||
    components.some((c) => c.referenceAssetIds.length) ||
    value.venue.length + components.length + 1 > 13
  )
    fail(
      "INVALID_CASE",
      "Use four or five ground views and a component set fitting the 13-image reference budget; inspiration IDs are assigned later",
    );
  const venue = [],
    views = new Set();
  for (const input of value.venue) {
    if (
      !input ||
      typeof input.file !== "string" ||
      path.isAbsolute(input.file) ||
      !within(root, path.resolve(root, input.file))
    )
      fail(
        "CASE_PATH_ESCAPE",
        "Venue files must stay inside the case directory",
      );
    if (
      !["front", "right", "back", "left", "unspecified"].includes(input.view) ||
      views.has(input.view)
    )
      fail("INVALID_CASE", "Use distinct supported ground-view labels");
    views.add(input.view);
    let file;
    try {
      file = await realpath(path.resolve(root, input.file));
    } catch {
      fail(
        "CASE_INPUT_MISSING",
        "Place the four or five venue photographs named in the case inside its directory",
      );
    }
    if (!within(root, file))
      fail(
        "CASE_PATH_ESCAPE",
        "Venue file aliases must stay inside the case directory",
      );
    const info = await stat(file);
    if (!info.isFile() || info.size > 10 * 1024 * 1024)
      fail("INVALID_CASE", "Each venue image must be a file at most 10 MiB");
    const buffer = await readFile(file),
      image = await normalizeImage(buffer);
    if (venue.some((v) => v.normalizedHash === image.hash))
      fail("INVALID_CASE", "The case must contain distinct venue captures");
    venue.push({
      file: input.file,
      view: input.view,
      buffer,
      inputHash: sha(buffer),
      normalizedHash: image.hash,
    });
  }
  if (
    !value.canvas ||
    Object.keys(value.canvas).some(
      (k) => !["baseView", "regions", "strokes"].includes(k),
    ) ||
    !views.has(value.canvas.baseView)
  )
    fail("INVALID_CASE", "Canvas baseView must select one venue capture");
  const dummy = {
    components: components.map((c) => ({
      ...c,
      masterAssetId: `master-${c.id}`,
    })),
    assets: [
      { id: "case-base", kind: "venue", status: "approved" },
      ...components.map((c) => ({
        id: `master-${c.id}`,
        kind: "component_sheet",
        status: "approved",
      })),
    ],
  };
  const drawing = validateCanvas(
    {
      baseAssetId: "case-base",
      regions: value.canvas.regions || [],
      strokes: value.canvas.strokes || [],
    },
    dummy,
  );
  const canvas = {
    baseView: value.canvas.baseView,
    regions: drawing.regions,
    strokes: drawing.strokes,
  };
  const identity = {
    name: value.name,
    provenance: value.provenance,
    brief,
    components,
    canvas,
    venue: venue.map(({ file, view, inputHash }) => ({
      file,
      view,
      inputHash,
    })),
  };
  return { ...identity, venue, caseId: fingerprint(identity).slice(0, 20) };
}

export class AcceptanceApi {
  constructor(session, { fetchImpl = globalThis.fetch } = {}) {
    if (
      session?.formatVersion !== 1 ||
      !id(session.workspaceId) ||
      !id(session.owner?.userId) ||
      !id(session.vendor?.userId) ||
      typeof session.owner.token !== "string" ||
      typeof session.vendor.token !== "string"
    )
      fail(
        "INVALID_LOCAL_SESSION",
        "Start owned local mode with --test-accounts to create private sessions",
      );
    this.session = session;
    this.base = localOrigin(session.baseUrl);
    this.fetch = fetchImpl;
  }
  async request(route, { method = "GET", body, actor = "owner" } = {}) {
    let response;
    try {
      response = await this.fetch(`${this.base}/api/wedding-pipeline${route}`, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: `Bearer ${this.session[actor].token}`,
          ...(body !== undefined && !(body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          body === undefined
            ? undefined
            : body instanceof FormData
              ? body
              : JSON.stringify(body),
      });
    } catch {
      fail(
        "ACCEPTANCE_API_UNAVAILABLE",
        "Local API request failed; recover saved requests before retrying",
        503,
      );
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body || []) {
      size += chunk.length;
      if (size > 5 * 1024 * 1024)
        fail(
          "ACCEPTANCE_RESPONSE_LIMIT",
          "Local API response exceeded its limit",
          502,
        );
      chunks.push(Buffer.from(chunk));
    }
    let result;
    try {
      result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      fail("ACCEPTANCE_API_RESPONSE", "Local API returned invalid JSON", 502);
    }
    if (!response.ok)
      throw new PipelineError(
        /^[A-Z0-9_]{1,80}$/.test(result.code)
          ? result.code
          : "ACCEPTANCE_API_ERROR",
        `Local API returned HTTP ${response.status}; inspect the project before resubmitting`,
        response.status,
      );
    return result;
  }
}
function acceptanceReport(p, state, input, client) {
  const assets = p.assets || [],
    measurements = [];
  for (const a of assets)
    for (const metric of [
      a.generationTelemetry,
      a.qa?.telemetry,
      a.screening?.telemetry,
    ])
      if (metric)
        measurements.push({
          provider: metric.provider,
          model: metric.model,
          elapsedMs: metric.elapsedMs,
          requestBytes: metric.requestBytes,
          usage: metric.usage,
        });
  const usage = {
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    totalTokenCount: 0,
  };
  for (const m of measurements)
    for (const key of Object.keys(usage))
      if (Number.isSafeInteger(m.usage?.[key])) usage[key] += m.usage[key];
  return {
    caseId: input.caseId,
    provenance: input.provenance,
    projectId: p._id,
    revision: p.revision,
    prepared: state.prepared === true,
    provider: providerReadiness(client),
    reservedProviderCalls: Object.values(state.requests).reduce(
      (sum, r) => sum + r.maxCalls,
      0,
    ),
    venueAssets: assets
      .filter((a) => a.kind === "venue")
      .map((a) => ({ id: a.id, view: a.view, status: a.status })),
    components: p.components.map((c) => ({
      id: c.id,
      masterAssetId: c.masterAssetId || null,
    })),
    outputs: assets
      .filter((a) =>
        [
          "component_sheet",
          "showcase",
          "panorama",
          "environment",
          "environment_glb",
        ].includes(a.kind),
      )
      .map((a) => ({
        id: a.id,
        kind: a.kind,
        status: a.status,
        sourceRevision: a.sourceRevision,
      })),
    jobs: Object.values(state.requests).map((r) => ({
      operation: r.body.operation,
      requestKey: r.body.requestKey,
      jobId: r.jobId || null,
      status: r.status || "submission_saved",
    })),
    measurements,
    usage: measurements.some((m) => m.usage) ? usage : null,
    actualCost: null,
    costVerified: false,
    liveAcceptanceCompleted: false,
    remainingGates: [
      ...(!providerReadiness(client).generationReady
        ? ["PROVIDER_NOT_CONFIGURED"]
        : []),
      ...(assets.some((a) => a.kind === "venue" && a.status !== "approved")
        ? ["VENUE_SCREENING_OR_REVIEW_REQUIRED"]
        : []),
      ...(p.components.some((c) => !c.masterAssetId)
        ? ["COMPONENT_APPROVAL_REQUIRED"]
        : []),
      ...(!assets.some(
        (a) =>
          a.kind === "showcase" &&
          a.status === "approved" &&
          a.sourceDesignHash === designHash(p),
      )
        ? ["SHOWCASE_APPROVAL_REQUIRED"]
        : []),
      "LIVE_QUALITY_AND_COST_ACCEPTANCE_REQUIRED",
    ],
  };
}

export async function runAcceptance({
  step,
  caseFile,
  sessionFile = path.join(DEFAULT_LOCAL_ROOT, "session.json"),
  stateRoot = path.join(DEFAULT_DATA_DIR, "acceptance"),
  client = new GeminiClient(),
  allowPaid = false,
  maxPaidCalls = 0,
  assetId,
  reason,
  waitMs = 15000,
}) {
  if (
    ![
      "prepare",
      "screen",
      "panorama",
      "components",
      "showcase",
      "approve",
      "report",
    ].includes(step)
  )
    fail(
      "INVALID_ACCEPTANCE_STEP",
      "Choose prepare, screen, panorama, components, showcase, approve or report",
    );
  const input = await loadCase(caseFile);
  let session;
  try {
    session = JSON.parse(await readFile(sessionFile, "utf8"));
  } catch {
    fail(
      "INVALID_LOCAL_SESSION",
      "Start owned local mode with --test-accounts first",
    );
  }
  const api = new AcceptanceApi(session),
    directory = path.join(path.resolve(stateRoot), input.caseId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let lock;
  try {
    lock = await open(path.join(directory, "run.lock"), "wx", 0o600);
  } catch {
    fail(
      "ACCEPTANCE_BUSY",
      "This run is locked; check an interrupted operator process before removing its lock",
      409,
    );
  }
  try {
    const stateFile = path.join(directory, "state.json");
    let state;
    try {
      state = JSON.parse(await readFile(stateFile, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT")
        fail("INVALID_ACCEPTANCE_STATE", "Private run state is invalid");
      state = {
        formatVersion: 1,
        caseId: input.caseId,
        workspaceId: session.workspaceId,
        requests: {},
      };
    }
    if (
      state.formatVersion !== 1 ||
      state.caseId !== input.caseId ||
      state.workspaceId !== session.workspaceId ||
      !state.requests ||
      typeof state.requests !== "object"
    )
      fail(
        "INVALID_ACCEPTANCE_STATE",
        "Run state belongs to another case or local workspace",
      );
    const save = () => writePrivateJson(stateFile, state);
    let p,
      projectFresh = false,
      refreshAfterJob = false;
    const get = async () => {
      if (!state.projectId)
        fail("PREPARE_REQUIRED", "Run the prepare step first");
      p = (await api.request(`/projects/${state.projectId}`)).project;
      projectFresh = true;
      return p;
    };
    if (step === "prepare") {
      if (!state.projectId) {
        p = (
          await api.request("/projects", {
            method: "POST",
            body: { brief: input.brief },
          })
        ).project;
        state.projectId = p._id;
        await save();
      }
      await get();
      if (!state.prepared) {
        if (!p.collaborators.includes(session.vendor.userId))
          p = (
            await api.request(`/projects/${p._id}/collaborators`, {
              method: "PUT",
              body: {
                revision: p.revision,
                userIds: [...p.collaborators, session.vendor.userId],
              },
            })
          ).project;
        const missing = input.venue.filter(
          (v) => !p.assets.some((a) => a.hash === v.normalizedHash),
        );
        if (missing.length) {
          const form = new FormData();
          form.append("revision", String(p.revision));
          form.append("kind", "venue");
          form.append("views", JSON.stringify(missing.map((v) => v.view)));
          for (const image of missing)
            form.append(
              "images",
              new Blob([image.buffer]),
              image.file.split(/[\\/]/).at(-1),
            );
          const result = await api.request(`/projects/${p._id}/assets`, {
            method: "POST",
            body: form,
          });
          p = result.project;
          if (result.rejected.length)
            fail(
              "CASE_UPLOAD_REJECTED",
              "One or more captures failed server validation; inspect the project",
            );
        }
        if (!p.components.length)
          p = (
            await api.request(`/projects/${p._id}`, {
              method: "PATCH",
              body: {
                revision: p.revision,
                changes: { components: input.components },
              },
            })
          ).project;
        state.prepared = true;
        await save();
      }
    } else await get();
    if (!state.prepared)
      fail(
        "PREPARE_REQUIRED",
        "Complete prepare before running acceptance steps",
      );
    const authorizePaidWork = () => {
      if (!allowPaid)
        fail(
          "PAID_OPT_IN_REQUIRED",
          "Use --allow-paid with an explicit --max-paid-calls before provider work",
        );
      if (
        !Number.isSafeInteger(maxPaidCalls) ||
        maxPaidCalls < 1 ||
        maxPaidCalls > 100
      )
        fail(
          "PAID_BUDGET_REQUIRED",
          "Choose an explicit maximum of 1–100 provider calls for this run",
        );
      const ready = providerReadiness(client);
      if (step === "screen" ? !ready.screeningReady : !ready.generationReady)
        fail(
          "PROVIDER_NOT_CONFIGURED",
          "Gemini key/image/vision configuration is incomplete; no job was reserved",
          503,
        );
    };
    const submit = async (operation, options = {}, maxCalls = 0) => {
      const requestId = fingerprint({ operation, options }).slice(0, 16);
      let record = state.requests[requestId];
      if (!record || record.refusal) {
        if (maxCalls) authorizePaidWork();
        if (!projectFresh) await get();
        const reserved = Object.values(state.requests).reduce(
          (sum, r) => sum + r.maxCalls,
          0,
        );
        if (maxCalls && reserved + maxCalls > maxPaidCalls)
          fail(
            "PAID_BUDGET_EXCEEDED",
            "This operation exceeds the run call reservation; no job was submitted",
            409,
          );
        record = {
          body: {
            revision: p.revision,
            requestKey: `phase2-${input.caseId}-${requestId}`,
            operation,
            options,
          },
          maxCalls,
        };
        state.requests[requestId] = record;
        await save(); // Exact body and budget persist before the potentially billable submission.
      }
      if (!record.jobId) {
        let response;
        try {
          response = await api.request(`/projects/${p._id}/jobs`, {
            method: "POST",
            body: record.body,
          });
        } catch (error) {
          if (
            error instanceof PipelineError &&
            PRE_ENQUEUE_REFUSALS.get(error.code) === error.status
          ) {
            record.refusal = error.code;
            record.status = "rejected_before_enqueue";
            record.maxCalls = 0;
            await save();
          }
          throw error;
        }
        record.jobId = response.job.id;
        record.status = response.job.status;
        await save();
      }
      projectFresh = false;
      refreshAfterJob = true;
      const deadline = Date.now() + Math.max(0, Math.min(waitMs, 180000));
      while (Date.now() < deadline) {
        const job = (
          await api.request(`/projects/${p._id}/jobs/${record.jobId}`)
        ).job;
        record.status = job.status;
        await save();
        if (
          !["queued", "running"].includes(job.status) &&
          job.published !== false
        )
          return job;
        await delay(3000);
      }
      return { status: record.status, pending: true };
    };
    if (step === "screen")
      await submit(
        "screen_assets",
        {},
        Math.min(
          5,
          p.assets.filter((a) => a.status === "pending_screen").length,
        ),
      );
    if (step === "panorama") await submit("panorama");
    if (step === "components")
      for (const c of input.components) {
        const current = p.components.find((x) => x.id === c.id);
        if (!current || componentHash(current) !== componentHash(c))
          fail(
            "CASE_DESIGN_DRIFT",
            "Component definitions changed; use a revised case instead of overwriting them",
            409,
          );
        if (current.masterAssetId) continue;
        const job = await submit("component_sheet", { componentId: c.id }, 2);
        if (job.pending || job.status === "failed" || job.error) break;
      }
    if (step === "showcase") {
      const requestId = fingerprint({
        operation: "showcase",
        options: {},
      }).slice(0, 16);
      if (!state.requests[requestId] || state.requests[requestId].refusal) {
        authorizePaidWork();
        if (p.components.some((c) => !c.masterAssetId))
          fail(
            "COMPONENT_APPROVAL_REQUIRED",
            "Explicitly approve every master sheet before showcase generation",
            409,
          );
        const base = p.assets.find(
          (a) =>
            a.kind === "venue" &&
            a.view === input.canvas.baseView &&
            a.status === "approved",
        );
        if (!base)
          fail(
            "VENUE_APPROVAL_REQUIRED",
            "Screen and review the selected canvas base first",
            409,
          );
        const drawing = {
          baseAssetId: base.id,
          regions: input.canvas.regions,
          strokes: input.canvas.strokes,
        };
        if (p.canvas && fingerprint(p.canvas) !== fingerprint(drawing))
          fail(
            "CANVAS_CONFLICT",
            "An existing vendor drawing differs from this case; it will not be overwritten",
            409,
          );
        if (!p.canvas)
          p = (
            await api.request(`/projects/${p._id}`, {
              method: "PATCH",
              actor: "vendor",
              body: { revision: p.revision, changes: { canvas: drawing } },
            })
          ).project;
      }
      await submit("showcase", {}, 2);
    }
    if (step === "approve") {
      if (
        !id(assetId) ||
        typeof reason !== "string" ||
        reason.trim().length < 10
      )
        fail(
          "MANUAL_APPROVAL_REQUIRED",
          "Provide an explicit asset ID and meaningful inspection reason",
        );
      p = (
        await api.request(`/projects/${p._id}/assets/${assetId}/approve`, {
          method: "POST",
          body: { revision: p.revision, reason },
        })
      ).project;
    }
    if (refreshAfterJob) await get();
    const report = acceptanceReport(p, state, input, client);
    await writePrivateJson(path.join(directory, "report.json"), report);
    return report;
  } finally {
    await lock.close();
    await rm(path.join(directory, "run.lock"), { force: true });
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    const args = {};
    for (const arg of process.argv.slice(2)) {
      if (arg === "--allow-paid") args.allowPaid = true;
      else {
        const match =
          /^--(step|case|session|max-paid-calls|asset|reason|wait-ms)=(.+)$/.exec(
            arg,
          );
        if (!match)
          fail(
            "INVALID_ARGUMENT",
            "Use --step=, --case=, optional --session=, --allow-paid, --max-paid-calls=, --asset=, --reason=, --wait-ms=",
          );
        args[match[1]] = match[2];
      }
    }
    if (!args.case)
      fail("INVALID_ARGUMENT", "Provide --case=path/to/case.json");
    const report = await runAcceptance({
      step: args.step || "report",
      caseFile: path.resolve(args.case),
      sessionFile: args.session ? path.resolve(args.session) : undefined,
      allowPaid: args.allowPaid,
      maxPaidCalls: Number(args["max-paid-calls"] || 0),
      assetId: args.asset,
      reason: args.reason,
      waitMs: Number(args["wait-ms"] || 15000),
    });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        code: error.status ? error.code : "ACCEPTANCE_SETUP_FAILED",
        message: error.status
          ? error.message
          : "Check private case/session files and the local workbench",
      }),
    );
    process.exitCode = 2;
  }
}
