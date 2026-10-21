// Venue Studio core: API session, revision-safe writes, uploads, jobs, asset cache, capture,
// reference library and shared UI atoms. Most of this is the proven code from the classic studio.
import { h, $, sleep, clamp, uuid, store, toast, toastErr, fmtElapsed } from "./dom.js";
import { createViewer } from "./viewer.js";

export const API = "/api/wedding-pipeline";
export const SESSION_URL = "/studio/session";
export const DEMO_BASE = "/studio/demo";
export const POLL_MS = 3000;
export const JOB_TIMEOUT_MS = 8 * 60 * 1000;
export const TERMINAL = new Set(["succeeded", "needs_review", "failed", "awaiting_flow"]);
export const APPROVE_REASON = "Reviewed and approved by the planner in Venue Studio";
export const MAX_ANGLES = 4;
export const MAX_REFS = 3;

export const SLOTS = [
  { view: "front", label: "Front", hint: "Stand at the entrance and face into the venue", dir: 0 },
  { view: "back", label: "Back", hint: "Face back toward the entrance", dir: 180 },
  { view: "right", label: "Right", hint: "Turn to face the right-hand side", dir: 90 },
  { view: "left", label: "Left", hint: "Turn to face the left-hand side", dir: 270 },
];
export const GROUND = SLOTS.map((s) => s.view);

// Element types use the server component categories (contracts.CATEGORIES).
export const ELEMENTS = {
  entry: { label: "Entrance", lib: "entrance" },
  stage: { label: "Stage", lib: "stage" },
  lounge: { label: "Lounge", lib: "lounge" },
  photo_booth: { label: "Photo booth", lib: "photo_booth" },
  mandap: { label: "Mandap", lib: "mandap" },
  dining: { label: "Dining", lib: "dining" },
  bar: { label: "Bar", lib: "bar" },
  dance_floor: { label: "Dance floor", lib: "dance_floor" },
};
export const DEFAULT_ELEMENTS = ["entry", "stage", "lounge", "photo_booth"];
export const EXTRA_ELEMENTS = ["mandap", "dining", "bar", "dance_floor"];
export const typeOfLib = (libId) => Object.keys(ELEMENTS).find((t) => ELEMENTS[t].lib === libId || t === libId) || null;
export const elLabel = (type) => ELEMENTS[type]?.label || type || "Element";

/* ---------------- State ---------------- */

export const S = {
  token: null,
  project: null,
  stage: 0,
  caps: null,
  jobs: new Map(), // key -> entry
  busy: new Set(),
  slots: {}, // view -> { blob, url, assetId, error }
  pins: [], // stage 3 comment pins: { id, n, cx, cy, r, comment, refs, status, error, start, end, resultId, baseId, qa }
  draft: null, // id of the pin whose comment pill is open
  chain: [], // applied edit asset ids, oldest first (Undo pops the last)
  library: { status: "idle", data: null, error: null },
  missing: {}, // endpoint name -> message when the server does not offer it yet
  panelTab: "library",
  panelOpen: true,
  sheetOpen: false,
  libFilter: "all",
  viewing: null,
  demo: null,
  design: null, // stage 3 controller bundle
  costs: null, // { pid, data } from GET /projects/:id/costs
  costOpen: false,
  presenting: false,
  overviewErrors: {},
  overviewStarted: false,
  qa: {}, // assetId -> QA reason the planner overrode
};
export const hooks = { render: () => {}, refresh: () => {} };
export const pid = () => (S.project ? S.project.id ?? S.project._id : null);

/* ---------------- Local persistence ---------------- */

export const PROJECT_KEY = "atelier:projectId";
export const PREV_KEY = "atelier:prevProjectId";
export const DEMO_IDS_KEY = "atelier:demoProjectIds";
export const LAST_DEMO_KEY = "atelier:lastDemo";
export const pk = (name) => `atelier:${name}:${pid()}`;
export const local = {
  get: (name, fallback) => (pid() ? store.get(pk(name), fallback) : fallback),
  set: (name, value) => pid() && store.set(pk(name), value),
};

/* ---------------- API ---------------- */

