// Venue Studio — customer demo UI for the wedding pipeline.
// Vanilla ES module, no build step. Served from /studio/ by the pipeline dev server.

const API = "/api/wedding-pipeline";
const SESSION_URL = "/studio/session";
const POLL_MS = 3000;
const TERMINAL = new Set(["succeeded", "needs_review", "failed", "awaiting_flow"]);
const APPROVE_REASON = "Reviewed and approved by the planner in Venue Studio";
const MAX_VIEWER_WIDTH = 4096;
const ZONE_MS = 700; // AI drawing: time per zone
const CLEAR_MS = 500; // AI drawing: time per keep-clear area

const STEPS = [
  { key: "venue", title: "Venue photos" },
  { key: "brief", title: "Description" },
  { key: "draw", title: "Layout" },
  { key: "sheets", title: "Design elements" },
  { key: "complete", title: "Complete venue" },
  { key: "pano", title: "360 view" },
];

const SLOTS = [
  { view: "front", label: "Front", hint: "Stand at the entrance and face into the venue" },
  { view: "right", label: "Right", hint: "Turn to face the right-hand side" },
  { view: "back", label: "Back", hint: "Face the far end of the venue" },
  { view: "left", label: "Left", hint: "Face the left-hand side" },
  { view: "satellite", label: "Satellite", hint: "Map or drone view from above", optional: true },
];
const GROUND = ["front", "right", "back", "left"];

const ELEMENTS = [
  { type: "entry", label: "Entry" },
  { type: "mandap", label: "Mandap" },
  { type: "stage", label: "Stage" },
  { type: "dance_floor", label: "Dance floor" },
  { type: "lounge", label: "Lounge" },
  { type: "dining", label: "Seating & dining" },
  { type: "bar", label: "Bar" },
  { type: "photo_booth", label: "Photo booth" },
  { type: "keep_clear", label: "Keep clear" },
];
const ELEMENT = Object.fromEntries(ELEMENTS.map((e) => [e.type, e]));
const DESCRIPTION_HINTS = {
  entry: "e.g. floral arch entrance with hanging marigolds",
  mandap: "e.g. white floral mandap with gold pillars",
  stage: "e.g. low stage with ivory drapes and fairy lights",
  dance_floor: "e.g. glossy black-and-white dance floor",
  lounge: "e.g. velvet sofas with brass side tables",
  dining: "e.g. long tables with candles and roses",
  bar: "e.g. marble-top bar with pampas grass",
  photo_booth: "e.g. flower wall with neon sign",
  keep_clear: "e.g. fire exit or walkway",
};
const VIEW_LABEL = { front: "Front view", top: "Top view", full_sheet: "Full sheet", side: "Side view", detail: "Detail", spec: "Dimensioned drawing", board: "Spec sheet" };
const PALETTE_SUGGESTIONS = ["ivory", "gold", "blush", "sage", "marigold", "burgundy", "emerald"];
const STYLE_SUGGESTIONS = ["Modern Indian", "Garden romantic", "Royal heritage", "Minimal white"];
const BLOCKER_TEXT = {
  VENUE_VIEW_COUNT: "needs exactly 4 or 5 ground photos",
  INVALID_VENUE_SELECTION: "selection contains a non-ground photo",
  VENUE_APPROVAL_REQUIRED: "every selected photo must be accepted",
  IMAGE_TOO_SMALL: "a photo is smaller than 512 px",
  DUPLICATE_IMAGE: "two photos are identical",
  DUPLICATE_GROUND_VIEW: "two photos share the same direction",
  CAMERA_TRANSLATION_UNSUPPORTED: "the camera moved between photos",
};