export class ApiError extends Error {
  constructor(message, code, status, data) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export async function session(force = false) {
  if (S.token && !force) return S.token;
  let res;
  try {
    res = await fetch(SESSION_URL, { cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new ApiError("Cannot reach the studio server. Is the pipeline dev server running?", "NETWORK", 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  const token = data?.token ?? data?.session?.token;
  if (!res.ok || !token)
    throw new ApiError(data?.error || `Could not start a studio session (HTTP ${res.status})`, data?.code || "SESSION", res.status);
  S.token = token;
  return token;
}

async function parseError(res) {
  let data = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error, e.g. an unknown route */
  }
  const message =
    data?.error ||
    (res.status === 429 ? "Too many requests. Wait a few seconds and try again." : res.status === 404 ? "This feature is not available on the server (HTTP 404)." : `Request failed (HTTP ${res.status})`);
  return new ApiError(message, data?.code || (res.status === 429 ? "RATE_LIMITED" : `HTTP_${res.status}`), res.status, data);
}

export async function api(method, path, body, { form, raw } = {}, retried = false) {
  const token = await session();
  const opts = { method, headers: { Authorization: `Bearer ${token}` }, cache: "no-store" };
  if (form) opts.body = form;
  else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API + path, opts);
  } catch {
    throw new ApiError("Network error. Check the connection to the studio server and try again.", "NETWORK", 0);
  }
  if (res.status === 401 && !retried) {
    await session(true);
    return api(method, path, body, { form, raw }, true);
  }
  if (!res.ok) throw await parseError(res);
  if (raw) return res;
  let data = {};
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError("The server returned an unreadable response", "BAD_RESPONSE", res.status);
  }
  if (data.success === false) throw new ApiError(data.error || "Request failed", data.code, res.status, data);
  return data;
}

// A 404 without a pipeline error code means the route itself does not exist yet.
export const endpointMissing = (e) => !!e && e.status === 404 && (!e.data?.code || /^HTTP_/.test(String(e.code)));
// An unknown job operation is refused by the enqueue validator with this message.
export const operationMissing = (e) => !!e && e.code === "INVALID_JOB" && /Valid operation, requestKey and revision required/.test(e.message || "");

export const projPath = (rest = "") => `/projects/${encodeURIComponent(pid())}${rest}`;

export async function refreshProject() {
  const id = pid();
  if (!id) return null;
  const data = await api("GET", `/projects/${encodeURIComponent(id)}`);
  if (pid() === id) S.project = data.project;
  return data.project;
}

// Every write sends the current revision; on a revision conflict refetch and retry. Parallel jobs
// bump the revision often, so a few attempts are allowed.
export async function write(fn) {
  let data;
  for (let attempt = 0; ; attempt++) {
    try {
      data = await fn(S.project.revision);
      break;
    } catch (e) {
      if (e.code !== "REVISION_CONFLICT" || attempt >= 3) throw e;
      await refreshProject();
    }
  }
  if (data?.project && pid() === (data.project.id ?? data.project._id)) S.project = data.project;
  return data;
}

export async function ensureProject() {
  if (S.project) return S.project;
  const data = await api("POST", "/projects", { brief: { description: "", style: "", palette: [], constraints: [] } });
  S.project = data.project;
  store.set(PROJECT_KEY, pid());
  return S.project;
}

export async function loadCapabilities() {
  try {
    const data = await api("GET", "/capabilities");
    S.caps = data.capabilities || data;
  } catch (e) {
    S.caps = { error: e.message };
  }
  return S.caps;
}
export const falAvailable = () => !!(S.caps?.angleProviders?.fal || S.caps?.capabilities?.angleProviders?.fal);

/* ---------------- Run cost (GET /projects/:id/costs; hidden when the server has no such route) ---------------- */

const num0 = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
export function normalizeCosts(raw) {
  const ops = raw?.byOperation && typeof raw.byOperation === "object" ? raw.byOperation : {};
  const prov = raw?.byProvider && typeof raw.byProvider === "object" ? raw.byProvider : {};
  return {
    currency: typeof raw?.currency === "string" ? raw.currency : "USD",
    total: num0(raw?.total),
    byProvider: Object.fromEntries(Object.entries(prov).map(([k, v]) => [k, num0(typeof v === "object" ? v?.cost : v)])),
    byOperation: Object.entries(ops)
      .map(([op, v]) => ({ op, calls: Math.max(0, Math.round(num0(v?.calls))), cost: num0(v?.cost) }))
      .sort((a, b) => b.cost - a.cost),
    items: Array.isArray(raw?.items) ? raw.items.length : 0,
    pricingNote: typeof raw?.pricingNote === "string" ? raw.pricingNote : "",
  };
}
export function fmtUsd(n, digits = 2) {
  const v = num0(n);
  if (v > 0 && v < 10 ** -digits / 2) return `<$${(10 ** -digits).toFixed(digits)}`;
  return `$${v.toFixed(digits)}`;
}
let costTimer = 0;
let costSeq = 0;
export async function loadCosts() {
  const id = pid();
  if (!id || S.missing.costs) return null;
  const seq = ++costSeq;
  try {
    const data = await api("GET", `/projects/${encodeURIComponent(id)}/costs`);
    if (pid() !== id || seq !== costSeq) return null;
    S.costs = { pid: id, data: normalizeCosts(data.costs || data), at: Date.now() };
  } catch (e) {
    if (e.status === 404) {
      S.missing.costs = true;
      S.costs = null;
    }
  }
  hooks.refresh();
  return S.costs;
}
export function loadCostsSoon(ms = 500) {
  clearTimeout(costTimer);
  costTimer = setTimeout(() => loadCosts().catch(() => {}), ms);
}

/* ---------------- Assets ---------------- */

export const allAssets = () => S.project?.assets || [];
export const assetById = (id) => allAssets().find((a) => a.id === id);
const newest = (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
export const byKind = (kind, pred = () => true) => allAssets().filter((a) => a.kind === kind && pred(a)).sort(newest);
export const latest = (kind, pred) => byKind(kind, pred)[0];
export const approvedOf = (kind, pred) => byKind(kind, (a) => a.status === "approved" && (!pred || pred(a)))[0];
export const approvable = (a) =>
  !!a && ["candidate", "review"].includes(a.status) && a.qa?.decision !== "reject" && !["unsafe", "irrelevant"].includes(a.screening?.category);
export const rejected = (a) => !!a && (a.status === "rejected" || a.qa?.decision === "reject");

const urlCache = new Map();
const urlReady = new Map();
export function assetUrl(id) {
  const key = `${pid()}:${id}`;
  if (!urlCache.has(key)) {
    const projectId = pid();
    const p = (async () => {
      const res = await api("GET", `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(id)}`, undefined, { raw: true });
      return URL.createObjectURL(await res.blob());
    })();
    p.then((u) => urlReady.set(key, u)).catch(() => urlCache.delete(key));
    urlCache.set(key, p);
  }
  return urlCache.get(key);
}
export const readyUrl = (id) => urlReady.get(`${pid()}:${id}`) || null;

const jsonCache = new Map();
export function assetJson(id) {
  const key = `${pid()}:${id}`;
  if (!jsonCache.has(key)) {
    const projectId = pid();
    const p = (async () => {
      const res = await api("GET", `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(id)}`, undefined, { raw: true });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("The result file is not valid JSON");
      }
    })();
    p.catch(() => jsonCache.delete(key));
    jsonCache.set(key, p);
  }
  return jsonCache.get(key);
}

export function loadImage(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      reject(new Error("The image took too long to load"));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("The image could not be decoded"));
    };
    img.src = url;
  });
}

const infoCache = new Map();
// { url, w, h } for an asset image (natural size), cached.
export function imageInfo(id) {
  const key = `${pid()}:${id}`;
  if (!infoCache.has(key)) {
    const p = (async () => {
      const url = await assetUrl(id);
      const img = await loadImage(url);
      if (!img.naturalWidth || !img.naturalHeight) throw new Error("The image is empty");
      return { url, w: img.naturalWidth, h: img.naturalHeight, img };
    })();
    p.catch(() => infoCache.delete(key));
    infoCache.set(key, p);
  }
  return infoCache.get(key);
}

export function assetImg(id, alt = "", cls = "") {
  const ready = readyUrl(id);
  if (ready) return h("img", { alt, class: cls || null, decoding: "async", src: ready, draggable: "false" });
  const img = h("img", { alt, class: `${cls} loading`.trim(), decoding: "async", draggable: "false" });
  assetUrl(id)
    .then((u) => {
      img.src = u;
      img.classList.remove("loading");
    })
    .catch((e) => img.replaceWith(h("div", { class: "img-error" }, `Image unavailable: ${e.message}`)));
  return img;
}

export function resetCaches() {
  for (const p of urlCache.values()) p.then((v) => URL.revokeObjectURL(v)).catch(() => {});
  urlCache.clear();
  urlReady.clear();
  jsonCache.clear();
  infoCache.clear();
  for (const v of viewerCache.values()) v.destroy();
  viewerCache.clear();
}

/* ---------------- Jobs ---------------- */

// The server runs at most two jobs per project; the client queues locally so the third waits instead of failing.
const gate = { active: 0, waiters: [] };
const acquire = async () => {
  while (gate.active >= 2) await new Promise((r) => gate.waiters.push(r));
  gate.active++;
};
const release = () => {
  gate.active = Math.max(0, gate.active - 1);
  gate.waiters.shift()?.();
};
export const resetGate = () => {
  gate.active = 0;
  const w = gate.waiters.splice(0);
  w.forEach((r) => r());
};