/* ---------------- Storage ---------------- */

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: state stays in memory only */
    }
  },
  del(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
const PROJECT_KEY = "venueStudio:projectId";
const PREV_KEY = "venueStudio:prevProjectId";
const DEMO_IDS_KEY = "venueStudio:demoProjectIds";
const LAST_DEMO_KEY = "venueStudio:lastDemo";
const k = (name) => `venueStudio:${name}:${pid()}`;

/* ---------------- State ---------------- */

const S = {
  token: null,
  project: null,
  step: 0,
  mode: "steps",
  jobs: new Map(), // key -> { status, start, operation, options, jobId, error, diag, promise }
  busy: new Set(),
  slots: {}, // view -> { blob, url, assetId, error }
  refs: {}, // componentId -> { assetId, error }
  shapes: [],
  draft: null,
  tool: "mandap",
  selected: null,
  briefDraft: null,
  viewers: [],
  panoBlock: null,
  generation: 0,
  demo: null,
  specs: {}, // componentId -> { status, data, assetId, error, promise }
  drawer: null, // componentId shown in the specifications drawer
  aiAnim: null, // current AI layout drawing animation
  prevShapes: null, // layout before the AI drawing, for undo
};

/* ---------------- Utilities ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pid = () => (S.project ? S.project.id ?? S.project._id : null);

function uuid() {
  if (globalThis.crypto?.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      /* insecure context: fall through */
    }
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [key, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (key === "class") el.className = v;
    else if (key === "style") el.style.cssText = v;
    else if (key === "value") el.value = v;
    else if (key === "dataset") Object.assign(el.dataset, v);
    else if (key.startsWith("on") && typeof v === "function") el.addEventListener(key.slice(2).toLowerCase(), v);
    else el.setAttribute(key, v === true ? "" : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

/* ---------------- Toasts ---------------- */

function toast(message, { type = "info", title } = {}) {
  const box = $("#toasts");
  const close = () => el.remove();
  const el = h(
    "div",
    { class: `toast ${type}`, role: type === "error" ? "alert" : "status" },
    h("div", null, title ? h("div", { class: "toast-title" }, title) : null, h("div", null, message)),
    h("button", { type: "button", "aria-label": "Dismiss", onclick: close }, "×"),
  );
  box.append(el);
  setTimeout(close, type === "error" ? 10000 : 5000);
}
const toastErr = (e, title = "Something went wrong") =>
  toast(e?.message || String(e), { type: "error", title });

/* ---------------- API ---------------- */

class ApiError extends Error {
  constructor(message, code, status, data) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function session(force = false) {
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
    throw new ApiError(
      data?.error || `Could not start a studio session (HTTP ${res.status})`,
      data?.code || "SESSION",
      res.status,
    );
  S.token = token;
  return token;
}

async function parseError(res) {
  let data = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error */
  }
  const message =
    data?.error ||
    (res.status === 429 ? "Too many requests. Wait a few seconds and try again." : `Request failed (HTTP ${res.status})`);
  return new ApiError(message, data?.code || (res.status === 429 ? "RATE_LIMITED" : `HTTP_${res.status}`), res.status, data);
}

async function api(method, path, body, { form, raw } = {}, retried = false) {
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

async function refreshProject() {
  const id = pid();
  if (!id) return null;
  const data = await api("GET", `/projects/${encodeURIComponent(id)}`);
  if (pid() === id) S.project = data.project;
  return data.project;
}

// Every write sends the current revision; on a revision conflict refetch and retry once.
async function write(fn) {
  let data;
  try {
    data = await fn(S.project.revision);
  } catch (e) {
    if (e.code !== "REVISION_CONFLICT") throw e;
    await refreshProject();
    data = await fn(S.project.revision);
  }
  if (data?.project) S.project = data.project;
  return data;
}

async function ensureProject() {
  if (S.project) return S.project;
  const data = await api("POST", "/projects", {
    brief: { description: "", style: "", palette: [], constraints: [] },
  });
  S.project = data.project;
  store.set(PROJECT_KEY, pid());
  return S.project;
}

/* ---------------- Assets ---------------- */

const allAssets = () => S.project?.assets || [];
const assetById = (id) => allAssets().find((a) => a.id === id);
const newest = (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
const byKind = (kind, pred = () => true) => allAssets().filter((a) => a.kind === kind && pred(a)).sort(newest);
const latest = (kind, pred) => byKind(kind, pred)[0];
const approvedOf = (kind, pred) => byKind(kind, (a) => a.status === "approved" && (!pred || pred(a)))[0];
const approvable = (a) =>
  a && ["candidate", "review"].includes(a.status) && a.qa?.decision !== "reject" &&
  !["unsafe", "irrelevant"].includes(a.screening?.category);

const urlCache = new Map();
const urlReady = new Map(); // resolved blob URLs, so re-renders can set src synchronously
function assetUrl(id) {
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

// JSON outputs (layout_plan, component_specs) are read as text and parsed once per asset.
const jsonCache = new Map();
function assetJson(id) {
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

function assetImg(id, alt = "", cls = "") {
  const ready = urlReady.get(`${pid()}:${id}`);
  if (ready) return h("img", { alt, class: cls || null, decoding: "async", src: ready });
  const img = h("img", { alt, class: `${cls} loading`.trim(), decoding: "async" });
  assetUrl(id)
    .then((u) => {
      img.src = u;
      img.classList.remove("loading");
    })
    .catch((e) => {
      img.replaceWith(h("div", { class: "img-error" }, `Image unavailable: ${e.message}`));
    });
  return img;
}

function lightbox(id, alt) {
  const close = () => {
    modal.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => e.key === "Escape" && close();
  const modal = h(
    "div",
    { class: "modal lightbox", role: "dialog", "aria-modal": "true", "aria-label": alt || "Image", onclick: (e) => e.target === modal && close() },
    h("div", { class: "modal-box" }, assetImg(id, alt), h("div", { class: "row", style: "justify-content:center" }, h("button", { type: "button", class: "btn", onclick: close }, "Close"))),
  );
  document.addEventListener("keydown", onKey);
  document.body.append(modal);
}

/* ---------------- Busy + jobs ---------------- */

const isBusy = (key) => S.busy.has(key);
const runningJobs = () => [...S.jobs.values()].filter((j) => j.status === "running").length;
const jobRunning = (key) => S.jobs.get(key)?.status === "running";
const anyJobRunning = (prefix) => [...S.jobs.entries()].some(([key, j]) => key.startsWith(prefix) && j.status === "running");

async function act(key, fn) {
  if (S.busy.has(key)) return;
  S.busy.add(key);
  render();
  try {
    await fn();
  } catch (e) {
    toastErr(e);
  } finally {
    S.busy.delete(key);
    render();
  }
}

function jobKey(operation, options = {}) {
  if (operation === "component_sheet") return `sheet:${options.componentId}:${options.viewType || "full_sheet"}`;
  if (operation === "component_specs") return `specs:${options.componentId}`;
  return { screen_assets: "screen", venue_isometric: "iso", showcase: "showcase", venue_360: "v360", panorama: "pano" }[operation] || operation;
}

function rememberViewType(job) {
  if (job.operation !== "component_sheet") return;
  const map = store.get(k("views"), {});
  map[job.id] = job.options?.viewType || "full_sheet";
  store.set(k("views"), map);
}
const viewTypeOf = (asset) => store.get(k("views"), {})[asset.jobId];

function finishEntry(entry, job) {
  entry.jobId = job.id;
  entry.status = job.status === "failed" ? "failed" : "done";
  entry.error = job.error?.message || null;
  entry.code = job.error?.code || null;
  entry.diag = job.error?.captureDiagnostics || null;
  entry.result = job.result || null;
  if (entry.status === "failed") toast(entry.error || "The job failed", { type: "error", title: "Generation failed" });
}

async function pollJob(job, entry, projectId) {
  let j = job;
  let failures = 0;
  while (!TERMINAL.has(j.status)) {
    await sleep(POLL_MS);
    if (pid() !== projectId) throw new Error("Project changed");
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

const RETRYABLE_CODES = new Set(["ACTIVE_JOB_LIMIT", "RATE_LIMITED", "REVISION_CONFLICT"]);
const retryable = (e) => !!e && (e.status === 429 || RETRYABLE_CODES.has(e.code));

function runJob(key, operation, options = {}, { quietRetry = false } = {}) {
  const cur = S.jobs.get(key);
  if (cur?.status === "running") return cur.promise;
  const projectId = pid();
  const requestKey = uuid(); // one key per click, reused on retry
  const entry = { status: "running", start: Date.now(), operation, options };
  S.jobs.set(key, entry);
  refresh();
  entry.promise = (async () => {
    try {
      const data = await write((revision) =>
        api("POST", `/projects/${encodeURIComponent(projectId)}/jobs`, { revision, requestKey, operation, options }),
      );
      entry.jobId = data.job.id;
      rememberViewType({ ...data.job, options });
      await refreshProject().catch(() => {});
      const job = await pollJob(data.job, entry, projectId);
      finishEntry(entry, job);
    } catch (e) {
      entry.status = "failed";
      entry.error = e.message;
      entry.code = e.code;
      entry.httpStatus = e.status;
      if (pid() === projectId && !(quietRetry && retryable(e))) toastErr(e, "Could not run this step");
    } finally {
      if (pid() === projectId) refresh();
    }
    return entry;
  })();
  return entry.promise;
}

// Runs a job, waiting and retrying while the server is busy (two active jobs, rate limit).
async function runJobRetry(key, operation, options, tries = 8) {
  let entry;
  for (let i = 0; i < tries; i++) {
    entry = await runJob(key, operation, options, { quietRetry: i < tries - 1 });
    if (entry.status !== "failed" || !retryable({ code: entry.code, status: entry.httpStatus })) return entry;
    if (i < tries - 1) await sleep(4000);
  }
  return entry;
}

async function resumeJobs() {
  const projectId = pid();
  for (const id of S.project?.activeJobs || []) {
    try {
      const job = (await api("GET", `/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(id)}`)).job;
      if (TERMINAL.has(job.status)) continue;
      const key = jobKey(job.operation, job.options);
      const entry = { status: "running", start: Date.parse(job.createdAt) || Date.now(), operation: job.operation, options: job.options, jobId: job.id };
      S.jobs.set(key, entry);
      rememberViewType(job);
      entry.promise = (async () => {
        try {
          finishEntry(entry, await pollJob(job, entry, projectId));
        } catch (e) {
          entry.status = "failed";
          entry.error = e.message;
        }
        if (pid() === projectId) refresh();
        return entry;
      })();
    } catch {
      /* job not visible; ignore */
    }
  }
}

async function approveAsset(id, label = "Approved", { quiet = false } = {}) {
  await write((revision) =>
    api("POST", `/projects/${encodeURIComponent(pid())}/assets/${encodeURIComponent(id)}/approve`, { revision, reason: APPROVE_REASON }),
  );
  if (!quiet) toast(label, { type: "success", title: "Saved" });
}

async function screenPending() {
  for (let i = 0; i < 4; i++) {
    const cur = S.jobs.get("screen");
    if (cur?.status === "running") {
      await cur.promise;
      continue;
    }
    if (!allAssets().some((a) => a.status === "pending_screen")) return;
    const entry = await runJob("screen", "screen_assets", {});
    if (entry.status === "failed") return;
  }
}

/* ---------------- Image capture ---------------- */

async function normalizeFile(file) {
  // Re-encode to JPEG (fixes orientation, HEIC-in-Safari, and oversized files). Falls back to the original.
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

function pickFile({ capture } = {}) {
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
    // Some browsers never fire change on cancel; the promise just stays pending, which is harmless.
  });
}

function openCamera(title) {
  return new Promise((resolve) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // No live camera (insecure context or unsupported): use the native camera picker.
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
    const msg = h("div", { class: "viewer-msg" }, h("span", { class: "spinner" }));
    const shutter = h("button", { type: "button", class: "shutter", "aria-label": "Take photo", disabled: true });
    const modal = h(
      "div",
      { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title },
      h(
        "div",
        { class: "modal-box" },
        h("div", { class: "row-between" }, h("h2", { style: "margin:0" }, title), h("span", { class: "muted small" }, "Hold the phone level")),
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
              class: "btn btn-ghost right",
              onclick: async () => {
                stream?.getTracks().forEach((t) => t.stop());
                const f = await pickFile({ capture: true });
                finish(f);
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

/* ---------------- Venue slots ---------------- */

function saveSlotMap() {
  const map = {};
  for (const s of SLOTS) if (S.slots[s.view]?.assetId) map[s.view] = S.slots[s.view].assetId;
  store.set(k("slots"), map);
}

function syncSlots() {
  const map = pid() ? store.get(k("slots"), {}) : {};
  for (const s of SLOTS) {
    const cur = S.slots[s.view] || {};
    let id = cur.assetId && assetById(cur.assetId) ? cur.assetId : map[s.view];
    if (id && !assetById(id)) id = null;
    if (!id) id = latest("venue", (a) => a.view === s.view)?.id || null;
    S.slots[s.view] = { ...cur, assetId: id };
  }
}

const slotAsset = (view) => assetById(S.slots[view]?.assetId);
const approvedGroundIds = () => GROUND.map(slotAsset).filter((a) => a?.status === "approved").map((a) => a.id);
function venueAssetIdsForIsometric() {
  const ids = approvedGroundIds();
  const sat = slotAsset("satellite");
  if (sat?.status === "approved") ids.push(sat.id);
  return ids.slice(0, 5);
}

function setSlotBlob(view, blob) {
  if (!blob) return;
  const slot = S.slots[view] || {};
  if (slot.url) URL.revokeObjectURL(slot.url);
  S.slots[view] = { ...slot, blob, url: URL.createObjectURL(blob), error: null };
  render();
}

// Uploads every slot that holds a new photo. Returns { sent, rejected }.
async function uploadSlots() {
  await ensureProject();
  const pending = SLOTS.filter((s) => S.slots[s.view]?.blob);
  let rejectedCount = 0;
  if (pending.length) {
    const data = await write((revision) => {
      const fd = new FormData();
      pending.forEach((s) => fd.append("images", S.slots[s.view].blob, `${s.view}.jpg`));
      fd.append("kind", "venue");
      fd.append("views", JSON.stringify(pending.map((s) => s.view)));
      fd.append("revision", String(revision));
      return api("POST", `/projects/${encodeURIComponent(pid())}/assets`, undefined, { form: fd });
    });
    const rejected = new Map((data.rejected || []).map((r) => [r.index, r]));
    let next = 0;
    pending.forEach((s, i) => {
      const slot = S.slots[s.view];
      if (rejected.has(i)) {
        slot.error = rejected.get(i).reason || "Photo was rejected";
        return;
      }
      const a = (data.accepted || [])[next++];
      if (!a) return;
      if (slot.url) URL.revokeObjectURL(slot.url);
      Object.assign(slot, { blob: null, url: null, assetId: a.id, error: null });
    });
    saveSlotMap();
    rejectedCount = rejected.size;
    if (rejected.size) toast(`${rejected.size} photo(s) could not be uploaded. See the slot for details.`, { type: "error", title: "Upload" });
    render();
  }
  return { sent: pending.length, rejected: rejectedCount };
}

async function checkPhotos() {
  const { sent } = await uploadSlots();
  if (allAssets().some((a) => a.status === "pending_screen")) await screenPending();
  else if (!sent) toast("All photos are already checked", { title: "Nothing to check" });
}

/* ---------------- Brief ---------------- */

function briefDraft() {
  if (!S.briefDraft) {
    const b = S.project?.brief || {};
    S.briefDraft = {
      description: b.description || "",
      style: b.style || "",
      palette: [...(b.palette || [])],
      constraints: [...(b.constraints || [])],
    };
  }
  return S.briefDraft;
}

async function saveBrief() {
  await ensureProject();
  const d = briefDraft();
  const brief = {
    description: d.description.trim().slice(0, 8000),
    ceremony: S.project.brief?.ceremony || "",
    style: d.style.trim().slice(0, 200),
    palette: d.palette.slice(0, 8),
    constraints: d.constraints.slice(0, 30),
  };
  const cur = S.project.brief || {};
  const same =
    brief.description === (cur.description || "") &&
    brief.style === (cur.style || "") &&
    JSON.stringify(brief.palette) === JSON.stringify(cur.palette || []) &&
    JSON.stringify(brief.constraints) === JSON.stringify(cur.constraints || []);
  if (same) return;
  await write((revision) => api("PATCH", `/projects/${encodeURIComponent(pid())}`, { revision, changes: { brief } }));
}

/* ---------------- Shapes / geometry ---------------- */

function loadShapes() {
  S.shapes = [];
  S.draft = null;
  S.selected = null;
  if (!pid()) return;
  const saved = store.get(k("shapes"), null);
  if (Array.isArray(saved)) {
    S.shapes = saved.filter((s) => s && ELEMENT[s.type] && Array.isArray(s.points) && s.points.length >= 3);
    return;
  }
  // Rebuild from the server canvas if local drawing data is missing.
  const regions = S.project?.canvas?.regions || [];
  const comps = S.project?.components || [];
  S.shapes = regions
    .filter((r) => r.action === "keep_clear" || (r.action === "place" && ELEMENT[r.componentId]))
    .map((r, i) => {
      const type = r.action === "keep_clear" ? "keep_clear" : r.componentId;
      return { id: uuid(), type, points: r.points, label: `${ELEMENT[type].label} ${i + 1}`, description: type === "keep_clear" ? "" : comps.find((c) => c.id === type)?.description || "" };
    });
}
const saveShapes = () => pid() && store.set(k("shapes"), S.shapes);

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function inside(p, poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
}
const onSeg = (a, b, p) =>
  Math.abs(cross(a, b, p)) < 1e-9 &&
  p[0] >= Math.min(a[0], b[0]) - 1e-9 && p[0] <= Math.max(a[0], b[0]) + 1e-9 &&
  p[1] >= Math.min(a[1], b[1]) - 1e-9 && p[1] <= Math.max(a[1], b[1]) + 1e-9;
const segX = (a, b, c, d) =>
  (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) ||
  onSeg(a, b, c) || onSeg(a, b, d) || onSeg(c, d, a) || onSeg(c, d, b);
const overlap = (a, b) =>
  a.some((p) => inside(p, b)) || b.some((p) => inside(p, a)) ||
  a.some((p, i) => b.some((q, j) => segX(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length])));
const area = (pts) => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0)) / 2;

function shapeProblems() {
  const problems = [];
  const clear = S.shapes.filter((s) => s.type === "keep_clear");
  for (const s of S.shapes) {
    if (s.type === "keep_clear") continue;
    const hit = clear.find((c) => overlap(s.points, c.points));
    if (hit) problems.push(`"${s.label}" overlaps keep-clear area "${hit.label}".`);
  }
  if (S.shapes.length > 30) problems.push("Use at most 30 shapes.");
  return problems;
}

function buildComponents() {
  const types = ELEMENTS.map((e) => e.type).filter((t) => t !== "keep_clear" && S.shapes.some((s) => s.type === t));
  const palette = (S.project?.brief?.palette || []).slice(0, 8);
  return types.map((t) => {
    const existing = (S.project?.components || []).find((c) => c.id === t);
    const descs = [...new Set(S.shapes.filter((s) => s.type === t).map((s) => (s.description || "").trim()).filter(Boolean))];
    const description = (descs.join("; ") || existing?.description || `${ELEMENT[t].label} styled to match the wedding brief`).slice(0, 2000);
    const c = { id: t, category: t, description, palette, referenceAssetIds: [...(existing?.referenceAssetIds || [])] };
    if (existing?.materials?.length) c.materials = [...existing.materials];
    if (existing?.dimensions) c.dimensions = { ...existing.dimensions };
    return c;
  });
}

const normComp = (c) => JSON.stringify({
  id: c.id, category: c.category, description: c.description, palette: c.palette || [],
  materials: c.materials || [], dimensions: c.dimensions || null, referenceAssetIds: c.referenceAssetIds || [],
});
const stripComp = (c) => {
  const { masterAssetId, ...rest } = c;
  return rest;
};
function designDirty() {
  const next = buildComponents().map(normComp).sort();
  const cur = (S.project?.components || []).map(normComp).sort();
  return JSON.stringify(next) !== JSON.stringify(cur);
}

async function saveDesign() {
  if (!S.shapes.some((s) => s.type !== "keep_clear")) throw new Error("Place at least one element (for example a Mandap) before saving.");
  const problems = shapeProblems();
  if (problems.length) throw new Error(problems.join(" "));
  if (!designDirty()) {
    toast("Design is up to date", { title: "Saved" });
    return;
  }
  const lostMasters = (S.project.components || []).filter((c) => c.masterAssetId).length;
  const components = buildComponents();
  await write((revision) => api("PATCH", `/projects/${encodeURIComponent(pid())}`, { revision, changes: { components } }));
  const keptMasters = (S.project.components || []).filter((c) => c.masterAssetId).length;
  toast(
    keptMasters < lostMasters
      ? "Design saved. Changed elements need new design sheets."
      : `Design saved with ${components.length} element${components.length === 1 ? "" : "s"}.`,
    { type: "success", title: "Saved" },
  );
}

function buildCanvas() {
  const iso = approvedOf("venue_isometric");
  if (!iso) throw new Error("Approve a venue overview first (step 2).");
  const comps = new Set((S.project.components || []).map((c) => c.id));
  const missing = S.shapes.filter((s) => s.type !== "keep_clear" && !comps.has(s.type));
  if (missing.length) throw new Error(`Save the layout in step 3 first ("${missing[0].label}" is not saved).`);
  const problems = shapeProblems();
  if (problems.length) throw new Error(problems.join(" "));
  const r5 = (n) => Math.min(1, Math.max(0, Math.round(n * 100000) / 100000));
  const regions = S.shapes.map((s, i) => ({
    id: `r-${i + 1}`,
    action: s.type === "keep_clear" ? "keep_clear" : "place",
    ...(s.type === "keep_clear" ? {} : { componentId: s.type }),
    points: s.points.slice(0, 64).map(([x, y]) => [r5(x), r5(y)]),
  }));
  return { baseAssetId: iso.id, regions, strokes: [] };
}

async function saveCanvas() {
  const canvas = buildCanvas();
  const cur = S.project.canvas;
  if (cur && cur.baseAssetId === canvas.baseAssetId && JSON.stringify(cur.regions) === JSON.stringify(canvas.regions) && !(cur.strokes || []).length) return;
  await write((revision) => api("PATCH", `/projects/${encodeURIComponent(pid())}`, { revision, changes: { canvas } }));
}

/* ---------------- Components ---------------- */

const masterOf = (c) => {
  const a = c?.masterAssetId && assetById(c.masterAssetId);
  return a && a.status === "approved" ? a : null;
};
const allMasters = () => (S.project?.components || []).length > 0 && S.project.components.every(masterOf);

async function addReference(cid, blob) {
  if (!blob) return;
  const comp = S.project.components.find((c) => c.id === cid);
  if ((comp?.referenceAssetIds || []).length >= 4) throw new Error("At most four reference photos per element.");
  S.refs[cid] = { status: "uploading" };
  render();
  try {
    const data = await write((revision) => {
      const fd = new FormData();
      fd.append("images", blob, `${cid}-reference.jpg`);
      fd.append("kind", "decor");
      fd.append("views", JSON.stringify(["detail"]));
      fd.append("revision", String(revision));
      return api("POST", `/projects/${encodeURIComponent(pid())}/assets`, undefined, { form: fd });
    });
    const accepted = data.accepted?.[0];
    if (!accepted) throw new Error(data.rejected?.[0]?.reason || "The reference photo was rejected");
    S.refs[cid] = { assetId: accepted.id, status: "screening" };
    render();
    await screenPending();
    await linkReferenceIfApproved(cid);
  } catch (e) {
    S.refs[cid] = { ...(S.refs[cid] || {}), status: "error", error: e.message };
    throw e;
  }
}

async function linkReferenceIfApproved(cid) {
  const ref = S.refs[cid];
  const a = ref?.assetId && assetById(ref.assetId);
  if (!a) return;
  if (a.status === "approved") {
    const components = S.project.components.map((c) => {
      const base = stripComp(c);
      if (c.id !== cid) return base;
      return { ...base, referenceAssetIds: [...new Set([...(c.referenceAssetIds || []), a.id])].slice(-4) };
    });
    await write((revision) => api("PATCH", `/projects/${encodeURIComponent(pid())}`, { revision, changes: { components } }));
    delete S.refs[cid];
    toast("Reference photo added", { type: "success", title: "Saved" });
  } else if (a.status === "rejected") {
    S.refs[cid] = { ...ref, status: "error", error: a.screening?.reason || "The photo did not pass the check" };
  } else {
    S.refs[cid] = { ...ref, status: a.status };
  }
}

/* ---------------- Stitching ---------------- */

async function stitchPhotos() {
  S.panoBlock = null;
  const ground = approvedGroundIds();
  if (ground.length < 4)
    throw new Error(`Stitching needs 4 accepted ground photos (front, right, back, left) taken from one spot with overlap. You have ${ground.length}.`);
  const cur = S.project.venueCapture;
  if (!cur || JSON.stringify(cur.assetIds || []) !== JSON.stringify(ground)) {
    await write((revision) =>
      api("PUT", `/projects/${encodeURIComponent(pid())}/venue-capture`, {
        revision,
        capture: { assetIds: ground, sourceType: "photographs", sourceLabel: "Venue Studio capture", cameraPosition: "unknown", overlap: "unknown", displayHorizontalFovDeg: 120 },
      }),
    );
  }
  const { readiness } = await api("GET", `/projects/${encodeURIComponent(pid())}/venue-readiness`);
  if (!readiness?.canEnqueuePanorama) {
    S.panoBlock = readiness;
    throw new Error(`Photos are not ready to stitch: ${(readiness?.blockers || []).map((b) => BLOCKER_TEXT[b] || b).join("; ")}`);
  }
  await runJob("pano", "panorama", {});
}

/* ---------------- 360 viewer ---------------- */

// Self-contained 2D-canvas "look around" viewer for wide panoramas (no WebGL, no CDN).
function loadImage(url, timeoutMs = 30000) {
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

const viewerUrlCache = new Map();
function viewerSource(id) {
  const key = `${pid()}:${id}`;
  if (!viewerUrlCache.has(key)) {
    const p = (async () => {
      const img = await loadImage(await assetUrl(id));
      const w = img.naturalWidth;
      const hgt = img.naturalHeight;
      if (!w || !hgt) throw new Error("The 360 image is empty");
      if (w <= MAX_VIEWER_WIDTH) return { img, w, h: hgt };
      // Downscale very large panoramas once; the canvas itself is the draw source.
      const c = document.createElement("canvas");
      c.width = MAX_VIEWER_WIDTH;
      c.height = Math.round(hgt * (MAX_VIEWER_WIDTH / w));
      const ctx = c.getContext("2d");
      if (!ctx) return { img, w, h: hgt };
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return { img: c, w: c.width, h: c.height };
    })();
    p.catch(() => viewerUrlCache.delete(key));
    viewerUrlCache.set(key, p);
  }
  return viewerUrlCache.get(key);
}

const VIEW_STATE = new Map(); // keeps yaw/zoom across re-renders
const AUTO_SPEED = 1 / 90; // auto-rotate: one full turn in 90 s
const reducedMotion = () => {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

function viewer(assetId, mode) {
  const wrapX = mode === "ai"; // the AI 360 wraps; a stitched panorama has edges
  const box = h("div", {
    class: "viewer",
    role: "region",
    tabindex: "0",
    "aria-label": `${mode === "ai" ? "AI-generated 360 view" : "Stitched panorama"}. Drag, use the arrow keys, or the zoom buttons to look around.`,
  });
  const canvas = h("canvas", { class: "viewer-canvas", "aria-hidden": "true" });
  const msg = h("div", { class: "viewer-msg" });
  const zIn = h("button", { type: "button", class: "viewer-btn", "aria-label": "Zoom in", title: "Zoom in" }, "+");
  const zOut = h("button", { type: "button", class: "viewer-btn", "aria-label": "Zoom out", title: "Zoom out" }, "−");
  const fsBtn = h("button", { type: "button", class: "viewer-btn viewer-btn-text", "aria-label": "Fullscreen" }, "Fullscreen");
  const hint = h("div", { class: "viewer-hint", "aria-hidden": "true" }, "Drag to look around");
  box.append(canvas, h("div", { class: "viewer-ctrls" }, zOut, zIn, fsBtn), hint, msg);
  canvas.style.touchAction = "pan-y";

  const key = `${pid()}:${assetId}`;
  const saved = VIEW_STATE.get(key);
  const v = {
    src: null, yaw: saved?.yaw ?? 0, py: saved?.py ?? 0.5, zoom: saved?.zoom ?? 1,
    W: 0, H: 0, dpr: 1, dir: 1, idleUntil: 0, last: 0, raf: 0, dead: false, attached: false,
    dirty: true, needSize: true, pointers: new Map(), pinch: null,
  };
  const ctx = canvas.getContext("2d");
  const reduce = reducedMotion();

  const geom = () => {
    const s = Math.max(v.H / v.src.h, v.W / v.src.w) * v.zoom; // always fills the box: no letterboxing
    return { dw: v.src.w * s, dh: v.src.h * s };
  };
  const maxYaw = () => {
    const { dw } = geom();
    return Math.max(0, (dw - v.W) / dw);
  };
  const normalize = () => {
    v.zoom = clamp(v.zoom, 1, 2.5);
    v.py = clamp(v.py, 0, 1);
    if (wrapX) v.yaw = ((v.yaw % 1) + 1) % 1;
    else v.yaw = clamp(v.yaw, 0, maxYaw());
  };
  const kick = () => {
    if (!v.dead && !v.raf) v.raf = requestAnimationFrame(frame);
  };
  const poke = () => {
    v.idleUntil = performance.now() + 4000;
    v.dirty = true;
    hint.classList.add("gone");
    kick();
  };
  const resize = () => {
    const W = box.clientWidth;
    const H = box.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (W === v.W && H === v.H && dpr === v.dpr) return;
    Object.assign(v, { W, H, dpr });
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    v.dirty = true;
  };
  const paint = () => {
    if (!v.src || !ctx || !v.W || !v.H) return;
    normalize();
    const { dw, dh } = geom();
    const d = v.dpr;
    const oy = v.py * Math.max(0, dh - v.H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (wrapX) {
      // Draw the panorama side by side so the seam wraps seamlessly.
      for (let x = -((v.yaw * dw) % dw); x < v.W; x += dw)
        ctx.drawImage(v.src.img, Math.floor(x * d), Math.round(-oy * d), Math.ceil(dw * d) + 1, Math.round(dh * d));
    } else {
      ctx.drawImage(v.src.img, Math.round(-v.yaw * dw * d), Math.round(-oy * d), Math.round(dw * d), Math.round(dh * d));
    }
  };
  function frame(now) {
    v.raf = 0;
    if (v.dead) return;
    if (!box.isConnected) {
      if (v.attached) return destroy();
      return kick(); // not in the document yet
    }
    v.attached = true;
    if (v.needSize) {
      v.needSize = false;
      resize();
    }
    const dt = v.last ? Math.min(0.1, (now - v.last) / 1000) : 0;
    v.last = now;
    let moving = false;
    if (v.src && !reduce && !v.pointers.size && now > v.idleUntil && !document.hidden) {
      if (wrapX) v.yaw += dt * AUTO_SPEED;
      else {
        const max = maxYaw();
        if (max > 0) {
          v.yaw += dt * AUTO_SPEED * 2 * v.dir;
          if (v.yaw >= max) v.dir = -1;
          if (v.yaw <= 0) v.dir = 1;
        }
      }
      v.dirty = true;
      moving = true;
    }
    if (v.dirty && v.src) {
      paint();
      v.dirty = false;
      VIEW_STATE.set(key, { yaw: v.yaw, py: v.py, zoom: v.zoom });
    }
    if (moving || !v.src || !reduce || v.dirty) kick();
  }
  const zoomAt = (z, cx = v.W / 2, cy = v.H / 2) => {
    if (!v.src || !v.W) return;
    const b = geom();
    const oy = v.py * Math.max(0, b.dh - v.H);
    const u = (v.yaw * b.dw + cx) / b.dw;
    const w = (oy + cy) / b.dh;
    v.zoom = clamp(z, 1, 2.5);
    const a = geom();
    v.yaw = (u * a.dw - cx) / a.dw;
    const slack = a.dh - v.H;
    v.py = slack > 0 ? (w * a.dh - cy) / slack : 0.5;
    canvas.style.touchAction = v.zoom > 1.01 ? "none" : "pan-y";
    poke();
  };
  const local = (x, y) => {
    const r = canvas.getBoundingClientRect();
    return [x - r.left, y - r.top];
  };

  const onDown = (e) => {
    if (!v.src) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {
      /* capture unsupported */
    }
    v.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (v.pointers.size === 2) {
      const [a, b] = [...v.pointers.values()];
      v.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, zoom: v.zoom };
    }
    box.classList.add("grabbing");
    poke();
  };
  const onMove = (e) => {
    const p = v.pointers.get(e.pointerId);
    if (!p || !v.src) return;
    const nx = e.clientX;
    const ny = e.clientY;
    v.pointers.set(e.pointerId, [nx, ny]);
    if (v.pointers.size >= 2 && v.pinch) {
      const [a, b] = [...v.pointers.values()];
      const [cx, cy] = local((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      zoomAt((v.pinch.zoom * Math.hypot(a[0] - b[0], a[1] - b[1])) / v.pinch.d, cx, cy);
      return;
    }
    const { dw, dh } = geom();
    v.yaw -= (nx - p[0]) / dw;
    const slack = dh - v.H;
    if (slack > 0) v.py -= (ny - p[1]) / slack;
    poke();
  };
  const onUp = (e) => {
    v.pointers.delete(e.pointerId);
    if (v.pointers.size < 2) v.pinch = null;
    if (!v.pointers.size) box.classList.remove("grabbing");
    poke();
  };
  const onWheel = (e) => {
    if (!v.src) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : 1);
    // At the zoom limits let the page scroll instead of trapping the wheel.
    if ((dy > 0 && v.zoom <= 1.001) || (dy < 0 && v.zoom >= 2.499)) return;
    e.preventDefault();
    const [cx, cy] = local(e.clientX, e.clientY);
    zoomAt(v.zoom * Math.exp(-dy * 0.0015), cx, cy);
  };
  const onKey = (e) => {
    if (!v.src) return;
    const step = { ArrowLeft: [-0.025, 0], ArrowRight: [0.025, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] }[e.key];
    if (step) {
      e.preventDefault();
      v.yaw += step[0] / v.zoom;
      v.py += step[1];
      poke();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomAt(v.zoom * 1.25);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomAt(v.zoom / 1.25);
    } else if (e.key === "Escape" && box.classList.contains("viewer-max")) {
      e.stopPropagation();
      toggleFs();
    }
  };
  const setFsLabel = () => {
    const on = fsElement() === box || box.classList.contains("viewer-max");
    fsBtn.textContent = on ? "Exit fullscreen" : "Fullscreen";
    fsBtn.setAttribute("aria-label", on ? "Exit fullscreen" : "Fullscreen");
    v.needSize = true;
    v.dirty = true;
    kick();
  };
  const pseudoFs = (on) => {
    box.classList.toggle("viewer-max", on);
    document.body.classList.toggle("no-scroll", on);
    setFsLabel();
  };
  function toggleFs() {
    poke();
    if (box.classList.contains("viewer-max")) return pseudoFs(false);
    if (fsElement() === box) {
      try {
        const r = (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        r?.catch?.(() => {});
      } catch {
        /* ignore */
      }
      return;
    }
    const req = box.requestFullscreen || box.webkitRequestFullscreen;
    if (!req) return pseudoFs(true); // e.g. iPhone Safari: fill the window instead
    try {
      const r = req.call(box);
      r?.catch?.(() => pseudoFs(true));
    } catch {
      pseudoFs(true);
    }
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  box.addEventListener("wheel", onWheel, { passive: false });
  box.addEventListener("keydown", onKey);
  zIn.addEventListener("click", () => zoomAt(v.zoom * 1.25));
  zOut.addEventListener("click", () => zoomAt(v.zoom / 1.25));
  fsBtn.addEventListener("click", toggleFs);
  document.addEventListener("fullscreenchange", setFsLabel);
  document.addEventListener("webkitfullscreenchange", setFsLabel);
  const onResize = () => {
    v.needSize = true;
    kick();
  };
  let ro = null;
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(onResize);
    ro.observe(box);
  }
  window.addEventListener("resize", onResize);

  function destroy() {
    if (v.dead) return;
    v.dead = true;
    if (v.raf) cancelAnimationFrame(v.raf);
    ro?.disconnect();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("fullscreenchange", setFsLabel);
    document.removeEventListener("webkitfullscreenchange", setFsLabel);
    if (box.classList.contains("viewer-max")) document.body.classList.remove("no-scroll");
  }

  const load = () => {
    msg.hidden = false;
    msg.className = "viewer-msg";
    msg.replaceChildren(h("span", { class: "spinner", "aria-hidden": "true" }), h("span", null, "Loading 360 view"));
    viewerSource(assetId)
      .then((src) => {
        if (v.dead) return;
        v.src = src;
        msg.hidden = true;
        v.needSize = true;
        v.dirty = true;
        kick();
      })
      .catch((e) => {
        if (v.dead) return;
        msg.className = "viewer-msg viewer-err";
        msg.replaceChildren(
          h(
            "div",
            { class: "stack", style: "align-items:center;gap:10px", role: "alert" },
            h("strong", null, "The 360 view could not be shown"),
            h("span", { class: "small" }, e?.message || String(e)),
            h("div", { class: "row", style: "justify-content:center" }, btn("Try again", load, { small: true }), btn("Open flat image", () => lightbox(assetId, "360 view"), { small: true, ghost: true })),
          ),
        );
      });
  };
  load();
  kick();
  S.viewers.push({ destroy });
  return box;
}

function destroyViewers() {
  for (const v of S.viewers) {
    try {
      v.destroy();
    } catch {
      /* ignore */
    }
  }
  S.viewers = [];
}

/* ---------------- AI layout drawing ---------------- */

const planLoop = { raf: 0, figures: new Set() };
const zoneLabel = (z) => {
  if (z.componentId === "dining") return "Seating & dining";
  const l = z.label;
  return l && l.toLowerCase() !== z.componentId.toLowerCase() && !l.includes("_") ? l : ELEMENT[z.componentId]?.label || z.componentId;
};
const centroid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const animActive = () => !!S.aiAnim && !S.aiAnim.finished;
const animElapsed = (a) => (a.finished ? Infinity : a.start ? Date.now() - a.start : 0);

function normalizePlan(raw) {
  const pts = (p) =>
    Array.isArray(p) && p.length >= 3 && p.length <= 64 && p.every((q) => Array.isArray(q) && q.length === 2 && q.every((n) => Number.isFinite(n)))
      ? p.map(([x, y]) => [clamp(x, 0, 1), clamp(y, 0, 1)])
      : null;
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const zones = (Array.isArray(raw?.zones) ? raw.zones : [])
    .map((z) => ({ componentId: str(z?.componentId, 60), label: str(z?.label, 80), reason: str(z?.reason, 300), points: pts(z?.points) }))
    .filter((z) => z.points && z.componentId);
  const keepClear = (Array.isArray(raw?.keepClear) ? raw.keepClear : [])
    .map((z) => ({ label: str(z?.label, 80) || "Keep clear", points: pts(z?.points) }))
    .filter((z) => z.points);
  return { zones, keepClear, summary: str(raw?.summary, 600) };
}

async function runLayoutPlan(baseAssetId, d) {
  const options = { baseAssetId };
  const entry = d ? await demoRunJob(d, "layout_plan", "layout_plan", options) : await runJobRetry("layout_plan", "layout_plan", options);
  if (entry.status === "failed") throw new ApiError(entry.error || "The AI layout plan failed", entry.code);
  const a = latest("layout_plan", (x) => x.jobId === entry.jobId) || latest("layout_plan", (x) => !x.baseAssetId || x.baseAssetId === baseAssetId);
  if (!a) throw new Error("The AI layout plan finished without a result");
  const plan = normalizePlan(await assetJson(a.id));
  if (!plan.zones.length) throw new Error("The AI layout plan contained no usable zones");
  return plan;
}

// Replaces the drawing with the AI zones. Elements the AI did not place keep their current shape,
// so the saved element list (and any approved sheets) stays unchanged.
function applyPlan(plan, baseAssetId) {
  const comps = S.project?.components || [];
  const known = new Set(comps.map((c) => c.id));
  const descOf = (id) => comps.find((c) => c.id === id)?.description || "";
  const copy = (pts) => pts.map((q) => [...q]);
  const zones = plan.zones.filter((z) => known.has(z.componentId) && ELEMENT[z.componentId] && z.componentId !== "keep_clear");
  if (!zones.length) throw new Error("The AI layout did not place any of the saved elements");
  const placed = zones.map((z) => ({ id: uuid(), type: z.componentId, points: copy(z.points), label: zoneLabel(z), description: descOf(z.componentId), reason: z.reason, ai: true }));
  const aiShapes = [...placed];
  for (const c of comps)
    if (!placed.some((s) => s.type === c.id)) placed.push(...S.shapes.filter((s) => s.type === c.id).map((s) => ({ ...s, points: copy(s.points) })));
  const clear = plan.keepClear
    .filter((z) => !placed.some((s) => overlap(s.points, z.points)))
    .map((z) => ({ id: uuid(), type: "keep_clear", points: copy(z.points), label: z.label, description: "", ai: true }));
  S.prevShapes = S.shapes.map((s) => ({ ...s, points: copy(s.points) }));
  S.shapes = [...placed, ...clear].slice(0, 30);
  S.draft = null;
  S.selected = null;
  saveShapes();
  const anim = { baseAssetId, zones: aiShapes, keepClear: clear, summary: plan.summary, start: 0, finished: false, img: null };
  anim.total = anim.zones.length * ZONE_MS + anim.keepClear.length * CLEAR_MS + 400;
  S.aiAnim = anim;
  return anim;
}

function undoAiLayout() {
  if (!S.prevShapes) return;
  S.shapes = S.prevShapes;
  S.prevShapes = null;
  S.aiAnim = null;
  saveShapes();
  render();
  toast("The previous layout is back. Save the design to keep it.", { title: "Layout restored" });
}

// Waits for the base image, then starts the clock so the drawing is seen from the first stroke.
async function startAnim(anim) {
  try {
    anim.img = await loadImage(await assetUrl(anim.baseAssetId), 8000);
  } catch {
    /* draw over a plain background */
  }
  if (S.aiAnim !== anim) return;
  anim.start = Date.now();
  kickPlan();
}

function kickPlan() {
  if (!planLoop.raf) planLoop.raf = requestAnimationFrame(tickPlan);
}

function tickPlan() {
  planLoop.raf = 0;
  let more = false;
  const a = S.aiAnim;
  if (a && !a.finished) {
    if (!a.start) more = true;
    else if (Date.now() - a.start >= a.total) {
      a.finished = true;
      redraw();
      renderSide();
    } else {
      redraw();
      more = true;
    }
  }
  for (const f of planLoop.figures) {
    if (!f.canvas.isConnected) {
      if (f.seen || Date.now() - f.created > 3000) planLoop.figures.delete(f);
      else more = true;
      continue;
    }
    f.seen = true;
    paintFigure(f);
    if (!f.anim.finished) more = true;
  }
  if (a) {
    const t = animElapsed(a);
    document.querySelectorAll("[data-plan-at]").forEach((el) => el.classList.toggle("on", t >= Number(el.dataset.planAt)));
  }
  if (more) kickPlan();
}

window.addEventListener("resize", () => {
  for (const f of planLoop.figures) f.dirty = true;
  kickPlan();
});

function strokePartial(ctx, pts, prog) {
  const loop = [...pts, pts[0]];
  const lens = loop.slice(1).map((p, i) => Math.hypot(p[0] - loop[i][0], p[1] - loop[i][1]));
  let left = lens.reduce((s, l) => s + l, 0) * prog;
  ctx.beginPath();
  ctx.moveTo(loop[0][0], loop[0][1]);
  let tip = loop[0];
  for (let i = 0; i < lens.length; i++) {
    const [a, b] = [loop[i], loop[i + 1]];
    if (left >= lens[i]) {
      ctx.lineTo(b[0], b[1]);
      tip = b;
      left -= lens[i];
    } else {
      const f = lens[i] ? left / lens[i] : 0;
      tip = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      ctx.lineTo(tip[0], tip[1]);
      break;
    }
  }
  if (prog >= 1) ctx.closePath();
  return tip;
}

function planChip(ctx, x, y, text, dpr, alpha, dark) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `600 ${12 * dpr}px Inter, system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = 7 * dpr;
  const bh = 22 * dpr;
  ctx.fillStyle = dark ? "#000" : "#fff";
  ctx.fillRect(x - tw / 2 - pad, y - bh / 2, tw + pad * 2, bh);
  ctx.strokeStyle = dark ? "#fff" : "#000";
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(x - tw / 2 - pad, y - bh / 2, tw + pad * 2, bh);
  ctx.fillStyle = dark ? "#fff" : "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5 * dpr);
  ctx.restore();
}

// Draws the AI layout up to time t (ms): zones one by one, each outline stroked progressively.
function paintPlan(ctx, W, H, dpr, a, t, img) {
  ctx.clearRect(0, 0, W, H);
  if (img) ctx.drawImage(img, 0, 0, W, H);
  else {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, W, H);
  const items = [
    ...a.zones.map((z, i) => ({ z, t0: i * ZONE_MS, dur: ZONE_MS, clear: false, text: `${i + 1}  ${z.label}` })),
    ...a.keepClear.map((z, j) => ({ z, t0: a.zones.length * ZONE_MS + j * CLEAR_MS, dur: CLEAR_MS, clear: true, text: `Keep clear: ${z.label}` })),
  ];
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const it of items) {
    const local = t - it.t0;
    if (local < 0) break;
    const lin = clamp(local / (it.dur * 0.7), 0, 1);
    const prog = 1 - (1 - lin) * (1 - lin);
    const pts = it.z.points.map(([x, y]) => [x * W, y * H]);
    if (prog > 0.05) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = it.clear ? `rgba(0,0,0,${0.42 * prog})` : `rgba(255,255,255,${0.16 * prog})`;
      ctx.fill();
    }
    ctx.setLineDash(it.clear ? [8 * dpr, 6 * dpr] : []);
    const tip = strokePartial(ctx, pts, prog);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 4.5 * dpr;
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.2 * dpr;
    ctx.stroke();
    ctx.setLineDash([]);
    if (prog < 1) {
      ctx.beginPath();
      ctx.arc(tip[0], tip[1], 4.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    if (local >= it.dur * 0.55) {
      const [cx, cy] = centroid(pts);
      planChip(ctx, cx, cy, it.text, dpr, clamp((local - it.dur * 0.55) / (it.dur * 0.35), 0, 1), it.clear);
    }
  }
}

function paintFigure(f) {
  const img = f.anim.img;
  const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 9 / 16;
  const W = f.canvas.clientWidth || 640;
  const dpr = window.devicePixelRatio || 1;
  const cw = Math.max(1, Math.round(W * dpr));
  const ch = Math.max(1, Math.round(W * ratio * dpr));
  if (f.canvas.width !== cw || f.canvas.height !== ch) {
    f.canvas.width = cw;
    f.canvas.height = ch;
    f.dirty = true;
  }
  if (f.anim.finished && !f.dirty) return;
  const ctx = f.canvas.getContext("2d");
  if (!ctx) return;
  paintPlan(ctx, cw, ch, dpr, f.anim, animElapsed(f.anim), img);
  f.dirty = false;
}

function planList(a) {
  const t = animElapsed(a);
  const items = [
    ...a.zones.map((z, i) => ({ at: i * ZONE_MS + ZONE_MS * 0.55, title: `${i + 1}. ${z.label}`, text: z.reason })),
    ...a.keepClear.map((z, j) => ({ at: a.zones.length * ZONE_MS + j * CLEAR_MS + CLEAR_MS * 0.55, title: `Keep clear: ${z.label}`, clear: true })),
  ];
  const at = Math.max(0, a.total - 400);
  return h(
    "div",
    { class: "plan-list" },
    h(
      "ol",
      { class: "plan-items" },
      items.map((it) =>
        h(
          "li",
          { class: `plan-item${it.clear ? " clear" : ""}${t >= it.at ? " on" : ""}`, dataset: { planAt: String(it.at) } },
          h("span", { class: "plan-chip" }, it.title),
          it.text ? h("p", { class: "plan-reason" }, it.text) : null,
        ),
      ),
    ),
    a.summary ? h("p", { class: `plan-summary${t >= at ? " on" : ""}`, dataset: { planAt: String(at) } }, a.summary) : null,
  );
}

function planFigure(a) {
  const canvas = h("canvas", { class: "plan-canvas", role: "img", "aria-label": "The AI drawing the layout on the venue overview" });
  planLoop.figures.add({ canvas, anim: a, dirty: true, seen: false, created: Date.now() });
  kickPlan();
  return h(
    "div",
    { class: "plan-figure" },
    h("div", { class: "plan-stage" }, canvas),
    h("div", { class: "plan-side" }, h("p", { class: "figure-label" }, "AI layout"), planList(a)),
  );
}

async function aiDrawLayout() {
  const iso = approvedOf("venue_isometric");
  if (!iso) throw new Error("Approve a venue overview first (step 2).");
  if (S.shapes.some((s) => s.type !== "keep_clear") && designDirty()) await saveDesign();
  if (!(S.project?.components || []).length)
    throw new Error("Outline at least one element and describe it first, for example Seating & dining or a Mandap. The AI then decides where each one goes.");
  const own = S.shapes.some((s) => !s.ai) && S.demo?.projectId !== pid();
  if (own && !confirm("Replace your current layout with the AI layout? You can restore it afterwards.")) return;
  const plan = await runLayoutPlan(iso.id);
  const anim = applyPlan(plan, iso.id);
  try {
    if (designDirty()) await saveDesign();
  } catch (e) {
    undoAiLayout();
    throw e;
  }
  startAnim(anim);
  toast(`The AI placed ${anim.zones.length} zone${anim.zones.length === 1 ? "" : "s"}${anim.keepClear.length ? ` and ${anim.keepClear.length} keep-clear area${anim.keepClear.length === 1 ? "" : "s"}` : ""}.`, { type: "success", title: "AI layout" });
}

/* ---------------- Specifications ---------------- */

const compOf = (cid) => (S.project?.components || []).find((c) => c.id === cid);
const elLabel = (cid) => {
  const c = compOf(cid);
  return ELEMENT[c?.category]?.label || ELEMENT[cid]?.label || c?.category || cid;
};
const specAssetOf = (cid) => latest("component_specs", (a) => a.componentId === cid);
const isSpecSheet = (a) => !!a && (a.viewType === "spec" || viewTypeOf(a) === "spec");
const specDrawingOf = (cid) => latest("component_sheet", (a) => a.componentId === cid && isSpecSheet(a));
const isBoard = (a) => !!a && (a.viewType === "board" || viewTypeOf(a) === "board");
const boardOf = (cid) => latest("component_sheet", (a) => a.componentId === cid && isBoard(a));
const boardNotes = {}; // componentId -> vendor spec notes typed in the drawer

function normalizeSpecs(raw) {
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

function ftIn(ft) {
  const total = Math.round(ft * 12);
  const f = Math.floor(total / 12);
  const i = total % 12;
  if (!f) return `${i} in`;
  return i ? `${f} ft ${i} in` : `${f} ft`;
}
const inchesOf = (ft) => `${Math.round(ft * 12)} in`;
const cmOf = (ft) => `${Math.round(ft * 30.48)} cm`;
const dec1 = (n) => String(Math.round(n * 10) / 10);
function groupIN(n) {
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return (n < 0 ? "-" : "") + (rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3);
}
const inr = (n) => `₹${groupIN(n)}`;
const priceRange = (p) =>
  p?.low != null && p?.high != null ? (Math.round(p.low) === Math.round(p.high) ? inr(p.low) : `${inr(p.low)} – ${inr(p.high)}`) : "Not available";
const hasDims = (d) => !!(d && d.widthFt && d.depthFt && d.heightFt);
const dimsLine = (d) => (hasDims(d) ? `${ftIn(d.widthFt)} W x ${ftIn(d.depthFt)} D x ${ftIn(d.heightFt)} H` : "Size not available");
const footprint = (d) => (d?.widthFt && d?.depthFt ? `${dec1(d.widthFt * d.depthFt)} sq ft (${dec1(d.widthFt * d.depthFt * 0.09290304)} sq m)` : "");

function ensureSpecs(cid, { run = true, d = null } = {}) {
  const cur = S.specs[cid];
  if (cur?.data) return Promise.resolve(cur.data);
  if (cur?.promise) return cur.promise;
  if (!run && !specAssetOf(cid)) return Promise.resolve(null);
  const projectId = pid();
  const st = { status: "loading" };
  S.specs[cid] = st;
  const changed = () => {
    if (pid() !== projectId) return;
    renderDrawer();
    refreshSpecCards();
  };
  st.promise = (async () => {
    try {
      let a = specAssetOf(cid);
      if (!a) {
        st.status = "running";
        changed();
        const key = `specs:${cid}`;
        const options = { componentId: cid };
        const entry = d ? await demoRunJob(d, key, "component_specs", options) : await runJobRetry(key, "component_specs", options);
        if (entry.status === "failed") throw new Error(entry.error || "The specification could not be estimated");
        a = latest("component_specs", (x) => x.componentId === cid && x.jobId === entry.jobId) || specAssetOf(cid);
        if (!a) throw new Error("The specification finished without a result");
        st.status = "loading";
        changed();
      }
      const data = normalizeSpecs(await assetJson(a.id));
      Object.assign(st, { status: "done", data, assetId: a.id, error: null });
      return data;
    } catch (e) {
      Object.assign(st, { status: "error", error: e === DEMO_ABORT ? "The demo was left" : e?.message || String(e) });
      throw e;
    } finally {
      st.promise = null;
      changed();
    }
  })();
  return st.promise;
}

function specCardBody(cid) {
  const sp = S.specs[cid] || {};
  const s = sp.data;
  return [
    h("span", { class: "spec-card-title" }, elLabel(cid)),
    s
      ? [
          h("span", { class: "spec-card-line" }, dimsLine(s.dimensions)),
          footprint(s.dimensions) ? h("span", { class: "spec-card-line muted" }, `Footprint ${footprint(s.dimensions)}`) : null,
          h("span", { class: "spec-card-price" }, priceRange(s.priceInr)),
          h("span", { class: "hint" }, "AI estimate, excl. GST"),
        ]
      : h(
          "span",
          { class: "muted small" },
          sp.status === "running" || sp.status === "loading" ? "Loading specifications" : sp.status === "error" ? "Specifications unavailable. Open to try again." : "Open to estimate size and cost",
        ),
  ].flat(Infinity).filter(Boolean);
}

function specCard(cid) {
  const el = h("button", { type: "button", class: "spec-card", dataset: { specCard: cid }, "aria-label": `${elLabel(cid)}: open specifications`, onclick: () => openSpecs(cid) });
  el.replaceChildren(...specCardBody(cid));
  if (!S.specs[cid]?.data && !S.specs[cid]?.promise && S.specs[cid]?.status !== "error" && specAssetOf(cid)) ensureSpecs(cid, { run: false }).catch(() => {});
  return el;
}

function refreshSpecCards() {
  document.querySelectorAll("[data-spec-card]").forEach((el) => el.replaceChildren(...specCardBody(el.dataset.specCard)));
}

/* ---------------- Specifications drawer ---------------- */

let drawerEl = null;
let drawerSig = "";

function openSpecs(cid) {
  if (!compOf(cid)) return toast("This element is not part of the saved design.", { type: "error", title: "Specifications" });
  const first = !drawerEl;
  S.drawer = cid;
  drawerSig = "";
  renderDrawer();
  if (first) setTimeout(() => drawerEl?.close.focus(), 0);
  ensureSpecs(cid).catch(() => {});
}

function closeSpecs() {
  S.drawer = null;
  renderDrawer();
}

function onDrawerKey(e) {
  if (e.key === "Escape" && !document.querySelector(".lightbox")) closeSpecs();
}

function generateDrawing(cid, dims) {
  const dimensions = {
    widthFt: Math.round(clamp(dims.widthFt, 0.1, 300) * 100) / 100,
    depthFt: Math.round(clamp(dims.depthFt, 0.1, 300) * 100) / 100,
    heightFt: Math.round(clamp(dims.heightFt, 0.1, 300) * 100) / 100,
  };
  runJobRetry(`sheet:${cid}:spec`, "component_sheet", { componentId: cid, viewType: "spec", dimensions }).catch((e) => toastErr(e, "Dimensioned drawing"));
}

function generateBoard(cid, dims) {
  const dimensions = {};
  for (const key of ["widthFt", "depthFt", "heightFt"])
    if (Number.isFinite(dims?.[key])) dimensions[key] = Math.round(clamp(dims[key], 0.1, 300) * 100) / 100;
  const notes = (boardNotes[cid] || "").trim().slice(0, 1500);
  runJobRetry(`sheet:${cid}:board`, "component_sheet", {
    componentId: cid,
    viewType: "board",
    dimensions,
    ...(notes ? { specNotes: notes } : {}),
  }).catch((e) => toastErr(e, "Spec sheet"));
}

function boardBlock(cid, d, label) {
  const key = `sheet:${cid}:board`;
  const job = S.jobs.get(key);
  const running = job?.status === "running";
  const board = boardOf(cid);
  return h(
    "div",
    { class: "spec-block" },
    h("div", { class: "label" }, "Spec sheet"),
    h("p", { class: "hint", style: "margin:0" }, "Architectural presentation board for fabrication approval: plan, front, left, right, exploded and isometric views with dimensions, labels and schedules."),
    running ? jobProgress(key, "Drafting the presentation board") : job?.status === "failed" ? jobProgress(key, "") : null,
    board && !running
      ? h(
          "button",
          { type: "button", class: "spec-drawing", "aria-label": "Open the spec sheet full size", onclick: () => lightbox(board.id, `${label} spec sheet`) },
          assetImg(board.id, `${label} spec sheet`),
        )
      : null,
    board?.status === "rejected" ? h("p", { class: "qa" }, `The quality check flagged this board${board.qa?.reason ? `: ${board.qa.reason}` : ""}.`) : null,
    h("textarea", {
      class: "textarea",
      rows: "3",
      maxlength: "1500",
      placeholder: "Specs and notes: 5 alternating half arches, 8 ft clear walkway, lamp racks in side zones, 6 in platform rise, entry step at front",
      value: boardNotes[cid] || "",
      oninput: (e) => (boardNotes[cid] = e.target.value),
    }),
    h(
      "div",
      { class: "row" },
      btn(board ? "Generate new spec sheet" : "Generate spec sheet", () => generateBoard(cid, d), { primary: !board, busy: running, disabled: !hasDims(d) }),
    ),
  );
}

function specView(cid, s) {
  const d = s.dimensions;
  const label = elLabel(cid);
  const fact = (k, v) => h("div", { class: "spec-fact" }, h("div", { class: "hint" }, k), h("div", null, v));
  const key = `sheet:${cid}:spec`;
  const job = S.jobs.get(key);
  const running = job?.status === "running";
  const drawing = specDrawingOf(cid);
  return [
    s.name && s.name.toLowerCase() !== label.toLowerCase() ? h("h3", null, s.name) : null,
    s.summary ? h("p", { class: "muted", style: "margin:0" }, s.summary) : null,
    h(
      "div",
      { class: "spec-block" },
      h("div", { class: "label" }, "Dimensions"),
      hasDims(d)
        ? [
            h(
              "table",
              { class: "spec-table" },
              h("thead", null, h("tr", null, h("th", null, ""), h("th", null, "ft-in"), h("th", null, "Inches"), h("th", null, "cm"))),
              h(
                "tbody",
                null,
                [["Width", d.widthFt], ["Depth", d.depthFt], ["Height", d.heightFt]].map(([k, ft]) =>
                  h("tr", null, h("th", { scope: "row" }, k), h("td", null, ftIn(ft)), h("td", null, inchesOf(ft)), h("td", null, cmOf(ft))),
                ),
              ),
            ),
            h(
              "div",
              { class: "spec-lines" },
              h("div", null, h("span", { class: "hint" }, "W x D x H "), `${ftIn(d.widthFt)} x ${ftIn(d.depthFt)} x ${ftIn(d.heightFt)}`),
              h("div", null, h("span", { class: "hint" }, "In inches "), `${Math.round(d.widthFt * 12)} x ${Math.round(d.depthFt * 12)} x ${Math.round(d.heightFt * 12)} in`),
              h("div", null, h("span", { class: "hint" }, "In cm "), `${Math.round(d.widthFt * 30.48)} x ${Math.round(d.depthFt * 30.48)} x ${Math.round(d.heightFt * 30.48)} cm`),
              h("div", null, h("span", { class: "hint" }, "Footprint "), footprint(d)),
            ),
          ]
        : h("p", { class: "muted small", style: "margin:0" }, "Dimensions are not available for this element."),
    ),
    h(
      "div",
      { class: "spec-block spec-price" },
      h("div", { class: "label" }, "Estimated price"),
      h("div", { class: "price" }, priceRange(s.priceInr)),
      h("div", { class: "hint" }, "AI estimate, excl. GST"),
      s.priceBasis ? h("p", { class: "muted small", style: "margin:4px 0 0" }, s.priceBasis) : null,
    ),
    h(
      "div",
      { class: "spec-facts" },
      fact("Setup time", s.setupHours != null ? `${dec1(s.setupHours)} h` : "Not specified"),
      fact("Crew", s.crew != null ? `${Math.round(s.crew)} people` : "Not specified"),
      fact("Power", s.powerKw != null ? `${dec1(s.powerKw)} kW` : "Not specified"),
      fact("Lead time", s.leadTimeDays != null ? `${Math.round(s.leadTimeDays)} days` : "Not specified"),
    ),
    s.materials.length ? h("div", { class: "spec-block" }, h("div", { class: "label" }, "Materials"), h("ul", { class: "spec-ul" }, s.materials.map((m) => h("li", null, m)))) : null,
    s.billOfQuantities.length
      ? h(
          "div",
          { class: "spec-block" },
          h("div", { class: "label" }, "Bill of quantities"),
          h(
            "table",
            { class: "spec-table boq" },
            h("thead", null, h("tr", null, h("th", null, "Item"), h("th", null, "Qty"), h("th", null, "Unit"))),
            h("tbody", null, s.billOfQuantities.map((r) => h("tr", null, h("td", null, r.item), h("td", null, r.quantity != null ? String(r.quantity) : ""), h("td", null, r.unit)))),
          ),
        )
      : null,
    s.notes.length ? h("div", { class: "spec-block" }, h("div", { class: "label" }, "Notes"), h("ul", { class: "spec-ul" }, s.notes.map((n) => h("li", null, n)))) : null,
    h(
      "div",
      { class: "spec-block" },
      h("div", { class: "label" }, "Dimensioned drawing"),
      running ? jobProgress(key, "Drawing the dimensioned plan") : job?.status === "failed" ? jobProgress(key, "") : null,
      drawing && !running
        ? h(
            "button",
            { type: "button", class: "spec-drawing", "aria-label": "Open the dimensioned drawing full size", onclick: () => lightbox(drawing.id, `${label} dimensioned drawing`) },
            assetImg(drawing.id, `${label} dimensioned drawing`),
          )
        : null,
      drawing?.status === "rejected" ? h("p", { class: "qa" }, `The quality check flagged this drawing${drawing.qa?.reason ? `: ${drawing.qa.reason}` : ""}.`) : null,
      h(
        "div",
        { class: "row" },
        btn(drawing ? "Generate new drawing" : "Generate dimensioned drawing", () => generateDrawing(cid, d), { primary: !drawing, busy: running, disabled: !hasDims(d) }),
      ),
      !hasDims(d) ? h("p", { class: "hint", style: "margin:0" }, "A drawing needs the width, depth and height.") : null,
    ),
    boardBlock(cid, d, label),
  ];
}

function drawerContent(cid) {
  const sp = S.specs[cid] || {};
  const c = compOf(cid);
  const master = masterOf(c);
  const label = elLabel(cid);
  let body;
  if (sp.status === "done" && sp.data) body = specView(cid, sp.data);
  else if (sp.status === "error")
    body = h(
      "div",
      { class: "alert", role: "alert" },
      h("strong", null, "Could not load the specifications. "),
      sp.error || "",
      " ",
      h("button", { type: "button", class: "link-btn", onclick: () => { delete S.specs[cid]; drawerSig = ""; ensureSpecs(cid).catch(() => {}); renderDrawer(); } }, "Try again"),
    );
  else if (sp.status === "running" && S.jobs.get(`specs:${cid}`)?.status === "running") body = jobProgress(`specs:${cid}`, "Estimating sizes, materials and cost");
  else body = h("div", { class: "progress", role: "status" }, h("span", { class: "spinner", "aria-hidden": "true" }), sp.status === "running" ? "Estimating sizes, materials and cost" : "Loading specifications");
  return [
    master
      ? h("button", { type: "button", class: "drawer-thumb", "aria-label": `Open the ${label} design full size`, onclick: () => lightbox(master.id, label) }, assetImg(master.id, `${label} design`))
      : null,
    c?.description ? h("p", { class: "muted small", style: "margin:0" }, c.description) : null,
    body,
  ];
}

function renderDrawer() {
  const cid = S.drawer;
  if (!cid || !S.project || !compOf(cid)) {
    if (cid) S.drawer = null;
    if (drawerEl) {
      drawerEl.root.remove();
      drawerEl = null;
      drawerSig = "";
      document.body.classList.remove("drawer-open");
      document.removeEventListener("keydown", onDrawerKey);
    }
    return;
  }
  const sp = S.specs[cid] || {};
  const dj = S.jobs.get(`sheet:${cid}:spec`);
  const sj = S.jobs.get(`specs:${cid}`);
  const drawing = specDrawingOf(cid);
  const bj = S.jobs.get(`sheet:${cid}:board`);
  const board = boardOf(cid);
  const sig = JSON.stringify([pid(), cid, sp.status, sp.assetId, sp.error, dj?.status, dj?.error, sj?.status, drawing?.id, drawing?.status, bj?.status, bj?.error, board?.id, board?.status, masterOf(compOf(cid))?.id]);
  if (drawerEl && sig === drawerSig) return;
  drawerSig = sig;
  if (!drawerEl) {
    const close = h("button", { type: "button", class: "btn btn-sm", onclick: closeSpecs }, "Close");
    const title = h("h2", { id: "drawer-title", style: "margin:0" });
    const body = h("div", { class: "drawer-body" });
    const panel = h(
      "aside",
      { class: "drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "drawer-title" },
      h("div", { class: "drawer-head" }, h("div", null, h("p", { class: "eyebrow", style: "margin:0 0 4px" }, "Specifications"), title), close),
      body,
    );
    const root = h("div", { class: "drawer-root" }, h("div", { class: "drawer-backdrop", onclick: closeSpecs }), panel);
    drawerEl = { root, panel, body, title, close };
    document.body.append(root);
    document.body.classList.add("drawer-open");
    document.addEventListener("keydown", onDrawerKey);
  }
  drawerEl.title.textContent = elLabel(cid);
  drawerEl.body.replaceChildren(...[drawerContent(cid)].flat(Infinity).filter(Boolean));
}

/* ---------------- Clickable decor hotspots ---------------- */

const SVG_NS = "http://www.w3.org/2000/svg";
function hotspotZones() {
  const comps = new Set((S.project?.components || []).map((c) => c.id));
  return S.shapes.filter((s) => s.type !== "keep_clear" && comps.has(s.type) && s.points?.length >= 3);
}

// The complete-venue image with invisible-until-hover areas that open each element's specifications.
function hotspotImage(assetId, alt) {
  const wrap = h("div", { class: "hs-wrap" });
  wrap.append(h("button", { type: "button", class: "hs-zoom", "aria-label": `Open ${alt} full size`, onclick: () => lightbox(assetId, alt) }, assetImg(assetId, alt)));
  const zones = hotspotZones();
  if (!zones.length) return wrap;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 1 1");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("class", "hs-svg");
  svg.setAttribute("aria-hidden", "true");
  const labels = h("div", { class: "hs-labels" });
  for (const z of zones) {
    const poly = document.createElementNS(SVG_NS, "polygon");
    poly.setAttribute("points", z.points.map(([x, y]) => `${x},${y}`).join(" "));
    poly.setAttribute("class", "hs-poly");
    const [cx, cy] = centroid(z.points);
    const name = z.label || elLabel(z.type);
    const chip = h("button", { type: "button", class: "hs-label", style: `left:${(cx * 100).toFixed(2)}%;top:${(cy * 100).toFixed(2)}%`, "aria-label": `${name}: view specifications`, onclick: () => openSpecs(z.type) }, name);
    const on = () => {
      poly.classList.add("on");
      chip.classList.add("on");
    };
    const off = () => {
      poly.classList.remove("on");
      chip.classList.remove("on");
    };
    poly.addEventListener("mouseenter", on);
    poly.addEventListener("mouseleave", off);
    poly.addEventListener("click", () => openSpecs(z.type));
    chip.addEventListener("mouseenter", on);
    chip.addEventListener("mouseleave", off);
    chip.addEventListener("focus", on);
    chip.addEventListener("blur", off);
    svg.append(poly);
    labels.append(chip);
  }
  wrap.append(svg, labels);
  return wrap;
}

const hotspotHint = () => (hotspotZones().length ? h("p", { class: "hint", style: "margin:8px 0 0" }, "Hover or tap a decor area to see its specifications.") : null);

/* ---------------- Step gating ---------------- */

// The server decides the minimum number of views for the overview (3 by default, 1 in demo
// runtimes), so the studio lets the planner continue with one and surfaces any refusal.
const gates = [
  () => approvedGroundIds().length >= 1,
  () => !!approvedOf("venue_isometric"),
  () => (S.project?.components || []).length > 0,
  () => allMasters(),
  () => true,
];
function reachable(i) {
  for (let g = 0; g < i; g++) if (!gates[g]()) return false;
  return true;
}
function inferStep() {
  if (!S.project) return 0;
  for (let i = 0; i < gates.length; i++) {
    if (!gates[i]()) return i;
    if (i === 4 && !approvedOf("showcase")) return 4;
  }
  return 5;
}

/* ---------------- Shared UI pieces ---------------- */

function btn(label, onClick, { primary, small, large, ghost, disabled, busy, title, id, pressed, ariaLabel } = {}) {
  const cls = ["btn", primary && "btn-primary", small && "btn-sm", large && "btn-lg", ghost && "btn-ghost"].filter(Boolean).join(" ");
  return h(
    "button",
    { type: "button", class: cls, disabled: disabled || busy, title, id, "aria-pressed": pressed == null ? null : String(pressed), "aria-label": ariaLabel, "aria-busy": busy ? "true" : null, onclick: onClick },
    busy ? h("span", { class: "spinner", "aria-hidden": "true" }) : null,
    label,
  );
}

function statusBadge(a, { master } = {}) {
  if (!a) return null;
  if (master) return h("span", { class: "badge ok" }, "Master");
  const map = {
    approved: ["ok", "Approved"],
    rejected: ["bad", "Rejected"],
    candidate: ["neutral", "Ready to review"],
    review: ["neutral", "Needs review"],
    pending_screen: ["", "Not checked yet"],
  };
  const [cls, text] = map[a.status] || ["", a.status];
  return h("span", { class: `badge ${cls}` }, text);
}

function qaLine(a) {
  const reason = a?.qa?.reason || a?.screening?.reason;
  return reason ? h("p", { class: "qa" }, `Quality check: ${reason}`) : null;
}

function jobProgress(key, text, { block } = {}) {
  const j = S.jobs.get(key);
  if (!j) return null;
  if (j.status === "running") {
    const phase = j.phase === "queued" ? "Queued" : text;
    if (block)
      return h(
        "div",
        { class: "progress-block", role: "status", "aria-live": "polite" },
        h("span", { class: "spinner", "aria-hidden": "true" }),
        h("div", { class: "elapsed", dataset: { job: key } }, fmtElapsed(Date.now() - j.start)),
        h("div", null, phase),
        h("div", { class: "small" }, "This usually takes 30 to 90 seconds."),
      );
    return h(
      "div",
      { class: "progress", role: "status", "aria-live": "polite" },
      h("span", { class: "spinner", "aria-hidden": "true" }),
      h("span", null, phase),
      h("span", { class: "elapsed", dataset: { job: key } }, fmtElapsed(Date.now() - j.start)),
    );
  }
  if (j.status === "failed" || j.error) {
    return h(
      "div",
      { class: "alert", role: "alert" },
      h("strong", null, j.status === "failed" ? "Failed. " : "Attention. "),
      j.error || "The job did not complete.",
      j.diag ? h("details", null, h("summary", null, "Capture diagnostics"), h("pre", null, JSON.stringify(j.diag, null, 2))) : null,
    );
  }
  return null;
}

function stepHead(i, title, lead) {
  return h("div", { class: "step-head" }, h("p", { class: "eyebrow" }, `Step ${i + 1} of ${STEPS.length}`), h("h1", null, title), lead ? h("p", { class: "lead" }, lead) : null);
}

function resultCard(a, { alt, onApprove, onRegenerate, approveLabel = "Use this", busyKey, regenDisabled, approvedText, hotspots }) {
  if (!a) return null;
  return h(
    "div",
    { class: "result" },
    hotspots
      ? h("div", null, h("div", { class: "result-img" }, hotspotImage(a.id, alt)), hotspotHint())
      : h("button", { type: "button", class: "result-img", style: "padding:0;cursor:zoom-in", "aria-label": `Open ${alt} full size`, onclick: () => lightbox(a.id, alt) }, assetImg(a.id, alt)),
    h(
      "div",
      { class: "result-meta" },
      h("div", { class: "row" }, statusBadge(a), a.status === "approved" && approvedText ? h("span", { class: "muted small" }, approvedText) : null),
      h(
        "div",
        { class: "row" },
        onRegenerate ? btn("Regenerate", onRegenerate, { disabled: regenDisabled }) : null,
        onApprove && approvable(a) ? btn(approveLabel, onApprove, { primary: true, busy: isBusy(busyKey) }) : null,
      ),
    ),
    a.status === "rejected" ? h("div", { class: "alert" }, h("strong", null, "Rejected by quality check. "), a.qa?.reason || "Try regenerating.") : qaLine(a),
  );
}

/* ---------------- Step 1: Venue ---------------- */

function renderVenue() {
  const ground = approvedGroundIds().length;
  const hasNew = SLOTS.some((s) => S.slots[s.view]?.blob);
  const hasPending = allAssets().some((a) => a.status === "pending_screen");
  const busy = isBusy("check") || jobRunning("screen");
  const slotCard = (s) => {
    const slot = S.slots[s.view] || {};
    const a = slotAsset(s.view);
    const filled = slot.blob || a;
    let status;
    if (slot.blob) status = slot.error ? h("span", { class: "badge bad" }, "Upload failed") : h("span", { class: "badge plain" }, "Ready to check");
    else if (a) status = statusBadge(a);
    else status = h("span", { class: "muted" }, s.optional ? "Optional" : "Missing");
    const reason = slot.blob && slot.error ? slot.error : a && !slot.blob && ["rejected", "review"].includes(a.status) ? a.screening?.reason : null;
    return h(
      "div",
      { class: "card slot" },
      h(
        "div",
        { class: "thumb" },
        slot.url
          ? h("img", { src: slot.url, alt: `${s.label} photo (not yet checked)` })
          : a
            ? assetImg(a.id, `${s.label} venue photo`)
            : [h("div", { class: "frame", "aria-hidden": "true" }), h("div", { class: "placeholder" }, s.hint)],
      ),
      h(
        "div",
        { class: "card-body" },
        h("div", { class: "row-between" }, h("h3", null, s.label), s.optional ? h("span", { class: "tag" }, "Optional") : null),
        h("div", { class: "slot-status", style: "margin-top:8px" }, status),
        reason ? h("div", { class: "slot-reason" }, reason) : null,
        a && !slot.blob && a.status === "review"
          ? h("div", { style: "margin-top:8px" }, btn("Approve anyway", () => act(`approve:${a.id}`, () => approveAsset(a.id, `${s.label} photo accepted`)), { small: true, busy: isBusy(`approve:${a.id}`) }))
          : null,
        h(
          "div",
          { class: "slot-actions" },
          btn(filled ? "Retake" : "Camera", async () => setSlotBlob(s.view, await openCamera(`${s.label} view`)), { small: true, disabled: busy, ariaLabel: `${filled ? "Retake" : "Take"} ${s.label} photo with camera` }),
          btn("Upload", async () => setSlotBlob(s.view, await pickFile()), { small: true, disabled: busy, ariaLabel: `Upload ${s.label} photo` }),
        ),
      ),
    );
  };
  return [
    !S.project
      ? h(
          "div",
          { class: "card demo-start" },
          h("div", null, h("h2", null, "Start demo"), h("p", { class: "muted" }, "Run the whole studio on a preset venue with a fresh random design, or prefill the steps and click through yourself.")),
          btn("Start demo", openDemoPanel, { primary: true, large: true }),
        )
      : null,
    stepHead(0, "Photograph the venue", "Take one photo facing each direction from the middle of the space. Front, right and back are the minimum; add left and a satellite view for the best result."),
    h("div", { class: "slots" }, SLOTS.map(slotCard)),
    h(
      "div",
      { class: "section stack" },
      jobProgress("screen", "Checking photos"),
      h(
        "div",
        { class: "row-between" },
        h("p", { class: "muted", style: "margin:0" }, `${ground} of 4 ground views accepted`, ground < 3 ? " (at least 3 recommended)" : ""),
        btn("Check photos", () => act("check", checkPhotos), { primary: true, large: true, busy, disabled: !hasNew && !hasPending }),
      ),
    ),
  ];
}

/* ---------------- Step 2: Brief + isometric ---------------- */

function chipEditor({ id, label, hint, values, placeholder, max, maxLen, suggestions = [] }) {
  const input = h("input", { id, class: "input input-sm", placeholder, maxlength: String(maxLen), "aria-label": `Add ${label.toLowerCase()}` });
  const add = (v) => {
    const value = (v ?? input.value).trim();
    if (!value) return;
    if (values.length >= max) return toast(`At most ${max} ${label.toLowerCase()}`, { type: "error", title: label });
    if (!values.includes(value)) values.push(value);
    input.value = "";
    render();
    $(`#${id}`)?.focus();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  });
  const unused = suggestions.filter((s) => !values.includes(s)).slice(0, 5);
  return h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    values.length
      ? h("div", { class: "chips" }, values.map((v, i) => h("span", { class: "chip" }, v, h("button", { type: "button", "aria-label": `Remove ${v}`, onclick: () => { values.splice(i, 1); render(); } }, "×"))))
      : null,
    h("div", { class: "chip-input" }, input, btn("Add", () => add(), { small: true })),
    unused.length ? h("div", { class: "chips" }, unused.map((s) => h("button", { type: "button", class: "suggest", onclick: () => add(s) }, `+ ${s}`))) : null,
    hint ? h("div", { class: "hint" }, hint) : null,
  );
}

function renderBrief() {
  const d = briefDraft();
  const ids = venueAssetIdsForIsometric();
  const iso = latest("venue_isometric");
  const approvedIso = approvedOf("venue_isometric");
  const running = jobRunning("iso");
  const generate = () =>
    act("iso", async () => {
      if (approvedGroundIds().length < 1) throw new Error("Accept at least one ground photo in step 1 first.");
      await saveBrief();
      await runJob("iso", "venue_isometric", { venueAssetIds: venueAssetIdsForIsometric() });
    });
  const tooMany = runningJobs() >= 2;
  return [
    stepHead(1, "Describe the wedding", "Tell us about the celebration. We use this, together with your photos, to build an overview of the venue."),
    h(
      "div",
      { class: "form" },
      h(
        "div",
        { class: "field" },
        h("label", { for: "brief-description" }, "Describe the wedding"),
        h("textarea", { id: "brief-description", class: "textarea", maxlength: "8000", placeholder: "An evening Hindu ceremony for 250 guests. Mandap at the far end of the lawn, dinner under string lights, a lounge by the pool...", value: d.description, oninput: (e) => (d.description = e.target.value) }),
      ),
      h(
        "div",
        { class: "field" },
        h("label", { for: "brief-style" }, "Style"),
        h("input", { id: "brief-style", class: "input", maxlength: "200", placeholder: "e.g. Modern Indian with garden romance", value: d.style, oninput: (e) => (d.style = e.target.value) }),
        h("div", { class: "chips" }, STYLE_SUGGESTIONS.filter((s) => s !== d.style).map((s) => h("button", { type: "button", class: "suggest", onclick: () => { d.style = s; render(); } }, s))),
      ),
      chipEditor({ id: "brief-palette", label: "Palette", values: d.palette, placeholder: "Add a colour", max: 8, maxLen: 40, suggestions: PALETTE_SUGGESTIONS }),
      chipEditor({ id: "brief-constraints", label: "Constraints", hint: "Things the design must respect, e.g. \"no open flames\", \"keep the pool deck clear\".", values: d.constraints, placeholder: "Add a constraint", max: 30, maxLen: 300 }),
    ),
    h(
      "div",
      { class: "section stack" },
      h("div", { class: "row-between" }, h("h2", { style: "margin:0" }, "Venue overview"), h("span", { class: "muted small" }, `${ids.length} accepted photo${ids.length === 1 ? "" : "s"} will be used`)),
      !iso && !running
        ? h(
            "div",
            { class: "empty stack", style: "align-items:center" },
            h("p", { style: "margin:0" }, "Generate a bird's-eye overview of the venue from your photos."),
            btn("Generate venue overview", generate, { primary: true, large: true, busy: isBusy("iso"), disabled: ids.length < 1 || tooMany }),
          )
        : null,
      ids.length && approvedGroundIds().length < 3 ? h("p", { class: "note" }, "Fewer than 3 ground photos. The server may require 3; if generation is refused, add more photos in step 1.") : null,
      running ? jobProgress("iso", "Generating the venue overview", { block: true }) : jobProgress("iso", ""),
      iso && !running
        ? resultCard(iso, {
            alt: "Venue overview",
            onApprove: () => act("approve-iso", () => approveAsset(iso.id, "Venue overview selected")),
            onRegenerate: generate,
            regenDisabled: isBusy("iso") || ids.length < 1 || tooMany,
            busyKey: "approve-iso",
            approvedText: "Used for the layout",
          })
        : null,
      approvedIso && iso && approvedIso.id !== iso.id ? h("p", { class: "note" }, "An earlier approved overview is still in use. Select \"Use this\" to switch to the newest one.") : null,
    ),
  ];
}

/* ---------------- Step 3: Drawing ---------------- */

const draw = { canvas: null, img: null, ro: null, side: null, tools: null };

function shapeLabelDefault(type) {
  const n = S.shapes.filter((s) => s.type === type).length + 1;
  return n === 1 ? ELEMENT[type].label : `${ELEMENT[type].label} ${n}`;
}

function finishShape() {
  const d = S.draft;
  if (!d || d.points.length < 3) return toast("Add at least 3 corners to make a shape", { type: "error", title: "Shape" });
  if (area(d.points) < 0.00001) return toast("This shape has no area. Spread the corners out.", { type: "error", title: "Shape" });
  const shape = { id: uuid(), type: d.type, points: d.points, label: shapeLabelDefault(d.type), description: "" };
  S.shapes.push(shape);
  S.draft = null;
  S.selected = shape.id;
  saveShapes();
  redraw();
  renderSide();
  setTimeout(() => $(`#desc-${shape.id}`)?.focus(), 0);
}

function canvasPoint(e) {
  const r = draw.canvas.getBoundingClientRect();
  return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
}

function onCanvasClick(e) {
  if (!draw.img || animActive()) return;
  const p = canvasPoint(e);
  const r = draw.canvas.getBoundingClientRect();
  const px = (q) => [q[0] * r.width, q[1] * r.height];
  const dist = (a, b) => Math.hypot(px(a)[0] - px(b)[0], px(a)[1] - px(b)[1]);
  if (!S.draft) S.draft = { type: S.tool, points: [] };
  const pts = S.draft.points;
  if (pts.length >= 3 && dist(p, pts[0]) < 12) return finishShape();
  if (pts.length && dist(p, pts[pts.length - 1]) < 6) return; // second click of a double-click
  if (pts.length >= 64) return toast("A shape can have at most 64 corners", { type: "error", title: "Shape" });
  pts.push(p);
  redraw();
  renderTools();
}

function sizeCanvas() {
  const c = draw.canvas;
  const img = draw.img;
  if (!c || !img || !c.parentElement) return;
  const maxW = c.parentElement.clientWidth;
  const maxH = Math.max(260, window.innerHeight * 0.7);
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = Math.max(1, Math.floor(img.naturalWidth * scale));
  const hgt = Math.max(1, Math.floor(img.naturalHeight * scale));
  const dpr = window.devicePixelRatio || 1;
  c.style.width = `${w}px`;
  c.style.height = `${hgt}px`;
  c.width = Math.round(w * dpr);
  c.height = Math.round(hgt * dpr);
  redraw();
}

function redraw() {
  const c = draw.canvas;
  if (!c || !draw.img) return;
  const ctx = c.getContext("2d");
  const W = c.width;
  const H = c.height;
  const dpr = window.devicePixelRatio || 1;
  const a = S.aiAnim;
  if (a && !a.finished && a.baseAssetId === draw.img.dataset.asset) {
    paintPlan(ctx, W, H, dpr, a, animElapsed(a), draw.img);
    return;
  }
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(draw.img, 0, 0, W, H);
  const path = (pts, close) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
    if (close) ctx.closePath();
  };
  S.shapes.forEach((s, i) => {
    const sel = s.id === S.selected;
    const clear = s.type === "keep_clear";
    path(s.points, true);
    ctx.fillStyle = clear ? "rgba(0,0,0,0.45)" : sel ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.16)";
    ctx.fill();
    ctx.setLineDash(clear ? [8 * dpr, 6 * dpr] : []);
    ctx.lineWidth = (sel ? 3 : 2) * dpr;
    ctx.strokeStyle = "#000";
    ctx.lineWidth += 2 * dpr;
    ctx.stroke();
    ctx.lineWidth -= 2 * dpr;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.setLineDash([]);
    const cx = s.points.reduce((a, p) => a + p[0], 0) / s.points.length;
    const cy = s.points.reduce((a, p) => a + p[1], 0) / s.points.length;
    const text = `${i + 1}  ${s.label}`;
    ctx.font = `600 ${12 * dpr}px Inter, system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;
    const pad = 6 * dpr;
    const bh = 20 * dpr;
    ctx.fillStyle = sel ? "#fff" : "#000";
    ctx.fillRect(cx * W - tw / 2 - pad, cy * H - bh / 2, tw + pad * 2, bh);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(cx * W - tw / 2 - pad, cy * H - bh / 2, tw + pad * 2, bh);
    ctx.fillStyle = sel ? "#000" : "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx * W, cy * H + 0.5 * dpr);
  });
  if (S.draft?.points.length) {
    const pts = S.draft.points;
    path(pts, false);
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
    ctx.setLineDash([]);
    pts.forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.arc(x * W, y * H, (i === 0 ? 7 : 4) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? "#000" : "#fff";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    });
  }
}

function renderTools() {
  const el = draw.tools;
  if (!el) return;
  const d = S.draft;
  el.replaceChildren(
    btn("Finish shape", finishShape, { small: true, primary: !!d && d.points.length >= 3, disabled: !d || d.points.length < 3 }),
    btn("Undo point", () => { S.draft?.points.pop(); if (S.draft && !S.draft.points.length) S.draft = null; redraw(); renderTools(); }, { small: true, disabled: !d?.points.length }),
    btn("Cancel shape", () => { S.draft = null; redraw(); renderTools(); }, { small: true, disabled: !d }),
    h("span", { class: "muted small", style: "align-self:center;margin-left:auto" }, d ? `Drawing ${ELEMENT[d.type].label}: ${d.points.length} corner${d.points.length === 1 ? "" : "s"}` : "Tap to add corners. Double-click, tap the first corner, or press Finish to close."),
  );
}

function renderSide() {
  const el = draw.side;
  if (!el) return;
  const problems = shapeProblems();
  const dirty = designDirty();
  const iso = approvedOf("venue_isometric");
  const anim = S.aiAnim && iso && S.aiAnim.baseAssetId === iso.id ? S.aiAnim : null;
  const aiBusy = isBusy("ai-draw") || jobRunning("layout_plan");
  const aiJob = S.jobs.get("layout_plan");
  el.replaceChildren(
    h(
      "div",
      { class: "stack ai-box" },
      btn("Let AI draw the layout", () => act("ai-draw", aiDrawLayout), { primary: !S.shapes.length || !!anim, large: true, busy: aiBusy, disabled: animActive() || runningJobs() >= 2 }),
      aiBusy && aiJob?.status === "running" ? jobProgress("layout_plan", "AI is planning the layout") : null,
      !aiBusy && aiJob?.status === "failed" ? jobProgress("layout_plan", "") : null,
      anim ? [h("div", { class: "label" }, "AI layout"), planList(anim)] : h("p", { class: "hint", style: "margin:0" }, "The AI places every described element on the overview and marks walkways to keep clear. You can still edit the shapes afterwards."),
      anim?.finished && S.prevShapes ? h("button", { type: "button", class: "link-btn", style: "justify-self:start", onclick: undoAiLayout }, "Restore previous layout") : null,
    ),
    h(
      "div",
      { class: "stack" },
      h("div", { class: "label" }, "Element"),
      h(
        "div",
        { class: "palette", role: "group", "aria-label": "Element type" },
        ELEMENTS.map((e) =>
          btn([h("span", { class: `swatch${e.type === "keep_clear" ? " dashed" : ""}`, "aria-hidden": "true" }), e.label], () => {
            S.tool = e.type;
            if (S.draft) S.draft.type = e.type;
            renderSide();
            renderTools();
            redraw();
          }, { small: true, pressed: S.tool === e.type }),
        ),
      ),
    ),
    h(
      "div",
      { class: "stack" },
      h("div", { class: "row-between" }, h("div", { class: "label" }, `Shapes (${S.shapes.length})`), S.selected ? h("button", { type: "button", class: "link-btn", onclick: () => deleteShape(S.selected) }, "Delete selected") : null),
      S.shapes.length
        ? h(
            "div",
            { class: "shape-list" },
            S.shapes.map((s, i) =>
              h(
                "div",
                { class: `shape-item${s.id === S.selected ? " selected" : ""}` },
                h(
                  "div",
                  { class: "row-between" },
                  h("button", { type: "button", class: "shape-title", onclick: () => { S.selected = s.id; redraw(); renderSide(); } }, `${i + 1}. ${ELEMENT[s.type].label}`),
                  h("button", { type: "button", class: "link-btn", "aria-label": `Delete ${s.label}`, onclick: () => deleteShape(s.id) }, "Delete"),
                ),
                h("input", { id: `label-${s.id}`, class: "input input-sm", maxlength: "60", "aria-label": "Label", placeholder: "Label", value: s.label, onfocus: () => selectQuiet(s.id), oninput: (e) => { s.label = e.target.value; saveShapes(); redraw(); } }),
                s.type === "keep_clear"
                  ? null
                  : h("input", { id: `desc-${s.id}`, class: "input input-sm", maxlength: "300", "aria-label": "Short description", placeholder: DESCRIPTION_HINTS[s.type], value: s.description, onfocus: () => selectQuiet(s.id), oninput: (e) => { s.description = e.target.value; saveShapes(); updateSaveState(); } }),
                s.reason ? h("p", { class: "qa", style: "margin:0" }, `AI: ${s.reason}`) : null,
              ),
            ),
          )
        : h("p", { class: "muted small", style: "margin:0" }, "No shapes yet. Pick an element and outline where it goes on the overview."),
    ),
    problems.length ? h("div", { class: "alert" }, problems.join(" ")) : null,
    h(
      "div",
      { class: "stack" },
      btn(dirty ? "Save design" : "Design saved", () => act("design", saveDesign), { primary: dirty, large: true, busy: isBusy("design"), id: "save-design", disabled: !dirty && !isBusy("design") }),
      h("p", { class: "hint", style: "margin:0" }, "Changing an element's description later means its design sheets must be regenerated."),
    ),
  );
}

function updateSaveState() {
  const b = $("#save-design");
  if (!b || isBusy("design")) return;
  const dirty = designDirty();
  b.disabled = !dirty;
  b.classList.toggle("btn-primary", dirty);
  b.lastChild.textContent = dirty ? "Save design" : "Design saved";
}

function selectQuiet(id) {
  if (S.selected === id) return;
  S.selected = id;
  redraw();
  document.querySelectorAll(".shape-item").forEach((el, i) => el.classList.toggle("selected", S.shapes[i]?.id === id));
}

function deleteShape(id) {
  S.shapes = S.shapes.filter((s) => s.id !== id);
  if (S.selected === id) S.selected = null;
  saveShapes();
  redraw();
  renderSide();
}

function renderDraw() {
  const iso = approvedOf("venue_isometric");
  if (!iso) return [stepHead(2, "Lay out the venue"), h("div", { class: "empty" }, "Approve a venue overview in step 2 first.")];
  const wrap = h("div", { class: "canvas-wrap" });
  const c = h("canvas", { class: "draw-canvas", role: "img", "aria-label": "Venue overview. Click to place corners of a shape." });
  c.addEventListener("click", onCanvasClick);
  c.addEventListener("dblclick", (e) => { e.preventDefault(); if (S.draft?.points.length >= 3) finishShape(); });
  wrap.append(c);
  draw.canvas = c;
  draw.side = h("aside", { class: "side", "aria-label": "Layout tools" });
  draw.ro?.disconnect();
  draw.ro = new ResizeObserver(() => sizeCanvas());
  draw.ro.observe(wrap);
  if (draw.img && draw.img.dataset.asset === iso.id) setTimeout(sizeCanvas, 0);
  else {
    draw.img = null;
    assetUrl(iso.id)
      .then((u) => {
        const img = new Image();
        img.dataset.asset = iso.id;
        img.onload = () => {
          draw.img = img;
          sizeCanvas();
        };
        img.onerror = () => toast("Could not load the venue overview", { type: "error", title: "Layout" });
        img.src = u;
      })
      .catch((e) => toastErr(e, "Layout"));
  }
  draw.tools = h("div", { class: "canvas-tools" });
  renderSide();
  renderTools();
  return [
    stepHead(2, "Lay out the venue", "Choose an element, then outline where it should go. Add a short description so we know exactly what to design."),
    h("div", { class: "draw-layout" }, h("div", null, wrap, draw.tools), draw.side),
  ];
}

/* ---------------- Step 4: Sheets ---------------- */

function renderSheets() {
  const comps = S.project?.components || [];
  if (!comps.length) return [stepHead(3, "Design the elements"), h("div", { class: "empty" }, "Save a layout in step 3 first.")];
  const tooMany = runningJobs() >= 2;
  const card = (c) => {
    const master = masterOf(c);
    const sheets = byKind("component_sheet", (a) => a.componentId === c.id && !isSpecSheet(a) && !isBoard(a)).slice(0, 6);
    const ref = S.refs[c.id];
    const refBusy = isBusy(`ref:${c.id}`) || ["uploading", "screening"].includes(ref?.status);
    const refAsset = ref?.assetId && assetById(ref.assetId);
    const gen = (viewType) => runJob(`sheet:${c.id}:${viewType}`, "component_sheet", { componentId: c.id, viewType });
    const keys = ["front", "top", "full_sheet"].map((v) => `sheet:${c.id}:${v}`);
    return h(
      "div",
      { class: "card" },
      h(
        "div",
        { class: "card-head" },
        h("h3", null, ELEMENT[c.category]?.label || c.category),
        h("div", { class: "row", style: "gap:8px" }, btn("Specifications", () => openSpecs(c.id), { small: true, ghost: true }), master ? h("span", { class: "badge ok" }, "Ready") : h("span", { class: "badge" }, "Needs approval")),
      ),
      h(
        "div",
        { class: "card-body stack" },
        h("p", { class: "muted small", style: "margin:0" }, c.description),
        h(
          "div",
          { class: "stack", style: "gap:8px" },
          h("div", { class: "label" }, "Reference photos"),
          h(
            "div",
            { class: "refs" },
            (c.referenceAssetIds || []).map((id) => assetImg(id, "Reference photo")),
            (c.referenceAssetIds || []).length < 4
              ? [
                  btn("Camera", async () => { const b = await openCamera(`${ELEMENT[c.category]?.label || c.category} reference`); if (b) act(`ref:${c.id}`, () => addReference(c.id, b)); }, { small: true, disabled: refBusy || anyJobRunning(`sheet:${c.id}`) }),
                  btn("Upload", async () => { const b = await pickFile(); if (b) act(`ref:${c.id}`, () => addReference(c.id, b)); }, { small: true, disabled: refBusy || anyJobRunning(`sheet:${c.id}`) }),
                ]
              : null,
          ),
          ref?.status === "uploading" ? h("div", { class: "progress" }, h("span", { class: "spinner" }), "Uploading reference") : null,
          ref?.status === "screening" ? jobProgress("screen", "Checking reference photo") : null,
          ref?.status === "review" && refAsset
            ? h("div", { class: "note stack", style: "gap:8px" }, h("span", null, `Needs review: ${refAsset.screening?.reason || "the check was not certain"}`), btn("Approve and add", () => act(`ref:${c.id}`, async () => { await approveAsset(refAsset.id, "Reference approved"); await linkReferenceIfApproved(c.id); }), { small: true }))
            : null,
          ref?.status === "error" ? h("div", { class: "alert" }, ref.error) : null,
          !(c.referenceAssetIds || []).length && !ref ? h("p", { class: "hint", style: "margin:0" }, "Optional. Add references before generating views.") : null,
        ),
        h("div", { class: "divider", style: "margin:4px 0" }),
        h(
          "div",
          { class: "gen-row" },
          [["front", "Front view"], ["top", "Top view"], ["full_sheet", "Full sheet"]].map(([v, label]) =>
            btn(label, () => gen(v), { small: true, busy: jobRunning(`sheet:${c.id}:${v}`), disabled: tooMany || refBusy, title: tooMany ? "Two jobs are already running" : null }),
          ),
        ),
        keys.map((key) => jobProgress(key, `Generating ${VIEW_LABEL[key.split(":")[2]].toLowerCase()}`)),
        sheets.length
          ? h(
              "div",
              { class: "sheets" },
              sheets.map((a) => {
                const isMaster = c.masterAssetId === a.id && a.status === "approved";
                const vt = viewTypeOf(a);
                return h(
                  "div",
                  { class: `sheet${isMaster ? " master" : ""}` },
                  h("button", { type: "button", class: "img-btn", "aria-label": "Open sheet full size", onclick: () => lightbox(a.id, "Design sheet") }, assetImg(a.id, `${VIEW_LABEL[vt] || "Design sheet"}`)),
                  h(
                    "div",
                    { class: "sheet-meta" },
                    h("div", { class: "row-between", style: "gap:6px" }, h("span", null, VIEW_LABEL[vt] || "Sheet"), statusBadge(a, { master: isMaster })),
                    approvable(a) ? btn("Approve", () => act(`approve:${a.id}`, () => approveAsset(a.id, `${ELEMENT[c.category]?.label} sheet approved`)), { small: true, busy: isBusy(`approve:${a.id}`) }) : null,
                    a.qa?.reason ? h("p", { class: "qa", style: "margin:0" }, a.qa.reason) : null,
                  ),
                );
              }),
            )
          : null,
      ),
    );
  };
  const ready = comps.filter(masterOf).length;
  return [
    stepHead(3, "Design the elements", "Generate a design sheet for each element and approve the ones you like. Approve both a front and a top view for the most faithful result."),
    h("p", { class: "muted" }, `${ready} of ${comps.length} element${comps.length === 1 ? "" : "s"} approved`),
    h("div", { class: "comp-grid" }, comps.map(card)),
  ];
}

/* ---------------- Step 5: Complete venue ---------------- */

function renderComplete() {
  const iso = approvedOf("venue_isometric");
  const show = latest("showcase");
  const running = jobRunning("showcase");
  const tooMany = runningJobs() >= 2;
  const create = () =>
    act("showcase", async () => {
      await saveCanvas();
      await runJob("showcase", "showcase", {});
    });
  const masters = (S.project?.components || []).map((c) => [c, masterOf(c)]).filter(([, m]) => m);
  return [
    stepHead(4, "See the complete venue", "We combine your layout, the approved elements and the venue overview into one finished picture."),
    h(
      "div",
      { class: "split" },
      h("div", null, h("p", { class: "figure-label" }, "Before"), iso ? h("div", { class: "result-img" }, assetImg(iso.id, "Venue overview")) : h("div", { class: "empty" }, "No approved overview")),
      h(
        "div",
        null,
        h("p", { class: "figure-label" }, "After"),
        running
          ? jobProgress("showcase", "Composing the complete venue", { block: true })
          : show
            ? resultCard(show, {
                alt: "Complete venue",
                onApprove: () => act("approve-show", () => approveAsset(show.id, "Complete venue selected")),
                onRegenerate: create,
                regenDisabled: isBusy("showcase") || tooMany,
                busyKey: "approve-show",
                approvedText: "Selected for the presentation",
                hotspots: show.status !== "rejected",
              })
            : h("div", { class: "empty stack", style: "align-items:center" }, h("p", { style: "margin:0" }, `${S.shapes.length} area${S.shapes.length === 1 ? "" : "s"} from your layout will be used.`), btn("Create complete venue", create, { primary: true, large: true, busy: isBusy("showcase"), disabled: tooMany })),
      ),
    ),
    !running ? h("div", { style: "margin-top:16px" }, jobProgress("showcase", "")) : null,
    masters.length
      ? h(
          "div",
          { class: "section" },
          h("h2", null, "Design elements"),
          h(
            "div",
            { class: "strip" },
            masters.map(([c, m]) =>
              h(
                "figure",
                null,
                h("button", { type: "button", class: "fig-btn", "aria-label": `${elLabel(c.id)}: open specifications`, onclick: () => openSpecs(c.id) }, assetImg(m.id, elLabel(c.id))),
                h("figcaption", null, elLabel(c.id), " · ", h("button", { type: "button", class: "link-btn", onclick: () => openSpecs(c.id) }, "Specs")),
              ),
            ),
          ),
        )
      : null,
  ];
}

/* ---------------- Step 6: 360 ---------------- */

function renderPano() {
  const designAsset = approvedOf("showcase") || approvedOf("venue_isometric");
  const ai = latest("venue_360");
  const stitched = latest("panorama");
  const running = jobRunning("v360");
  const tooMany = runningJobs() >= 2;
  const create = () => act("v360", () => runJob("v360", "venue_360", { designAssetId: designAsset.id }));
  return [
    stepHead(5, "Walk around in 360°", "Turn the finished design into an immersive view your guests can look around in."),
    h(
      "div",
      { class: "row", style: "margin-bottom:24px" },
      btn(ai ? "Create new 360° view" : "Create 360° view", create, { primary: true, large: true, busy: isBusy("v360") || running, disabled: !designAsset || tooMany }),
      btn("Stitch photos (needs overlapping photos)", () => act("pano", stitchPhotos), { busy: isBusy("pano") || jobRunning("pano"), disabled: tooMany }),
      btn("Presentation", () => setMode("present"), { ghost: true }),
    ),
    !designAsset ? h("p", { class: "note" }, "Approve a venue overview or complete venue first.") : null,
    designAsset && !approvedOf("showcase") ? h("p", { class: "note" }, "No complete venue is approved yet, so the 360 view will use the venue overview.") : null,
    h(
      "div",
      { class: "section stack" },
      h("div", { class: "row-between" }, h("h2", { style: "margin:0" }, "AI-generated 360 view"), ai ? statusBadge(ai) : null),
      running ? jobProgress("v360", "Generating the 360 view", { block: true }) : jobProgress("v360", ""),
      !running && ai
        ? [
            ai.status === "rejected" ? h("div", { class: "alert" }, h("strong", null, "Rejected by quality check. "), ai.qa?.reason || "") : viewer(ai.id, "ai"),
            h("div", { class: "row-between" }, h("p", { class: "qa", style: "margin:0" }, "AI-generated illustration of the design, not a measured or HDR capture.", ai.qa?.reason ? ` Quality check: ${ai.qa.reason}` : ""), approvable(ai) ? btn("Use this", () => act("approve-360", () => approveAsset(ai.id, "360 view selected")), { primary: true, small: true, busy: isBusy("approve-360") }) : null),
          ]
        : null,
      !running && !ai ? h("div", { class: "empty" }, "No 360 view yet.") : null,
    ),
    h(
      "div",
      { class: "section stack" },
      h("div", { class: "row-between" }, h("h2", { style: "margin:0" }, "Stitched from photos"), stitched ? statusBadge(stitched) : null),
      jobRunning("pano") ? jobProgress("pano", "Stitching photos") : jobProgress("pano", ""),
      S.panoBlock?.recaptureGuidance?.length
        ? h("div", { class: "note" }, h("div", { class: "label", style: "margin-bottom:6px" }, "How to capture photos that stitch"), h("ul", { style: "margin:0;padding-left:18px" }, S.panoBlock.recaptureGuidance.map((g) => h("li", null, g))))
        : null,
      !jobRunning("pano") && stitched
        ? [
            viewer(stitched.id, "stitched"),
            h("div", { class: "row-between" }, h("p", { class: "qa", style: "margin:0" }, "Stitched from your venue photos. Coverage is partial and not HDR."), approvable(stitched) ? btn("Use this", () => act("approve-pano", () => approveAsset(stitched.id, "Stitched view selected")), { small: true, busy: isBusy("approve-pano") }) : null),
          ]
        : null,
      !jobRunning("pano") && !stitched ? h("p", { class: "muted small", style: "margin:0" }, "Optional. Works only when the four ground photos were taken from one spot and overlap each other.") : null,
    ),
  ];
}

/* ---------------- Presentation ---------------- */

function renderPresentation() {
  const p = S.project;
  const photos = SLOTS.map((s) => [s, slotAsset(s.view)]).filter(([, a]) => a?.status === "approved");
  const iso = approvedOf("venue_isometric");
  const masters = (p?.components || []).map((c) => [c, masterOf(c)]).filter(([, m]) => m);
  const show = approvedOf("showcase");
  const ai = approvedOf("venue_360") || latest("venue_360", (a) => a.status !== "rejected");
  const stitched = approvedOf("panorama");
  const sections = [];
  let n = 0;
  const sec = (title, ...body) => {
    n += 1;
    sections.push(h("section", { class: "present-section" }, h("p", { class: "eyebrow" }, String(n).padStart(2, "0")), h("h2", null, title), ...body));
  };
  if (photos.length) sec("The venue today", h("div", { class: "present-photos" }, photos.map(([s, a]) => h("figure", null, assetImg(a.id, `${s.label} view`), h("figcaption", null, s.label)))));
  if (iso) sec("Venue overview", h("div", { class: "present-full" }, assetImg(iso.id, "Venue overview")));
  if (masters.length)
    sec(
      "Design elements",
      h(
        "div",
        { class: "present-sheets" },
        masters.map(([c, m]) =>
          h(
            "figure",
            null,
            h("button", { type: "button", class: "fig-btn", "aria-label": `${elLabel(c.id)}: open specifications`, onclick: () => openSpecs(c.id) }, assetImg(m.id, elLabel(c.id))),
            h("figcaption", null, h("strong", { style: "color:#fff" }, elLabel(c.id)), h("br"), c.description),
          ),
        ),
      ),
      h("p", { class: "hint" }, "Click an element to see its specifications."),
    );
  if (show) sec("The complete venue", h("div", { class: "present-full" }, hotspotImage(show.id, "Complete venue")), hotspotHint());
  const comps = p?.components || [];
  if (comps.length && (show || masters.length))
    sec("Specifications", h("p", { class: "muted", style: "margin:-8px 0 20px" }, "Sizes and price ranges are AI estimates, excluding GST. Open an element for materials, quantities and a dimensioned drawing."), h("div", { class: "spec-cards" }, comps.map((c) => specCard(c.id))));
  if (ai) sec("Look around", viewer(ai.id, "ai"), h("p", { class: "qa" }, "AI-generated 360 view"));
  if (stitched) sec("From your photos", viewer(stitched.id, "stitched"), h("p", { class: "qa" }, "Stitched from photos"));
  const b = p?.brief || {};
  return h(
    "div",
    { class: "present" },
    h(
      "div",
      { class: "present-hero" },
      h("p", { class: "eyebrow" }, "Venue design"),
      h("h1", null, projectName()),
      b.description ? h("p", { class: "lead", style: "max-width:760px" }, b.description) : null,
      b.palette?.length ? h("div", { class: "chips", style: "margin-top:16px" }, b.palette.map((c) => h("span", { class: "chip", style: "padding-right:12px" }, c))) : null,
    ),
    sections.length ? sections : h("div", { class: "empty" }, "Nothing approved yet. Approve results in the steps to build the presentation."),
  );
}

/* ---------------- Demo mode ---------------- */

const DEMO_BASE = "/studio/demo";
const DEMO_ELEMENTS = ["entry", "mandap", "stage", "dance_floor", "lounge", "dining", "bar", "photo_booth"];
const DEMO_STAGES = [
  { key: "upload", label: "Uploading photos" },
  { key: "screen", label: "Checking photos" },
  { key: "brief", label: "Writing brief" },
  { key: "iso", label: "Venue overview" },
  { key: "layout", label: "Design layout" },
  { key: "ai_layout", label: "AI layout drawing" },
  { key: "sheets", label: "Element sheets" },
  { key: "showcase", label: "Complete venue" },
  { key: "specs", label: "Decor specifications" },
  { key: "v360", label: "360 view" },
];
const FULL_ORDER = ["upload", "screen", "brief", "iso", "layout", "ai_layout", "sheets", "showcase", "specs", "v360"];
const PREFILL_ORDER = ["upload", "screen", "brief", "layout"];
const QUICK_STAGES = new Set(PREFILL_ORDER);
const DEMO_STOP = new Error("Demo stopped");
const DEMO_ABORT = new Error("Demo abandoned");

// Each run combines one theme, 3-4 elements, per-element detail modifiers, guest count and mood lines.
const DESIGN = [
  {
    id: "royal_rajasthani",
    name: "Royal Rajasthani gold & marigold",
    style: "Royal Rajasthani heritage",
    palette: [["gold", "#C9A227"], ["marigold", "#F2A007"], ["deep red", "#8E1B1B"], ["ivory", "#F6F0E1"]],
    description: "A regal celebration inspired by Rajasthani palaces, with carved gold details, cascades of marigold and rich jewel-toned textiles.",
    constraints: ["Use flame-free diyas near fabric drapes"],
    el: {
      entry: "Carved gold archway framed by marigold garlands and brass lanterns",
      mandap: "Four-pillar gold mandap with a jharokha-style canopy and marigold strands",
      stage: "Raised reception stage with a carved gold backdrop and red velvet thrones",
      dance_floor: "Mirror-inlaid dance floor bordered with brass diyas",
      lounge: "Majlis-style lounge with low gaddi seating, bolsters and block-print cushions",
      dining: "Long banquet tables with red runners, brass thalis and marigold centrepieces",
      bar: "Carved wooden bar with brass fittings under a marigold-draped canopy",
      photo_booth: "Palace jharokha window frame with marigold curtains",
    },
  },
  {
    id: "modern_white_greenery",
    name: "Modern white & greenery",
    style: "Modern minimal with lush greenery",
    palette: [["white", "#FFFFFF"], ["eucalyptus", "#8FA98B"], ["olive", "#556B2F"], ["soft grey", "#D9D9D6"]],
    description: "A clean, modern celebration with crisp white structures, trailing greenery and soft natural light.",
    constraints: ["Keep overhead installations above 3 m on the dance floor"],
    el: {
      entry: "Minimal white arch wrapped in trailing eucalyptus and smilax",
      mandap: "Open white-frame mandap with floating greenery panels and white orchids",
      stage: "Low white stage with a living green wall backdrop",
      dance_floor: "Gloss white dance floor ringed with potted olive trees",
      lounge: "White boucle sofas with olive-wood side tables and ferns",
      dining: "Long white tables with eucalyptus runners and clear glass candles",
      bar: "White fluted bar with a greenery-topped counter",
      photo_booth: "Moss wall with a simple white neon script",
    },
  },
  {
    id: "boho_desert",
    name: "Boho desert terracotta",
    style: "Boho desert",
    palette: [["terracotta", "#C3623B"], ["sand", "#DCC7A1"], ["rust", "#9A3E1E"], ["cream", "#F3E9D7"]],
    description: "A relaxed desert-boho celebration with terracotta tones, macrame, dried florals and warm low lighting.",
    constraints: ["Keep rugs and floor cushions out of the main walkway"],
    el: {
      entry: "Hexagon timber arch with macrame and dried pampas",
      mandap: "Wooden mandap draped in cream macrame with terracotta and dried florals",
      stage: "Rattan-backed stage with layered kilim rugs and dried palm fans",
      dance_floor: "Natural timber dance floor framed by woven lanterns",
      lounge: "Floor-cushion lounge on layered rugs with low wooden tables",
      dining: "Rustic wooden tables with terracotta runners and bud vases",
      bar: "Rattan bar with a dried-floral canopy and clay vessels",
      photo_booth: "Rattan peacock chair under a pampas cloud",
    },
  },
  {
    id: "midnight_silver",
    name: "Midnight blue & silver crystal",
    style: "Midnight glamour",
    palette: [["midnight blue", "#191970"], ["silver", "#C0C0C0"], ["crystal white", "#F4F7FB"], ["charcoal", "#2B2B2B"]],
    description: "A starlit evening of deep midnight blue, silver accents and crystal sparkle for a glamorous night celebration.",
    constraints: ["Keep crystal installations clear of guest walkways"],
    el: {
      entry: "Midnight-blue tunnel entrance with silver star lights",
      mandap: "Silver-frame mandap hung with crystal strands and white blooms",
      stage: "Midnight-blue velvet stage with a crystal curtain backdrop",
      dance_floor: "Starlit black dance floor with a silver monogram",
      lounge: "Navy velvet lounge with mirrored silver tables",
      dining: "Navy-linen tables with silver chargers and crystal candelabras",
      bar: "Mirrored silver bar with blue backlighting",
      photo_booth: "Silver sequin wall with a crescent-moon prop",
    },
  },
  {
    id: "pastel_garden",
    name: "Pastel garden romance",
    style: "Pastel garden romance",
    palette: [["blush", "#F4C2C2"], ["lavender", "#C8B6E2"], ["mint", "#BFE3D0"], ["ivory", "#FFF8EE"]],
    description: "A soft, romantic garden celebration in blush, lavender and mint, overflowing with fresh blooms.",
    constraints: ["Keep the lawn edges clear for photography"],
    el: {
      entry: "Blush rose arch with lavender and trailing jasmine",
      mandap: "White gazebo mandap covered in pastel roses and hydrangeas",
      stage: "Pastel floral stage with a blooming hedge backdrop",
      dance_floor: "Ivory dance floor bordered by pastel flower boxes",
      lounge: "Garden lounge of rattan sofas with pastel cushions",
      dining: "Garden tables with layered pastel linens and low floral runners",
      bar: "Ivory garden bar wrapped in climbing roses",
      photo_booth: "Floral swing framed by a hydrangea wall",
    },
  },
  {
    id: "tropical_sunset",
    name: "Tropical sunset",
    style: "Tropical sunset",
    palette: [["coral", "#FF6F59"], ["mango", "#FFA62B"], ["fuchsia", "#D63384"], ["palm green", "#2E8B57"]],
    description: "A vibrant tropical celebration glowing with sunset coral, mango and fuchsia against lush palm greens.",
    constraints: ["Leave clear sightlines from guest seating to the ceremony"],
    el: {
      entry: "Palm-leaf archway with coral and fuchsia orchids",
      mandap: "Bamboo mandap with monstera leaves and sunset-toned blooms",
      stage: "Sunset-gradient stage with palm fronds and tropical florals",
      dance_floor: "Sunburst-patterned dance floor with lanterns at the corners",
      lounge: "Rattan lounge with coral cushions under palm canopies",
      dining: "Tables with banana-leaf runners and mango-coloured florals",
      bar: "Thatched tiki bar with fuchsia bougainvillea",
      photo_booth: "Giant monstera wall with a sunset neon sign",
    },
  },
  {
    id: "vintage_burgundy",
    name: "Vintage ivory & burgundy",
    style: "Vintage romance",
    palette: [["ivory", "#FFFFF0"], ["burgundy", "#800020"], ["antique gold", "#B08D57"], ["dusty rose", "#C9A9A6"]],
    description: "A timeless vintage celebration with ivory lace, deep burgundy blooms and antique gold detailing.",
    constraints: ["Use flame-free candles inside lace drapery"],
    el: {
      entry: "Antique gold frame entrance with burgundy and ivory roses",
      mandap: "Ivory lace mandap with antique gold pillars and burgundy dahlias",
      stage: "Ivory stage with burgundy velvet drapes and vintage chandeliers",
      dance_floor: "Parquet dance floor under an antique crystal chandelier",
      lounge: "Chesterfield lounge in burgundy leather with lace side tables",
      dining: "Long tables with ivory lace, antique gold cutlery and burgundy blooms",
      bar: "Antique wooden bar with gold mirrors and dusty-rose florals",
      photo_booth: "Vintage gilded frame with a burgundy velvet backdrop",
    },
  },
  {
    id: "monochrome_luxe",
    name: "Monochrome luxe black & white florals",
    style: "Monochrome luxe",
    palette: [["black", "#000000"], ["white", "#FFFFFF"], ["graphite", "#3A3A3A"], ["pearl", "#EAE6DF"]],
    description: "A bold, high-contrast black and white celebration with sculptural white florals and sleek black finishes.",
    constraints: ["Keep black floor finishes non-slip"],
    el: {
      entry: "Black steel arch with sculptural white orchids",
      mandap: "Black-frame mandap with cascading white florals and pearl strands",
      stage: "Gloss black stage with a white floral wall and graphite drapes",
      dance_floor: "Black and white checkerboard dance floor",
      lounge: "Black velvet sofas with white marble tables",
      dining: "Black-linen tables with white florals and tall taper candles",
      bar: "Black marble bar with a white floral cascade",
      photo_booth: "White floral frame on a matte black wall",
    },
  },
];
const DETAIL_MODIFIERS = [
  "with hanging floral chandeliers",
  "with mirrored acrylic accents",
  "with warm festoon lighting",
  "with cascading fairy-light curtains",
  "with sculptural pampas installations",
  "with candle clusters in glass hurricanes",
  "with layered sheer drapery",
  "with geometric brass frames",
  "with soft pin-spot lighting",
  "with suspended greenery hoops",
  "with scattered rose petals",
  "with gilded mirror panels",
  "with woven rattan details",
  "with crystal bead strands",
  "with tall floral pillars",
  "with low-level warm uplighting",
];
const DEMO_OCCASIONS = ["An evening wedding ceremony and reception", "A sunset wedding celebration", "A grand wedding reception", "An intimate ceremony followed by a dinner party"];
const DEMO_TIMES = ["under the stars", "from golden hour into the night", "through a warm evening", "late into the night"];
const DEMO_MOODS = ["Guests should feel welcomed the moment they arrive.", "The space should feel layered, warm and photogenic.", "Every zone should be clearly defined yet flow naturally.", "The ceremony should be the focal point from every seat."];
const DEMO_CONSTRAINTS = ["Keep fire exits and walkways clear", "Keep the main walkway at least 2 m wide", "Leave clear sightlines to the ceremony", "No open flames near fabric"];
// Centre x, centre y, width, height of each element on the base image (normalized).
const DEMO_SPOTS = {
  mandap: [0.5, 0.25, 0.24, 0.16],
  stage: [0.5, 0.25, 0.24, 0.16],
  stage_side: [0.25, 0.22, 0.2, 0.14],
  dining: [0.27, 0.69, 0.2, 0.17],
  lounge: [0.73, 0.69, 0.19, 0.15],
  bar: [0.8, 0.43, 0.11, 0.15],
  entry: [0.5, 0.86, 0.16, 0.07],
  dance_floor: [0.5, 0.5, 0.18, 0.13],
  photo_booth: [0.18, 0.43, 0.1, 0.13],
};

function rnd() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function demoLayout(types) {
  const both = types.includes("mandap") && types.includes("stage");
  const c = (v) => Math.min(0.92, Math.max(0.08, Math.round(v * 10000) / 10000));
  const rect = ([cx, cy, w, hgt], j) => {
    const x = cx + (rnd() * 2 - 1) * j;
    const y = cy + (rnd() * 2 - 1) * j;
    const sw = w * (1 + (rnd() * 2 - 1) * j * 2);
    const sh = hgt * (1 + (rnd() * 2 - 1) * j * 2);
    const x0 = c(x - sw / 2), x1 = c(x + sw / 2), y0 = c(y - sh / 2), y1 = c(y + sh / 2);
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  };
  const build = (j) => types.map((t) => rect(DEMO_SPOTS[t === "stage" && both ? "stage_side" : t], j));
  for (let attempt = 0; attempt < 12; attempt++) {
    const polys = build(0.02);
    if (!polys.some((p, i) => polys.some((q, j) => j > i && overlap(p, q)))) return polys;
  }
  return build(0);
}

function makeDesign() {
  const last = store.get(LAST_DEMO_KEY, null);
  // Never repeat the previous theme, so the theme + venue combination always changes.
  const pool = DESIGN.filter((t) => t.id !== last?.themeId);
  const theme = pick(pool.length ? pool : DESIGN);
  const anchor = pick(["mandap", "stage"]);
  const count = rnd() < 0.5 ? 3 : 4;
  // Seating is always part of the demo so every layout shows where guests sit.
  const chosen = new Set([anchor, "dining", ...shuffle(DEMO_ELEMENTS.filter((t) => t !== anchor && t !== "dining")).slice(0, count - 2)]);
  const types = DEMO_ELEMENTS.filter((t) => chosen.has(t));
  const mods = shuffle(DETAIL_MODIFIERS);
  const polys = demoLayout(types);
  const shapes = types.map((t, i) => ({
    id: uuid(),
    type: t,
    points: polys[i],
    label: ELEMENT[t].label,
    description: `${theme.el[t]}, ${mods[i]}`.slice(0, 300),
  }));
  const guests = 150 + Math.floor(rnd() * 26) * 10;
  const labels = types.map((t) => ELEMENT[t].label.toLowerCase());
  const description = [
    theme.description,
    `${pick(DEMO_OCCASIONS)} for about ${guests} guests, ${pick(DEMO_TIMES)}.`,
    `The layout includes ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}.`,
    pick(DEMO_MOODS),
  ].join(" ");
  return {
    themeId: theme.id,
    themeName: theme.name,
    palette: theme.palette.map(([name, hex]) => ({ name, hex })),
    brief: {
      description,
      style: theme.style,
      palette: theme.palette.map(([n]) => n),
      constraints: [...new Set([...theme.constraints, ...shuffle(DEMO_CONSTRAINTS).slice(0, 2)])],
    },
    types,
    shapes,
  };
}

let presetsPromise = null;
function loadPresets() {
  if (!presetsPromise) {
    presetsPromise = (async () => {
      let res;
      try {
        res = await fetch(`${DEMO_BASE}/presets.json`, { cache: "no-store" });
      } catch {
        throw new Error("Cannot reach the demo presets. Is the pipeline dev server running?");
      }
      if (!res.ok) throw new Error(res.status === 404 ? "Demo presets are not installed on this server (404)." : `Could not load demo presets (HTTP ${res.status}).`);
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("The demo presets file is not valid JSON.");
      }
      const venues = (Array.isArray(data?.venues) ? data.venues : [])
        .filter((v) => v && typeof v.id === "string" && Array.isArray(v.photos))
        .map((v) => ({ ...v, photos: v.photos.filter((p) => p && typeof p.file === "string") }))
        .filter((v) => v.photos.length);
      if (!venues.length) throw new Error("The demo presets contain no usable venues.");
      const decor = (Array.isArray(data?.decor) ? data.decor : []).filter((x) => x && typeof x.file === "string");
      return { venues, decor };
    })();
    presetsPromise.catch(() => (presetsPromise = null));
  }
  return presetsPromise;
}

const demoPath = (...parts) =>
  `${DEMO_BASE}/${parts.flatMap((p) => String(p).split("/")).filter(Boolean).map(encodeURIComponent).join("/")}`;

async function fetchDemoImage(url) {
  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error(`Could not download demo image ${url}`);
  }
  if (!res.ok) throw new Error(`Demo image missing (HTTP ${res.status}): ${url}`);
  const blob = await res.blob();
  if (!blob.size) throw new Error(`Demo image is empty: ${url}`);
  return normalizeFile(blob);
}

const demoAlive = (d) => S.demo === d;
const demoStage = (d, key) => d.stages.find((s) => s.key === key);

async function withRetry(d, fn, tries = 5) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!retryable(e) || i >= tries - 1 || !demoAlive(d)) throw e;
      await sleep(4000);
      if (!demoAlive(d)) throw DEMO_ABORT;
    }
  }
}

async function demoRunJob(d, key, operation, options) {
  let entry;
  for (let i = 0; i < 10; i++) {
    entry = await runJob(key, operation, options, { quietRetry: true });
    if (!demoAlive(d)) throw DEMO_ABORT;
    if (entry.status !== "failed" || !retryable({ code: entry.code, status: entry.httpStatus })) return entry;
    await sleep(5000);
    if (!demoAlive(d)) throw DEMO_ABORT;
  }
  return entry;
}

function addResult(d, label, asset, wide) {
  if (!d.results.some((r) => r.assetId === asset.id)) d.results.push({ label, assetId: asset.id, wide: !!wide, componentId: asset.componentId || null });
}

// Run one generation job and approve its output. A failed or rejected result is regenerated once;
// after that the best approvable output of that kind is used, or the demo stops with a clear message.
async function produce(d, { label, key, op, options, kind, pred = () => true, wide }) {
  let lastErr = "the job did not complete";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!demoAlive(d)) throw DEMO_ABORT;
    if (attempt && d.stop) throw DEMO_STOP;
    const before = new Set(byKind(kind, pred).map((a) => a.id));
    const entry = await demoRunJob(d, key, op, typeof options === "function" ? options() : options);
    if (entry.status === "failed") {
      lastErr = entry.error || "the job failed";
      continue;
    }
    const fresh = byKind(kind, pred).filter((a) => !before.has(a.id));
    const out = fresh.find((a) => a.jobId === entry.jobId) || fresh[0];
    if (!out) {
      lastErr = "the job finished without an image";
      continue;
    }
    addResult(d, label, out, wide);
    refresh();
    if (approvable(out)) {
      await withRetry(d, () => approveAsset(out.id, label, { quiet: true }));
      return out;
    }
    lastErr = `the quality check rejected it${out.qa?.reason ? `: ${out.qa.reason}` : ""}`;
  }
  const best = byKind(kind, pred).find(approvable);
  if (best) {
    await withRetry(d, () => approveAsset(best.id, label, { quiet: true }));
    addResult(d, label, best, wide);
    return best;
  }
  throw new Error(`${label}: ${lastErr}`);
}

async function demoUploadStage(d, st) {
  await ensureProject();
  d.projectId = pid();
  const ids = store.get(DEMO_IDS_KEY, []);
  if (!ids.includes(d.projectId)) store.set(DEMO_IDS_KEY, [...ids, d.projectId].slice(-30));
  if (!d.blobs) {
    st.note = "Downloading preset photos";
    refresh();
    const photos = await Promise.all(d.venue.photos.map(async (p) => ({ view: p.view, blob: await fetchDemoImage(demoPath(d.venue.id, p.file)) })));
    let decorBlob = null;
    if (d.design.types.includes("stage") && d.decor) {
      try {
        decorBlob = await fetchDemoImage(demoPath(d.decor.file));
      } catch (e) {
        toast(`${e.message}. Continuing without the stage reference.`, { type: "error", title: "Demo" });
      }
    }
    d.blobs = { photos, decorBlob };
  }
  if (!demoAlive(d)) throw DEMO_ABORT;
  if (d.blobs.decorBlob && !d.decorAssetId) {
    st.note = "Uploading stage reference";
    refresh();
    try {
      const data = await withRetry(d, () =>
        write((revision) => {
          const fd = new FormData();
          fd.append("images", d.blobs.decorBlob, "stage-reference.jpg");
          fd.append("kind", "decor");
          fd.append("views", JSON.stringify(["detail"]));
          fd.append("revision", String(revision));
          return api("POST", `/projects/${encodeURIComponent(pid())}/assets`, undefined, { form: fd });
        }),
      );
      const acc = data.accepted?.[0];
      if (!acc) throw new Error(data.rejected?.[0]?.reason || "the image was rejected");
      d.decorAssetId = acc.id;
    } catch (e) {
      if (!demoAlive(d)) throw DEMO_ABORT;
      d.blobs.decorBlob = null;
      toast(`Stage reference not used: ${e.message}`, { type: "error", title: "Demo" });
    }
  }
  if (!d.slotsAssigned) {
    const used = new Set();
    for (const p of d.blobs.photos) {
      let v = p.view === "aerial" ? "satellite" : p.view;
      if (!SLOTS.some((s) => s.view === v) || used.has(v)) v = v === "satellite" ? null : GROUND.find((g) => !used.has(g));
      if (!v) continue;
      used.add(v);
      setSlotBlob(v, p.blob);
    }
    d.slotsAssigned = true;
  }
  st.note = `Uploading ${SLOTS.filter((s) => S.slots[s.view]?.blob).length} photo(s)`;
  refresh();
  await withRetry(d, () => uploadSlots());
  // Drop rejected photos so the page holds no unsent blobs.
  const errors = [];
  for (const s of SLOTS) {
    const slot = S.slots[s.view];
    if (slot?.blob) {
      errors.push(`${s.label}: ${slot.error || "not uploaded"}`);
      if (slot.url) URL.revokeObjectURL(slot.url);
      Object.assign(slot, { blob: null, url: null });
    }
  }
  const uploaded = GROUND.filter((v) => slotAsset(v)).length;
  if (!uploaded) throw new Error(`No venue photo was accepted. ${errors.join("; ")}`);
  st.note = `${uploaded} ground photo(s) uploaded${errors.length ? `, ${errors.length} rejected` : ""}`;
}

async function demoScreenStage(d, st) {
  await screenPending();
  if (!demoAlive(d)) throw DEMO_ABORT;
  await refreshProject();
  if (allAssets().some((a) => a.status === "pending_screen"))
    throw new Error(`The photo check did not finish: ${S.jobs.get("screen")?.error || "photos are still waiting to be checked"}`);
  const review = [...SLOTS.map((s) => slotAsset(s.view)), d.decorAssetId && assetById(d.decorAssetId)].filter(
    (a) => a && a.status === "review" && approvable(a),
  );
  for (const a of review) await withRetry(d, () => approveAsset(a.id, "Photo accepted", { quiet: true }));
  const n = approvedGroundIds().length;
  if (!n) {
    const reasons = GROUND.map(slotAsset).filter(Boolean).map((a) => a.screening?.reason).filter(Boolean);
    throw new Error(`No venue photo passed the check${reasons.length ? `: ${reasons.join("; ")}` : ""}`);
  }
  st.note = `${n} ground photo(s) accepted`;
}

async function demoBriefStage(d) {
  const b = d.design.brief;
  S.briefDraft = { description: b.description, style: b.style, palette: [...b.palette], constraints: [...b.constraints] };
  await withRetry(d, () => saveBrief());
}

async function demoLayoutStage(d, st) {
  if (!S.shapes.some((s) => s.type !== "keep_clear")) {
    S.shapes = d.design.shapes.map((s) => ({ ...s, points: s.points.map((p) => [...p]) }));
    saveShapes();
  }
  if (designDirty()) await withRetry(d, () => saveDesign());
  const stage = (S.project.components || []).find((c) => c.id === "stage");
  if (stage && d.decorAssetId && !(stage.referenceAssetIds || []).includes(d.decorAssetId)) {
    const a = assetById(d.decorAssetId);
    if (a?.status === "approved") {
      S.refs.stage = { assetId: a.id };
      try {
        await withRetry(d, () => linkReferenceIfApproved("stage"));
      } catch (e) {
        if (!demoAlive(d)) throw DEMO_ABORT;
        delete S.refs.stage;
        toast(`The LED stage reference could not be attached: ${e.message}`, { type: "error", title: "Demo" });
      }
    } else {
      toast("The LED stage reference did not pass the photo check. Continuing without it.", { type: "error", title: "Demo" });
    }
  }
  st.note = `${(S.project.components || []).length} element(s) placed`;
}

async function demoIsoStage(d) {
  if (approvedOf("venue_isometric")) return;
  await produce(d, {
    label: "Venue overview",
    key: "iso",
    op: "venue_isometric",
    options: () => ({ venueAssetIds: venueAssetIdsForIsometric() }),
    kind: "venue_isometric",
    wide: true,
  });
}

async function demoSheetsStage(d, st) {
  const comps = [...(S.project.components || [])];
  const queue = comps.filter((c) => !masterOf(c));
  let done = comps.length - queue.length;
  const failed = [];
  const note = () => {
    st.note = `${done} of ${comps.length} approved${failed.length ? `, ${failed.length} failed` : ""}`;
  };
  note();
  refresh();
  // The server allows two active jobs per project: run two sheets at a time.
  const worker = async () => {
    while (queue.length && demoAlive(d) && !d.stop) {
      const c = queue.shift();
      const label = ELEMENT[c.category]?.label || c.id;
      try {
        await produce(d, {
          label: `${label} sheet`,
          key: `sheet:${c.id}:front`,
          op: "component_sheet",
          options: { componentId: c.id, viewType: "front" },
          kind: "component_sheet",
          pred: (a) => a.componentId === c.id && !isSpecSheet(a),
        });
        done += 1;
      } catch (e) {
        if (e === DEMO_ABORT || !demoAlive(d)) return;
        if (e === DEMO_STOP) {
          queue.unshift(c);
          return;
        }
        failed.push([c, e]);
      }
      note();
      refresh();
    }
  };
  await Promise.all([worker(), worker()]);
  if (!demoAlive(d)) throw DEMO_ABORT;
  if (d.stop && queue.length) throw DEMO_STOP;
  if (!failed.length) return;
  if (failed.length === comps.length) throw new Error(`No element sheet could be generated. ${failed[0][1].message}`);
  // Carry on with the elements that succeeded; unchanged elements keep their approved sheets.
  const drop = new Set(failed.map(([c]) => c.id));
  S.shapes = S.shapes.filter((s) => !drop.has(s.type));
  saveShapes();
  await withRetry(d, () => saveDesign());
  toast(`Continuing without ${failed.map(([c]) => ELEMENT[c.category]?.label || c.id).join(", ")}. ${failed[0][1].message}`, { type: "error", title: "Element skipped" });
  if (!allMasters()) throw new Error("Some elements lost their approved sheet after the layout changed. Regenerate them in step 4.");
}

async function demoShowcaseStage(d) {
  if (approvedOf("showcase")) return;
  await withRetry(d, () => saveCanvas());
  await produce(d, { label: "Complete venue", key: "showcase", op: "showcase", options: {}, kind: "showcase", wide: true });
}

async function demo360Stage(d) {
  if (approvedOf("venue_360")) return;
  const show = approvedOf("showcase");
  if (!show) throw new Error("No approved complete venue to turn into a 360 view.");
  await produce(d, { label: "360 view", key: "v360", op: "venue_360", options: { designAssetId: show.id }, kind: "venue_360", wide: true });
}

// The AI draws the layout on the approved overview. Any failure keeps the pre-drawn layout.
async function demoAiLayoutStage(d, st) {
  const iso = approvedOf("venue_isometric");
  if (!iso || !(S.project?.components || []).length) {
    st.warn = true;
    st.note = "Skipped: no overview or elements yet";
    return;
  }
  st.note = "AI is studying the venue overview";
  refresh();
  let anim = null;
  try {
    const plan = await runLayoutPlan(iso.id, d);
    if (!demoAlive(d)) throw DEMO_ABORT;
    anim = applyPlan(plan, iso.id);
    if (designDirty()) await withRetry(d, () => saveDesign());
  } catch (e) {
    if (e === DEMO_ABORT || !demoAlive(d)) throw DEMO_ABORT;
    if (anim && S.prevShapes) {
      S.shapes = S.prevShapes;
      S.prevShapes = null;
      saveShapes();
    }
    S.aiAnim = null;
    st.warn = true;
    st.note = `Using the pre-drawn layout. ${e?.message || e}`;
    toast(`AI layout drawing unavailable, continuing with the pre-drawn layout. ${e?.message || e}`, { type: "error", title: "AI layout" });
    return;
  }
  d.results = d.results.filter((r) => r.type !== "plan");
  d.results.push({ type: "plan", label: "AI layout drawing", wide: true });
  st.note = `Drawing ${anim.zones.length} zone${anim.zones.length === 1 ? "" : "s"}`;
  refresh();
  await startAnim(anim);
  const end = Date.now() + anim.total;
  while (Date.now() < end) {
    if (!demoAlive(d)) throw DEMO_ABORT;
    await sleep(Math.min(250, Math.max(10, end - Date.now())));
  }
  st.note = `${anim.zones.length} zone${anim.zones.length === 1 ? "" : "s"}${anim.keepClear.length ? ` and ${anim.keepClear.length} keep-clear area${anim.keepClear.length === 1 ? "" : "s"}` : ""} drawn by AI`;
}

// Pre-computes specifications for every element (two at a time) so clicking is instant later.
async function demoSpecsStage(d, st) {
  const comps = [...(S.project?.components || [])];
  const queue = comps.filter((c) => !S.specs[c.id]?.data);
  let ok = comps.length - queue.length;
  const failed = [];
  const note = () => {
    st.note = `${ok} of ${comps.length} ready${failed.length ? `, ${failed.length} failed` : ""}`;
  };
  note();
  refresh();
  const worker = async () => {
    while (queue.length && demoAlive(d)) {
      const c = queue.shift();
      try {
        await ensureSpecs(c.id, { d });
        ok += 1;
      } catch (e) {
        if (e === DEMO_ABORT || !demoAlive(d)) return;
        failed.push(c);
      }
      note();
      refresh();
    }
  };
  await Promise.all([worker(), worker()]);
  if (!demoAlive(d)) throw DEMO_ABORT;
  if (failed.length) {
    st.warn = true;
    toast(`Specifications could not be estimated for ${failed.map((c) => elLabel(c.id)).join(", ")}. Open the element later to try again.`, { type: "error", title: "Specifications" });
  }
}

const DEMO_RUNNERS = {
  upload: demoUploadStage,
  screen: demoScreenStage,
  brief: demoBriefStage,
  iso: demoIsoStage,
  layout: demoLayoutStage,
  ai_layout: demoAiLayoutStage,
  sheets: demoSheetsStage,
  showcase: demoShowcaseStage,
  specs: demoSpecsStage,
  v360: demo360Stage,
};

function runDemo(d) {
  if (d.runner) return d.runner;
  d.state = "running";
  d.stop = false;
  d.error = null;
  refresh();
  const order = d.mode === "prefill" ? PREFILL_ORDER : FULL_ORDER;
  d.runner = (async () => {
    try {
      for (const key of order) {
        const st = demoStage(d, key);
        if (!demoAlive(d)) throw DEMO_ABORT;
        if (st.status === "done") continue;
        if (d.stop) throw DEMO_STOP;
        Object.assign(st, { status: "running", start: Date.now(), end: null, error: null, note: null, warn: false });
        if (key === "sheets") st.label = `Element sheets (${(S.project?.components || []).length || d.design.types.length})`;
        refresh();
        try {
          await DEMO_RUNNERS[key](d, st);
          st.status = "done";
        } catch (e) {
          st.status = e === DEMO_STOP ? "stopped" : e === DEMO_ABORT ? "pending" : "failed";
          if (st.status === "failed") st.error = e.message;
          throw e;
        } finally {
          st.end = Date.now();
        }
      }
      if (!demoAlive(d)) return;
      d.runner = null;
      d.state = "done";
      if (d.mode === "prefill") {
        S.mode = "steps";
        S.step = reachable(1) ? 1 : 0;
        refresh();
        window.scrollTo({ top: 0 });
        toast("Photos, brief and layout are ready. Continue through the steps.", { type: "success", title: "Demo prefilled" });
      } else {
        toast("The full design is ready.", { type: "success", title: "Demo complete" });
        setMode("present");
      }
    } catch (e) {
      if (!demoAlive(d) || e === DEMO_ABORT) return;
      d.runner = null;
      if (e === DEMO_STOP) {
        d.state = "stopped";
        toast("Demo stopped. Continue the demo or carry on manually from the steps.", { title: "Demo" });
      } else {
        d.state = "failed";
        d.error = e?.message || String(e);
        toastErr(e, "Demo stopped");
      }
      refresh();
    } finally {
      d.runner = null;
    }
  })();
  return d.runner;
}

async function startDemo(choice, mode) {
  if (S.demo?.state === "running") return setMode("demo");
  if (SLOTS.some((s) => S.slots[s.view]?.blob) && !confirm("Some photos were not checked yet and will be discarded. Start the demo?")) return;
  let presets;
  try {
    presets = await loadPresets();
  } catch (e) {
    toastErr(e, "Demo unavailable");
    return;
  }
  const last = store.get(LAST_DEMO_KEY, null);
  let venue = presets.venues.find((v) => v.id === choice);
  if (!venue) {
    const others = presets.venues.filter((v) => v.id !== last?.venueId);
    venue = pick(others.length ? others : presets.venues);
  }
  const design = makeDesign();
  store.set(LAST_DEMO_KEY, { venueId: venue.id, themeId: design.themeId });
  // Remember the planner's own project so "Back to my project" can return to it.
  const cur = pid();
  if (cur && !store.get(DEMO_IDS_KEY, []).includes(cur)) store.set(PREV_KEY, cur);
  store.del(PROJECT_KEY);
  resetLocal();
  syncSlots();
  S.demo = {
    mode,
    venue,
    venueName: venue.name || venue.id,
    decor: presets.decor.find((x) => x.componentId === "stage") || presets.decor[0] || null,
    design,
    stages: DEMO_STAGES.map((s) => ({ ...s, status: "pending" })),
    results: [],
    state: "idle",
    stop: false,
    runner: null,
    projectId: null,
    decorAssetId: null,
    blobs: null,
    slotsAssigned: false,
  };
  S.mode = "demo";
  window.scrollTo({ top: 0 });
  runDemo(S.demo);
}

function stopDemo() {
  const d = S.demo;
  if (!d || d.state !== "running" || d.stop) return;
  d.stop = true;
  toast("Stopping after the current job finishes.", { title: "Demo" });
  render();
}

function continueDemo(mode) {
  const d = S.demo;
  if (!d || d.runner || !d.projectId || d.projectId !== pid()) return;
  if (mode) d.mode = mode;
  S.mode = "demo";
  window.scrollTo({ top: 0 });
  runDemo(d);
}

function openDemoPanel() {
  if (S.demo?.state === "running") return setMode("demo");
  const close = () => {
    modal.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => e.key === "Escape" && close();
  const select = h("select", { id: "demo-venue", class: "select", disabled: true }, h("option", { value: "surprise" }, "Loading venues..."));
  const status = h("div", { class: "progress" });
  const go = (mode) => {
    const choice = select.value;
    close();
    startDemo(choice, mode);
  };
  const run = btn("Run full demo", () => go("full"), { primary: true, large: true, disabled: true, id: "demo-run" });
  const prefill = btn("Prefill only", () => go("prefill"), { large: true, disabled: true, id: "demo-prefill" });
  const load = () => {
    status.hidden = false;
    status.className = "progress";
    status.replaceChildren(h("span", { class: "spinner", "aria-hidden": "true" }), "Loading demo venues");
    loadPresets()
      .then((p) => {
        select.replaceChildren(
          h("option", { value: "surprise" }, "Surprise me"),
          ...p.venues.map((v) => h("option", { value: v.id }, `${v.name || v.id} (${v.photos.length} photo${v.photos.length === 1 ? "" : "s"})`)),
        );
        select.value = "surprise";
        select.disabled = false;
        run.disabled = false;
        prefill.disabled = false;
        status.hidden = true;
      })
      .catch((e) => {
        status.className = "alert";
        status.replaceChildren(h("strong", null, "Demo unavailable. "), e.message, " ", h("button", { type: "button", class: "link-btn", onclick: load }, "Try again"));
      });
  };
  const sameDemo = S.demo && S.demo.projectId && S.demo.projectId === pid();
  const modal = h(
    "div",
    { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": "Demo", onclick: (e) => e.target === modal && close() },
    h(
      "div",
      { class: "demo-panel" },
      h("div", { class: "row-between" }, h("h2", null, "Demo"), h("button", { type: "button", class: "link-btn", onclick: close }, "Close")),
      h("p", { class: "muted", style: "margin:0" }, "Creates a new project from preset venue photos with a freshly randomised design. Your current project is kept and you can return to it."),
      h("div", { class: "field" }, h("label", { for: "demo-venue" }, "Venue"), select),
      status,
      h("div", { class: "row" }, run, prefill),
      h("p", { class: "hint", style: "margin:0" }, "Run full demo generates every step automatically and opens the presentation at the end. Prefill only uploads the photos and writes the brief and layout, then leaves you at step 2."),
      sameDemo ? h("div", null, btn("View current demo", () => { close(); setMode("demo"); }, { ghost: true, small: true })) : null,
    ),
  );
  document.addEventListener("keydown", onKey);
  document.body.append(modal);
  load();
  setTimeout(() => select.focus(), 0);
}

function paletteChips(palette) {
  return h(
    "div",
    { class: "chips" },
    palette.map((p) => h("span", { class: "swatch-chip" }, h("span", { class: "swatch-dot", style: `background:${p.hex}`, "aria-hidden": "true" }), p.name)),
  );
}

const demoStateText = (d) =>
  ({ running: d.stop ? "Stopping" : "Running", stopped: "Stopped", failed: "Stopped with an error", done: d.mode === "prefill" ? "Prefilled" : "Complete", idle: "Starting" })[d.state] || d.state;

function demoActions(d, { small } = {}) {
  const mine = !!d.projectId && d.projectId === pid();
  const canContinue = !d.runner && mine && !(d.state === "done" && d.mode === "full");
  return [
    d.state === "running" ? btn(d.stop ? "Stopping after current job" : "Stop", stopDemo, { small, disabled: d.stop }) : null,
    canContinue
      ? btn(d.state === "done" ? "Run the rest automatically" : "Continue demo", () => continueDemo(d.state === "done" ? "full" : null), { small, primary: !small })
      : null,
  ];
}

function demoBanner() {
  const d = S.demo;
  if (!d || !d.projectId || d.projectId !== pid()) return null;
  return h(
    "div",
    { class: "demo-banner" },
    h(
      "div",
      { class: "stack", style: "gap:6px" },
      h("div", null, h("span", { class: "demo-banner-title" }, `Demo: ${d.design.themeName}`), h("span", { class: "muted small" }, ` · ${d.venueName} · ${demoStateText(d)}`)),
      paletteChips(d.design.palette),
    ),
    h("div", { class: "row" }, demoActions(d, { small: true }), btn("Live results", () => setMode("demo"), { small: true, ghost: true })),
  );
}

function renderDemo() {
  const d = S.demo;
  if (!d)
    return h(
      "div",
      { class: "empty stack", style: "align-items:center" },
      h("p", { style: "margin:0" }, "No demo has been run in this session."),
      btn("Start demo", openDemoPanel, { primary: true }),
    );
  const order = d.mode === "prefill" ? PREFILL_ORDER : FULL_ORDER;
  const visible = order.map((key) => demoStage(d, key));
  const mark = (s) => (s.status === "running" ? h("span", { class: "spinner", "aria-hidden": "true" }) : s.status === "done" ? (s.warn ? "!" : "✓") : s.status === "failed" ? "!" : "");
  const time = (s) =>
    s.status === "running"
      ? h("span", { class: "tl-time", dataset: { since: String(s.start) } }, fmtElapsed(Date.now() - s.start))
      : h("span", { class: "tl-time" }, s.start && s.end ? fmtElapsed(s.end - s.start) : s.status === "stopped" ? "stopped" : "");
  const running = d.stages.find((s) => s.status === "running");
  const generating = running && !QUICK_STAGES.has(running.key) && !(running.key === "ai_layout" && S.aiAnim);
  const results = [...d.results].reverse();
  const mine = !!d.projectId && d.projectId === pid();
  return [
    h(
      "div",
      { class: "demo-head" },
      h("p", { class: "eyebrow" }, d.mode === "prefill" ? `Demo · Prefill · ${demoStateText(d)}` : `Demo · Live results · ${demoStateText(d)}`),
      h("h1", null, d.design.themeName),
      h("p", { class: "lead" }, `${d.venueName} · ${d.design.types.map((t) => ELEMENT[t].label).join(", ")}`),
      h("div", { style: "margin-top:14px" }, paletteChips(d.design.palette)),
    ),
    h(
      "div",
      { class: "row" },
      demoActions(d),
      mine && S.project ? btn("Open steps", () => { S.mode = "steps"; S.step = inferStep(); render(); window.scrollTo({ top: 0 }); }, { ghost: d.state === "running" }) : null,
      d.state === "done" && d.mode === "full" ? btn("Presentation", () => setMode("present"), { primary: true }) : null,
      d.state !== "running" ? btn("New demo", openDemoPanel, { ghost: true }) : null,
    ),
    d.state === "failed"
      ? h("div", { class: "alert", role: "alert", style: "margin-top:16px" }, h("strong", null, "Demo stopped. "), d.error || "Something went wrong.", " Continue the demo to retry this stage, or open the steps to fix it manually.")
      : null,
    d.state === "stopped" ? h("div", { class: "note", style: "margin-top:16px" }, "Demo stopped. Continue the demo, or open the steps to carry on manually.") : null,
    h(
      "div",
      { class: "demo-layout" },
      h(
        "ol",
        { class: "timeline", "aria-label": "Demo progress" },
        visible.map((s) =>
          h(
            "li",
            { class: `${s.status}${s.warn ? " warn" : ""}` },
            h("span", { class: "tl-mark", "aria-hidden": "true" }, mark(s)),
            h("div", null, h("div", null, s.label), s.error ? h("div", { class: "tl-note", style: "color:var(--bad)" }, s.error) : s.note ? h("div", { class: "tl-note" }, s.note) : null),
            time(s),
          ),
        ),
      ),
      h(
        "div",
        { class: "stack", style: "gap:20px" },
        generating
          ? h(
              "div",
              { class: "demo-pending", role: "status", "aria-live": "polite" },
              h("span", { class: "spinner", "aria-hidden": "true" }),
              h("div", null, `${running.label} in progress`),
              h("div", { class: "small" }, running.note || "Each image appears here as soon as it is ready."),
            )
          : null,
        results.length
          ? h(
              "div",
              { class: "demo-results" },
              results.map((r) => {
                if (r.type === "plan")
                  return S.aiAnim
                    ? h("figure", { class: "wide" }, planFigure(S.aiAnim), h("figcaption", null, h("span", null, r.label), h("span", { class: "badge plain" }, "Drawn by AI")))
                    : null;
                const a = assetById(r.assetId);
                if (a?.kind === "showcase" && a.status !== "rejected")
                  return h(
                    "figure",
                    { class: r.wide ? "wide" : null },
                    h("div", { class: "result-img" }, hotspotImage(r.assetId, r.label)),
                    h("figcaption", null, h("span", null, r.label, hotspotZones().length ? h("span", { class: "muted small" }, " · hover a decor area for specifications") : null), statusBadge(a)),
                  );
                const cid = a?.kind === "component_sheet" && compOf(a.componentId) ? a.componentId : null;
                return h(
                  "figure",
                  { class: r.wide ? "wide" : null },
                  h(
                    "button",
                    { type: "button", class: "result-img", style: "padding:0;cursor:zoom-in;width:100%;display:block", "aria-label": `Open ${r.label} full size`, onclick: () => lightbox(r.assetId, r.label) },
                    assetImg(r.assetId, r.label),
                  ),
                  h("figcaption", null, h("span", null, r.label), h("span", { class: "row", style: "gap:10px" }, cid ? h("button", { type: "button", class: "link-btn", onclick: () => openSpecs(cid) }, "Specifications") : null, a ? statusBadge(a) : null)),
                );
              }),
            )
          : generating
            ? null
            : h("div", { class: "empty" }, d.mode === "prefill" ? "Prefill uploads the photos and writes the brief and layout. Images are generated in the steps." : "Results appear here as soon as each image is ready."),
      ),
    ),
  ];
}

async function switchProject(id) {
  if (!id) return;
  if (S.demo?.runner && !confirm("A demo is running. Leave it and return to your project?")) return;
  let project;
  try {
    project = (await api("GET", `/projects/${encodeURIComponent(id)}`)).project;
  } catch (e) {
    if (e.status === 404) {
      store.del(PREV_KEY);
      render();
      toast("Your previous project was not found on the server.", { type: "error", title: "Project" });
    } else toastErr(e, "Could not load your project");
    return;
  }
  resetLocal();
  S.project = project;
  store.set(PROJECT_KEY, pid());
  store.del(PREV_KEY);
  syncSlots();
  loadShapes();
  S.step = inferStep();
  render();
  window.scrollTo({ top: 0 });
  await resumeJobs().then(render);
}

/* ---------------- Shell ---------------- */

function projectName() {
  const b = S.project?.brief;
  if (!S.project) return "New venue";
  if (b?.style) return b.style;
  if (b?.description) {
    const words = b.description.trim().split(/\s+/).slice(0, 6).join(" ");
    return words.length < b.description.trim().length ? `${words}...` : words;
  }
  return "Untitled venue";
}

function setMode(mode) {
  S.mode = mode;
  render();
  window.scrollTo({ top: 0 });
}

function goStep(i) {
  if (i < 0 || i >= STEPS.length || !reachable(i)) return;
  S.step = i;
  S.mode = "steps";
  render();
  window.scrollTo({ top: 0 });
  $("#main")?.focus({ preventScroll: true });
}

async function next() {
  if (S.step === 2 && designDirty()) {
    await act("design", saveDesign);
    if (designDirty()) return;
  }
  if (gates[S.step]?.()) goStep(S.step + 1);
}

const nextHint = [
  () => "Accept at least one ground photo to continue (3 or more recommended)",
  () => "Select \"Use this\" on a venue overview to continue",
  () => "Save a design with at least one element to continue",
  () => "Approve a design sheet for every element to continue",
  () => "",
];

function renderStepper() {
  const nav = $("#stepper");
  if (S.mode === "present") {
    nav.hidden = true;
    return;
  }
  nav.hidden = false;
  const done = inferStep();
  nav.replaceChildren(
    ...STEPS.map((s, i) =>
      h(
        "button",
        { type: "button", class: `step-tab${i < done ? " done" : ""}`, "aria-current": i === S.step && S.mode === "steps" ? "step" : null, disabled: !S.project && i > 0 ? true : !reachable(i), onclick: () => goStep(i) },
        h("span", { class: "step-num", "aria-hidden": "true" }, String(i + 1)),
        s.title,
      ),
    ),
  );
  nav.querySelector('[aria-current="step"]')?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}

function renderNav() {
  const nav = $("#nav");
  if (S.mode === "present") {
    nav.replaceChildren(btn("Exit presentation", () => setMode("steps")), h("span", { class: "nav-hint" }, projectName()), h("span"));
    return;
  }
  if (S.mode === "demo") {
    const d = S.demo;
    nav.replaceChildren(
      S.project ? btn("Open steps", () => { S.mode = "steps"; S.step = inferStep(); render(); window.scrollTo({ top: 0 }); }) : h("span"),
      h("span", { class: "nav-hint" }, d ? `${d.design.themeName} · ${demoStateText(d)}` : ""),
      d?.state === "running" ? btn(d.stop ? "Stopping" : "Stop demo", stopDemo, { disabled: d.stop }) : h("span"),
    );
    return;
  }
  const last = S.step === STEPS.length - 1;
  const canNext = S.step === 2 ? S.shapes.some((s) => s.type !== "keep_clear") || gates[2]() : gates[S.step]?.();
  nav.replaceChildren(
    btn("Back", () => goStep(S.step - 1), { disabled: S.step === 0 }),
    h("span", { class: "nav-hint" }, !last && !canNext ? nextHint[S.step]() : ""),
    last
      ? btn("Presentation", () => setMode("present"), { primary: true })
      : btn(S.step === 2 && designDirty() ? "Save and continue" : "Next", next, { primary: true, disabled: !canNext || isBusy("design") }),
  );
}

function render() {
  S.generation += 1;
  destroyViewers();
  // Preserve focus and caret across re-renders.
  const active = document.activeElement;
  const focusId = active?.id || null;
  const sel = focusId && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;

  $("#project-name").textContent = projectName();
  $("#present-btn").hidden = !S.project || S.mode === "present";
  const prev = store.get(PREV_KEY, null);
  $("#back-project").hidden = !prev || prev === pid();
  $("#demo-btn").textContent = S.demo?.state === "running" ? "Demo running" : "Demo";
  renderStepper();
  const main = $("#main");
  if (S.mode !== "steps" || S.step !== 2) {
    draw.ro?.disconnect();
    draw.canvas = null;
    draw.side = null;
    draw.tools = null;
  }
  let content;
  if (S.mode === "present") content = renderPresentation();
  else if (S.mode === "demo") content = renderDemo();
  else content = [demoBanner(), [renderVenue, renderBrief, renderDraw, renderSheets, renderComplete, renderPano][S.step]()];
  main.replaceChildren(...[content].flat(Infinity).filter(Boolean));
  renderNav();
  renderDrawer();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el && el !== document.activeElement) {
      el.focus({ preventScroll: true });
      if (sel) {
        try {
          el.setSelectionRange(sel[0], sel[1]);
        } catch {
          /* not a text input */
        }
      }
    }
  }
}

// Background updates (job progress, demo notes) must not rebuild the presentation: that would
// restart its 360 viewer and leave fullscreen. There only the drawer and spec cards refresh.
function refresh() {
  if (S.mode === "present") {
    renderDrawer();
    refreshSpecCards();
  } else render();
}

function resetLocal() {
  for (const s of Object.values(S.slots)) if (s?.url) URL.revokeObjectURL(s.url);
  for (const p of urlCache.values()) p.then((v) => URL.revokeObjectURL(v)).catch(() => {});
  urlCache.clear();
  urlReady.clear();
  jsonCache.clear();
  viewerUrlCache.clear();
  VIEW_STATE.clear();
  planLoop.figures.clear();
  Object.assign(S, { project: null, step: 0, mode: "steps", jobs: new Map(), busy: new Set(), slots: {}, refs: {}, shapes: [], draft: null, selected: null, briefDraft: null, panoBlock: null, demo: null, specs: {}, drawer: null, aiAnim: null, prevShapes: null });
  draw.img = null;
  renderDrawer();
}

function newProject() {
  if (S.demo?.runner && !confirm("A demo is running. Leave it and start a new project?")) return;
  if (S.project && !S.demo?.runner && !confirm("Start a new project? The current project stays on the server, but this browser will stop showing it.")) return;
  store.del(PROJECT_KEY);
  resetLocal();
  syncSlots();
  render();
  toast("New project started. Begin with the venue photos.", { title: "New project" });
}

// Elapsed-seconds ticker for running jobs (no re-render).
setInterval(() => {
  document.querySelectorAll("[data-job]").forEach((el) => {
    const j = S.jobs.get(el.dataset.job);
    if (j?.status === "running") el.textContent = fmtElapsed(Date.now() - j.start);
  });
  document.querySelectorAll("[data-since]").forEach((el) => {
    el.textContent = fmtElapsed(Date.now() - Number(el.dataset.since));
  });
}, 1000);

window.addEventListener("beforeunload", (e) => {
  if (SLOTS.some((s) => S.slots[s.view]?.blob)) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("unhandledrejection", (e) => {
  toastErr(e.reason, "Unexpected error");
});

async function boot() {
  $("#new-project").addEventListener("click", newProject);
  $("#present-btn").addEventListener("click", () => setMode("present"));
  $("#demo-btn").addEventListener("click", openDemoPanel);
  $("#back-project").addEventListener("click", () => switchProject(store.get(PREV_KEY, null)));
  try {
    await session();
  } catch (e) {
    $("#main").replaceChildren(
      h("div", { class: "empty stack", style: "align-items:center;margin-top:40px" }, h("h2", { style: "margin:0" }, "Studio unavailable"), h("p", { style: "margin:0" }, e.message), btn("Try again", () => location.reload(), { primary: true })),
    );
    $("#project-name").textContent = "Offline";
    return;
  }
  const savedId = store.get(PROJECT_KEY, null);
  if (savedId) {
    try {
      S.project = (await api("GET", `/projects/${encodeURIComponent(savedId)}`)).project;
    } catch (e) {
      if (e.status === 404) {
        store.del(PROJECT_KEY);
        toast("The saved project was not found. Starting a new one.", { title: "New project" });
      } else {
        toastErr(e, "Could not load your project");
      }
      S.project = null;
    }
  }
  syncSlots();
  loadShapes();
  S.step = inferStep();
  render();
  if (S.project) await resumeJobs().then(render);
}

boot();