export const jobMeta = (jobId) => (jobId ? local.get("jobs", {})[jobId] || null : null);
function rememberJob(job, operation, options) {
  const map = local.get("jobs", {});
  map[job.id] = { operation, options, at: Date.now() };
  const ids = Object.keys(map);
  if (ids.length > 120) ids.sort((a, b) => map[a].at - map[b].at).slice(0, ids.length - 120).forEach((x) => delete map[x]);
  local.set("jobs", map);
}
// Options of the job that produced an asset (asset fields win, then the remembered job options).
export const optionsOf = (a) => ({ ...(jobMeta(a?.jobId)?.options || {}), ...(a?.options || {}) });

export const isRunning = (key) => S.jobs.get(key)?.status === "running";
export const runningCount = () => [...S.jobs.values()].filter((j) => j.status === "running").length;
export const isBusy = (key) => S.busy.has(key);

export async function act(key, fn) {
  if (S.busy.has(key)) return;
  S.busy.add(key);
  hooks.render();
  try {
    return await fn();
  } catch (e) {
    toastErr(e);
  } finally {
    S.busy.delete(key);
    hooks.render();
  }
}

function finishEntry(entry, job) {
  entry.jobId = job.id;
  entry.status = job.status === "failed" ? "failed" : "done";
  entry.error = job.error?.message || null;
  entry.code = job.error?.code || null;
  entry.result = job.result || null;
  if (entry.status === "failed" && !entry.quiet) toast(entry.error || "The job failed", { type: "error", title: "Generation failed" });
}

async function pollJob(job, entry, projectId) {
  let j = job;
  let failures = 0;
  while (!TERMINAL.has(j.status)) {
    await sleep(POLL_MS);
    if (pid() !== projectId) throw new Error("Project changed");
    if (Date.now() - entry.start > JOB_TIMEOUT_MS)
      throw new ApiError("The job has not finished after 8 minutes. Check that the pipeline worker is running, then try again.", "JOB_TIMEOUT", 0);
    try {
      j = (await api("GET", `/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(j.id)}`)).job;
      failures = 0;
    } catch (e) {
      if (e.status === 404 || ++failures >= 6) throw e;
    }
    entry.phase = j.status;
  }
  // The worker publishes outputs to the project right after finishing; wait for it.
  for (let i = 0; i < 10; i++) {
    if (pid() !== projectId) throw new Error("Project changed");
    const p = await refreshProject().catch(() => null);
    if (j.published || (p && !(p.activeJobs || []).includes(j.id))) break;
    await sleep(1500);
    try {
      j = (await api("GET", `/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(j.id)}`)).job;
    } catch {
      /* keep waiting */
    }
  }
  return j;
}

const RETRYABLE = new Set(["ACTIVE_JOB_LIMIT", "RATE_LIMITED", "REVISION_CONFLICT"]);
export const retryable = (e) => !!e && (e.status === 429 || RETRYABLE.has(e.code));

export function runJob(key, operation, options = {}, { quietRetry = false, quiet = false } = {}) {
  const cur = S.jobs.get(key);
  if (cur?.status === "running") return cur.promise;
  const projectId = pid();
  const requestKey = uuid();
  const entry = { status: "running", phase: "waiting", start: Date.now(), operation, options, quiet };
  S.jobs.set(key, entry);
  hooks.refresh();
  entry.promise = (async () => {
    let held = false;
    try {
      await acquire();
      held = true;
      if (pid() !== projectId) throw new Error("Project changed");
      entry.phase = "queued";
      entry.start = Date.now();
      const data = await write((revision) => api("POST", `/projects/${encodeURIComponent(projectId)}/jobs`, { revision, requestKey, operation, options }));
      entry.jobId = data.job.id;
      rememberJob(data.job, operation, options);
      await refreshProject().catch(() => {});
      hooks.refresh();
      finishEntry(entry, await pollJob(data.job, entry, projectId));
    } catch (e) {
      entry.status = "failed";
      entry.error = operationMissing(e) ? `The server does not support "${operation}" yet.` : e.message;
      entry.code = operationMissing(e) ? "OPERATION_MISSING" : e.code;
      entry.httpStatus = e.status;
      if (pid() === projectId && !quiet && !(quietRetry && retryable(e))) toastErr({ message: entry.error }, "Could not run this step");
    } finally {
      if (held) release();
      if (pid() === projectId) {
        hooks.refresh();
        loadCostsSoon();
      }
    }
    return entry;
  })();
  return entry.promise;
}

// Runs a job, waiting and retrying while the server is busy (two active jobs, rate limit).
export async function runJobRetry(key, operation, options, { tries = 8, quiet = false, alive = () => true } = {}) {
  let entry;
  for (let i = 0; i < tries; i++) {
    entry = await runJob(key, operation, options, { quietRetry: i < tries - 1, quiet });
    if (entry.status !== "failed" || !retryable({ code: entry.code, status: entry.httpStatus })) return entry;
    if (!alive()) return entry;
    if (i < tries - 1) await sleep(4000);
  }
  return entry;
}

export async function resumeJobs(keyOf) {
  const projectId = pid();
  for (const id of S.project?.activeJobs || []) {
    try {
      const job = (await api("GET", `/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(id)}`)).job;
      if (TERMINAL.has(job.status)) continue;
      const key = keyOf(job);
      const entry = { status: "running", phase: job.status, start: Date.parse(job.createdAt) || Date.now(), operation: job.operation, options: job.options, jobId: job.id };
      S.jobs.set(key, entry);
      gate.active++;
      entry.promise = (async () => {
        try {
          finishEntry(entry, await pollJob(job, entry, projectId));
        } catch (e) {
          entry.status = "failed";
          entry.error = e.message;
        } finally {
          release();
        }
        if (pid() === projectId) {
          hooks.refresh();
          loadCostsSoon();
        }
        return entry;
      })();
    } catch {
      /* job not visible */
    }
  }
}

// The output of a finished job: matched by jobId, else the newest asset of that kind created after it started.
export function outputOf(entry, kind, pred = () => true) {
  if (!entry) return null;
  return latest(kind, (a) => a.jobId === entry.jobId && pred(a)) || (entry.jobId ? null : latest(kind, (a) => Date.parse(a.createdAt || 0) >= entry.start - 2000 && pred(a))) || null;
}

export const OVERRIDE_REASON = "Accepted by the planner in Venue Studio despite the automated quality check";
// override: accept a generated image the automated QA rejected (QA is advisory for generations).
export async function approveAsset(id, label = "Approved", { quiet = false, override = false } = {}) {
  await write((revision) =>
    api("POST", projPath(`/assets/${encodeURIComponent(id)}/approve`), override ? { revision, reason: OVERRIDE_REASON, override: true } : { revision, reason: APPROVE_REASON }),
  );
  if (!quiet) toast(label, { type: "success", title: "Saved" });
}
// Approves a generated asset: normally, or with the QA override when the quality check rejected it.
// Returns { asset, qa } where qa is the QA reason when it was overridden, or throws.
export async function acceptGenerated(a) {
  if (!a) throw new Error("Nothing to approve");
  if (a.status === "approved") return { asset: a, qa: qaNote(a.id) };
  const flagged = rejected(a);
  const reason = flagged ? a.qa?.reason || a.screening?.reason || "flagged by the quality check" : null;
  await approveAsset(a.id, "", { quiet: true, override: flagged });
  if (reason) setQaNote(a.id, reason);
  return { asset: assetById(a.id) || a, qa: reason };
}
// QA reasons the planner overrode, remembered per project so History can show them.
export const qaNote = (id) => S.qa[id] || local.get("qa", {})[id] || null;
export function setQaNote(id, reason) {
  S.qa[id] = reason;
  const m = local.get("qa", {});
  m[id] = reason;
  local.set("qa", m);
}

export async function screenPending() {
  for (let i = 0; i < 4; i++) {
    const cur = S.jobs.get("screen");
    if (cur?.status === "running") {
      await cur.promise;
      continue;
    }
    if (!allAssets().some((a) => a.status === "pending_screen")) return S.jobs.get("screen") || null;
    const entry = await runJobRetry("screen", "screen_assets", {});
    if (entry.status === "failed") return entry;
  }
  return S.jobs.get("screen") || null;
}

// Uploads images of one kind; returns the server { accepted, rejected } (indices refer to `files`).
export async function uploadImages(files, kind, views) {
  await ensureProject();
  return write((revision) => {
    const fd = new FormData();
    files.forEach((f, i) => fd.append("images", f.blob, f.name || `${kind}-${i + 1}.jpg`));
    fd.append("kind", kind);
    fd.append("views", JSON.stringify(views));
    fd.append("revision", String(revision));
    return api("POST", projPath("/assets"), undefined, { form: fd });
  });
}

/* ---------------- Capture ---------------- */

export async function normalizeFile(file) {
  // Re-encode to JPEG (fixes orientation, HEIC-in-Safari and oversized files). Falls back to the original.
  try {
    const bmp = await createImageBitmap(file);
    const max = 3072;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
    return blob || file;
  } catch {
    return file;
  }
}

export function pickFile({ capture } = {}) {
  return new Promise((resolve) => {
    const input = h("input", { type: "file", accept: "image/*", capture: capture ? "environment" : null, hidden: true });
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      input.remove();
      resolve(f ? await normalizeFile(f) : null);
    });
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    });
    document.body.append(input);
    input.click();
  });
}

export function openCamera(title) {
  return new Promise((resolve) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      pickFile({ capture: true }).then(resolve);
      return;
    }
    let stream = null;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      stream?.getTracks().forEach((t) => t.stop());
      document.removeEventListener("keydown", onKey);
      modal.remove();
      resolve(value);
    };
    const onKey = (e) => e.key === "Escape" && finish(null);
    const video = h("video", { playsinline: true, muted: true, autoplay: true });
    video.muted = true;
    const msg = h("div", { class: "camera-msg" }, h("span", { class: "spinner", "aria-hidden": "true" }), "Starting camera");
    const shutter = h("button", { type: "button", class: "shutter", "aria-label": "Take photo", disabled: true });
    const modal = h(
      "div",
      { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title },
      h(
        "div",
        { class: "modal-box camera-box" },
        h("div", { class: "modal-head" }, h("h2", null, title), h("span", { class: "muted small" }, "Hold the phone level")),
        h("div", { class: "camera-stage" }, video, msg),
        h(
          "div",
          { class: "camera-bar" },
          h("button", { type: "button", class: "btn", onclick: () => finish(null) }, "Cancel"),
          shutter,
          h(
            "button",
            {
              type: "button",
              class: "btn btn-ghost",
              onclick: async () => {
                stream?.getTracks().forEach((t) => t.stop());
                finish(await pickFile({ capture: true }));
              },
            },
            "Use camera app",
          ),
        ),
      ),
    );
    shutter.addEventListener("click", () => {
      const w = video.videoWidth;
      const hgt = video.videoHeight;
      if (!w || !hgt) return toast("The camera is not ready yet", { type: "error", title: "Camera" });
      const c = document.createElement("canvas");
      c.width = w;
      c.height = hgt;
      c.getContext("2d").drawImage(video, 0, 0, w, hgt);
      c.toBlob((b) => {
        if (!b) return toast("Could not capture the photo", { type: "error", title: "Camera" });
        if (Math.min(w, hgt) < 512) toast("This camera resolution is below 512 px and may be rejected. Use Upload for a sharper photo.", { type: "error", title: "Low resolution" });
        finish(b);
      }, "image/jpeg", 0.92);
    });
    document.addEventListener("keydown", onKey);
    document.body.append(modal);
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } } })
      .then((s) => {
        if (done) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        video.srcObject = s;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          msg.remove();
          shutter.disabled = false;
          shutter.focus();
        };
      })
      .catch((e) => {
        msg.textContent =
          e?.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow camera access, or use Upload / Use camera app."
            : e?.name === "NotFoundError"
              ? "No camera was found on this device. Use Upload instead."
              : `Camera unavailable: ${e?.message || e}`;
      });
  });
}

// Makes an element accept dropped image files. onFile(blob) receives the normalized image.
export function dropTarget(el, onFile, { accept } = {}) {
  el.addEventListener("dragover", (e) => {
    const types = [...(e.dataTransfer?.types || [])];
    if (!types.includes("Files") && !(accept && types.some((t) => accept.includes(t)))) return;
    e.preventDefault();
    el.classList.add("drop-over");
  });
  el.addEventListener("dragleave", (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove("drop-over");
  });
  el.addEventListener("drop", async (e) => {
    el.classList.remove("drop-over");
    const dt = e.dataTransfer;
    if (!dt) return;
    e.preventDefault();
    if (accept) for (const t of accept) if ([...dt.types].includes(t)) return onFile(null, { type: t, data: dt.getData(t) });
    const f = [...(dt.files || [])].find((x) => /^image\//.test(x.type) || /\.(jpe?g|png|webp|heic)$/i.test(x.name || ""));
    if (!f) return toast("Drop an image file (JPEG, PNG or WebP).", { type: "error", title: "Not an image" });
    onFile(await normalizeFile(f));
  });
  return el;
}

/* ---------------- Reference library ---------------- */

export const LIB_MIME = "application/x-venue-ref";
export const ASSET_MIME = "application/x-venue-asset";
export const libPath = (path) => `${DEMO_BASE}/references/${String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;

let libraryPromise = null;
export function loadLibrary() {
  if (S.library.status === "done") return Promise.resolve(S.library.data);
  if (libraryPromise) return libraryPromise;
  S.library = { status: "loading", data: null, error: null };
  libraryPromise = (async () => {
    let res;
    try {
      res = await fetch(`${DEMO_BASE}/references/references.json`, { cache: "no-store" });
    } catch {
      throw new Error("Cannot reach the reference library.");
    }
    if (!res.ok) throw new Error(res.status === 404 ? "The reference library is not installed on this server (404)." : `Could not load the reference library (HTTP ${res.status}).`);
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("The reference library file is not valid JSON.");
    }
    const elements = (Array.isArray(data?.elements) ? data.elements : [])
      .filter((g) => g && typeof g.id === "string")
      .map((g) => ({
        id: g.id,
        label: typeof g.label === "string" ? g.label : g.id,
        type: typeOfLib(g.id),
        items: (Array.isArray(g.items) ? g.items : [])
          .filter((it) => it && typeof it.path === "string")
          .map((it) => ({ path: it.path, label: String(it.label || it.path.split("/").pop()), style: String(it.style || ""), description: String(it.description || ""), group: g.id, type: typeOfLib(g.id) })),
      }))
      .filter((g) => g.items.length);
    if (!elements.length) throw new Error("The reference library is empty.");
    return { elements };
  })();
  libraryPromise.then(
    (data) => {
      S.library = { status: "done", data, error: null };
      hooks.refresh();
    },
    (e) => {
      S.library = { status: "error", data: null, error: e.message };
      libraryPromise = null;
      hooks.refresh();
    },
  );
  return libraryPromise;
}
export const libraryItems = () => (S.library.data?.elements || []).flatMap((g) => g.items);

// Imports a library image into the project as an approved "reference" asset (cached per preset path).
const importing = new Map();
export function importReference(path, label) {
  const map = local.get("imports", {});
  const known = map[path] && assetById(map[path]);
  if (known) return Promise.resolve(known);
  const found = allAssets().find((a) => a.kind === "reference" && (a.presetPath === path || a.sourcePath === path));
  if (found) return Promise.resolve(found);
  const key = `${pid()}:${path}`;
  if (importing.has(key)) return importing.get(key);
  const p = (async () => {
    await ensureProject();
    try {
      const data = await write((revision) => api("POST", projPath("/references/import"), { revision, presetPath: path, label: String(label || "Reference").slice(0, 80) }));
      const asset = data.asset || (data.project?.assets || []).find((a) => a.kind === "reference" && a.presetPath === path);
      if (!asset?.id) throw new Error("The server did not return the imported reference.");
      if (!assetById(asset.id)) await refreshProject().catch(() => {});
      const m = local.get("imports", {});
      m[path] = asset.id;
      local.set("imports", m);
      delete S.missing.import;
      return assetById(asset.id) || asset;
    } catch (e) {
      if (endpointMissing(e)) {
        S.missing.import = "Importing library references is not available on this server yet (404).";
        throw new ApiError(S.missing.import, "ENDPOINT_MISSING", 404);
      }
      throw e;
    } finally {
      importing.delete(key);
    }
  })();
  importing.set(key, p);
  return p;
}

/* ---------------- Specifications data ---------------- */

export function normalizeSpecs(raw) {
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const strs = (a) => (Array.isArray(a) ? a.map(str).filter(Boolean) : []);
  const d = raw?.dimensions || {};
  return {
    name: str(raw?.name),
    summary: str(raw?.summary),
    dimensions: { widthFt: num(d.widthFt), depthFt: num(d.depthFt), heightFt: num(d.heightFt) },
    materials: strs(raw?.materials),
    billOfQuantities: (Array.isArray(raw?.billOfQuantities) ? raw.billOfQuantities : [])
      .filter((r) => r && str(r.item))
      .map((r) => ({ item: str(r.item), quantity: num(r.quantity), unit: str(r.unit) })),
    priceInr: { low: num(raw?.priceInr?.low), high: num(raw?.priceInr?.high) },
    priceBasis: str(raw?.priceBasis),
    setupHours: num(raw?.setupHours),
    crew: num(raw?.crew),
    powerKw: num(raw?.powerKw),
    leadTimeDays: num(raw?.leadTimeDays),
    notes: strs(raw?.notes),
  };
}
export function ftIn(ft) {
  const total = Math.round(ft * 12);
  const f = Math.floor(total / 12);
  const i = total % 12;
  if (!f) return `${i} in`;
  return i ? `${f} ft ${i} in` : `${f} ft`;
}
export const inchesOf = (ft) => `${Math.round(ft * 12)} in`;
export const cmOf = (ft) => `${Math.round(ft * 30.48)} cm`;
export const dec1 = (n) => String(Math.round(n * 10) / 10);
function groupIN(n) {
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return (n < 0 ? "-" : "") + (rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3);
}
export const inr = (n) => `₹${groupIN(n)}`;
export const priceRange = (p) =>
  p?.low != null && p?.high != null ? (Math.round(p.low) === Math.round(p.high) ? inr(p.low) : `${inr(p.low)} – ${inr(p.high)}`) : "Not available";
export const hasDims = (d) => !!(d && d.widthFt && d.depthFt && d.heightFt);
export const dimsLine = (d) => (hasDims(d) ? `${ftIn(d.widthFt)} W x ${ftIn(d.depthFt)} D x ${ftIn(d.heightFt)} H` : "Size not available");
export const footprint = (d) => (d?.widthFt && d?.depthFt ? `${dec1(d.widthFt * d.depthFt)} sq ft (${dec1(d.widthFt * d.depthFt * 0.09290304)} sq m)` : "");

/* ---------------- UI atoms ---------------- */

export function btn(label, onClick, { primary, small, ghost, quiet, disabled, busy, title, id, pressed, ariaLabel, cls, ico } = {}) {
  const c = ["btn", primary && "btn-primary", small && "btn-sm", ghost && "btn-ghost", quiet && "btn-quiet", busy && "is-busy", cls].filter(Boolean).join(" ");
  return h(
    "button",
    { type: "button", class: c, disabled: disabled || busy, title, id, "aria-pressed": pressed == null ? null : String(pressed), "aria-label": ariaLabel, "aria-busy": busy ? "true" : null, onclick: onClick },
    busy ? h("span", { class: "spinner", "aria-hidden": "true" }) : ico || null,
    label,
  );
}

export function jobLine(key, text, { onRetry } = {}) {
  const j = S.jobs.get(key);
  if (!j) return null;
  if (j.status === "running") {
    const phase = j.phase === "waiting" ? "Waiting for a free generation slot" : j.phase === "queued" ? "Queued" : text;
    return h(
      "div",
      { class: "progress", role: "status", "aria-live": "polite" },
      h("span", { class: "live-dot", "aria-hidden": "true" }),
      h("span", null, phase),
      h("span", { class: "elapsed", dataset: { job: key } }, fmtElapsed(Date.now() - j.start)),
    );
  }
  if (j.status === "failed")
    return h(
      "div",
      { class: "alert", role: "alert" },
      h("strong", null, "Failed. "),
      j.error || "The job did not complete.",
      onRetry ? h("button", { type: "button", class: "link-btn", onclick: onRetry }, " Try again") : null,
    );
  return null;
}

export function modal(title, body, { onClose, cls = "" } = {}) {
  const close = () => {
    root.remove();
    document.removeEventListener("keydown", onKey, true);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  const box = h(
    "div",
    { class: `modal-box ${cls}` },
    h("div", { class: "modal-head" }, h("h2", null, title), h("button", { type: "button", class: "btn btn-quiet btn-sm", onclick: () => close(), "aria-label": "Close" }, "Close")),
    body,
  );
  const root = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title, onclick: (e) => e.target === root && close() }, box);
  document.addEventListener("keydown", onKey, true);
  document.body.append(root);
  setTimeout(() => box.querySelector("button, [tabindex]")?.focus?.(), 0);
  return { close, root, box };
}

export function lightbox(id, alt) {
  modal(alt || "Image", h("div", { class: "lightbox-img" }, assetImg(id, alt)), { cls: "lightbox" });
}

// 360 viewers are cached per asset so periodic re-renders move the same element instead of rebuilding it.
const viewerCache = new Map();
export function viewerFor(assetId, label = "360 view") {
  let v = viewerCache.get(assetId);
  if (!v || v.dead) {
    v = createViewer({
      key: `${pid()}:${assetId}`,
      label,
      wrap: true,
      getSource: async () => {
        const info = await imageInfo(assetId);
        const max = 4096;
        if (info.w <= max) return { img: info.img, w: info.w, h: info.h };
        const c = document.createElement("canvas");
        c.width = max;
        c.height = Math.round(info.h * (max / info.w));
        const ctx = c.getContext("2d");
        if (!ctx) return { img: info.img, w: info.w, h: info.h };
        ctx.drawImage(info.img, 0, 0, c.width, c.height);
        return { img: c, w: c.width, h: c.height };
      },
      onFlat: () => lightbox(assetId, label),
    });
    viewerCache.set(assetId, v);
  }
  return v.el;
}
export function openViewerModal(assetId, title = "Look around") {
  const v = createViewer({
    key: `${pid()}:${assetId}:modal`,
    label: title,
    wrap: true,
    getSource: async () => {
      const info = await imageInfo(assetId);
      return { img: info.img, w: info.w, h: info.h };
    },
    onFlat: () => lightbox(assetId, title),
  });
  modal(title, h("div", { class: "viewer-modal" }, v.el), { cls: "wide", onClose: () => v.destroy() });
}

export { h, $, sleep, clamp, uuid, store, toast, toastErr, fmtElapsed };
