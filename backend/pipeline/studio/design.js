// Stage 3: the design canvas with real-time pin edits. Click the venue to drop a numbered pin, type a
// comment (optionally attach up to two references) and press Enter: that single pin is sent as a
// region_edit on the latest version straight away. Pins queue client-side and run one at a time;
// every result is shown immediately with a wipe, approved automatically (with the QA override when
// the quality check flags it) and becomes the base for the next pin. Undo steps back one version.
import {
  S, hooks, pid, local, assetById, byKind, latest, approvedOf, approvable, rejected, optionsOf, imageInfo, assetImg, runJobRetry, outputOf,
  approveAsset, acceptGenerated, qaNote, setQaNote, screenPending, uploadImages, isRunning, importReference, libPath, pickFile, LIB_MIME, btn, jobLine,
  openViewerModal, modal, h, clamp, toast, toastErr, fmtElapsed, uuid, write, api, projPath,
} from "./core.js";
import { icon } from "./dom.js";
import { createDesignCanvas, PIN_AREA } from "./doodle.js";
import { registerDecor, ensureSheet, decorFinals, splitSheetFor, canCutViews, decorComponentId } from "./decor.js";
import { simplifyStroke, sketchBounds, sketchPoints, strokePath, SKETCH_MAX_STROKES, SKETCH_MAX_TOTAL, SKETCH_COMMENT } from "./sketch.js";

const GLYPHS = {
  pencil: "M4 20l4.5-1L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5",
  comment: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z",
  present: "M3 5h18v11H3zM8 20h8M12 16v4",
  hand: "M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5v-6a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.6a5 5 0 0 1-3.9-1.9L4 14.6a1.5 1.5 0 0 1 2.3-1.9L8 14.5",
  send: "M12 19V5M5 12l7-7 7 7",
};
export function glyph(name, size = 18) {
  return h(
    "svg",
    { class: "ico", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": name === "send" ? "2.2" : "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" },
    h("path", { d: GLYPHS[name] || "" }),
  );
}

export const MAX_PIN_REFS = 2;
const EXPECTED_MS = 45000; // typical region_edit time, drives the progress ring

/* ---------------- Versions (client-side chain of applied edits) ---------------- */

const oldest = (a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
// Venue edits descend from the isometric; decor edits (Decor step) descend from a decor photo.
function isVenueEdit(a) {
  for (let cur = a, i = 0; cur && i < 200; i++) {
    if (cur.kind !== "region_edit") return ["venue_isometric", "showcase", "placement", "venue"].includes(cur.kind);
    cur = assetById(cur.baseAssetId || optionsOf(cur).baseAssetId);
  }
  return false;
}
export function loadDesignState() {
  const saved = local.get("chain", null);
  S.chain = (Array.isArray(saved) ? saved : byKind("region_edit", (a) => a.status === "approved" && isVenueEdit(a)).sort(oldest).map((a) => a.id)).filter((id) => assetById(id) && isVenueEdit(assetById(id)));
  S.pins = (local.get("pins", []) || [])
    .filter((p) => p && p.id && Number.isFinite(p.cx) && Number.isFinite(p.cy))
    .map((p) => ({
      ...p,
      refs: (p.refs || []).filter((r) => r && (r.kind === "lib" || r.assetId)).map((r) => ({ ...r, status: r.kind === "lib" || assetById(r.assetId)?.status === "approved" ? "ready" : "error" })),
      ...(["running", "queued"].includes(p.status) ? { status: "failed", error: "Interrupted by a page reload. Retry to send it again." } : {}),
    }))
    .filter((p) => p.status !== "draft" || (p.comment || "").trim() || p.refs.length);
  S.draft = null;
}
const saveChain = () => local.set("chain", S.chain);
export function savePins() {
  local.set("pins", S.pins.map(({ id, n, cx, cy, r, rx, ry, sketch, comment, refs, status, error, start, end, resultId, baseId, qa }) => ({
    id, n, cx, cy, r, rx, ry, sketch, comment, status, error, start, end, resultId, baseId, qa,
    refs: (refs || []).filter((x) => x.kind === "lib" || x.assetId).map(({ key, kind, path, label, type, assetId, sheet, decor }) => ({ key, kind, path, label, type, assetId, sheet, decor })),
  })));
}

export function versions() {
  const iso = approvedOf("venue_isometric");
  if (!iso) return [];
  return [{ id: iso.id, n: 0, label: "Isometric" }, ...S.chain.filter((id) => assetById(id)).map((id, i) => ({ id, n: i + 1, label: `Edit ${i + 1}` }))];
}
// The approved image the next edit builds on (an edit the server refused to approve is shown but skipped).
export function currentBase() {
  const vs = versions();
  for (let i = vs.length - 1; i >= 0; i--) if (assetById(vs[i].id)?.status === "approved") return vs[i].id;
  return null;
}
export const latestShown = () => versions().at(-1)?.id || null;
export const shownId = () => (S.viewing && assetById(S.viewing) ? S.viewing : latestShown());
export const versionNo = (id) => versions().find((v) => v.id === id)?.n ?? null;
export function editInfo(id) {
  const a = assetById(id);
  if (!a || a.kind !== "region_edit") return null;
  const saved = local.get("edits", {})[id];
  const o = optionsOf(a);
  const regions = saved?.regions || a.regions || o.regions || [];
  return { baseAssetId: saved?.baseAssetId || a.baseAssetId || o.baseAssetId || null, regions, comment: regions.map((r) => r.comment).filter(Boolean).join(" · ") };
}
function saveEditInfo(id, info) {
  const map = local.get("edits", {});
  map[id] = { ...info, at: Date.now() };
  local.set("edits", map);
}

/* ---------------- Pins ---------------- */

export const pinById = (id) => S.pins.find((p) => p.id === id);
export const draftPin = () => (S.draft ? pinById(S.draft) : null);
export const runningPin = () => S.pins.find((p) => p.status === "running") || null;
export const queuedPins = () => S.pins.filter((p) => p.status === "queued");
const visiblePins = () => S.pins.filter((p) => p.status !== "undone");
// Pins on the canvas: finished ones disappear once their edit is in the image (History keeps them).
const activePins = () => S.pins.filter((p) => ["draft", "queued", "running", "failed"].includes(p.status));
const nextN = () => S.pins.reduce((m, p) => Math.max(m, p.n || 0), 0) + 1;
const hasContent = (p) => !!((p.comment || "").trim() || p.refs.length || p.sketch?.length);

export function placePin(cx, cy, { r = PIN_AREA, open = true } = {}) {
  closeDraft();
  const n = nextN();
  const pin = { id: `p${n}`, n, cx: clamp(cx, 0, 1), cy: clamp(cy, 0, 1), r, comment: "", refs: [], status: "draft", error: null };
  S.pins.push(pin);
  if (open) S.draft = pin.id;
  savePins();
  hooks.refresh();
  if (open) focusPill(true);
  return pin;
}
// Sketch tool: strokes accumulate on the open sketch pin; its region grows to enclose them.
// Sketch tool: strokes collect in a free drawing (S.sketchDraft). Nothing is asked until the planner
// presses Done; then the drawing becomes one comment pin to describe and send.
const sketchDraft = () => (S.sketchDraft ||= []);
function addStroke(raw) {
  const stroke = simplifyStroke(raw);
  if (stroke.length < 2) return;
  const strokes = sketchDraft();
  if (strokes.length >= SKETCH_MAX_STROKES || sketchPoints(strokes) + stroke.length > SKETCH_MAX_TOTAL)
    return toast("This drawing is full. Press Done to describe it, or undo some strokes.", { title: "Sketch" });
  if (S.draft) closeDraft();
  strokes.push(stroke);
  hooks.refresh();
}
export function undoStroke() {
  if (!sketchDraft().length) return false;
  sketchDraft().pop();
  hooks.refresh();
  return true;
}
export function clearSketch() {
  S.sketchDraft = [];
  hooks.refresh();
}
export function finishSketch() {
  const strokes = sketchDraft();
  if (!strokes.length) return toast("Draw on the venue first.", { title: "Sketch" });
  const b = sketchBounds(strokes);
  const pin = placePin(b.cx, b.cy, { open: true });
  pin.sketch = strokes.map((s) => s.map((pt) => [...pt]));
  Object.assign(pin, b, { r: Math.max(b.rx, b.ry) });
  S.sketchDraft = [];
  savePins();
  hooks.refresh();
  focusPill(true);
}
// Sketch + decor: switch to exact placement inside the drawing's bounding box.
function placeFromSketch(pin) {
  if (!pin?.sketch?.length) return;
  const ids = new Set(pin.refs.map((r) => r.assetId).filter(Boolean));
  const item = decorFinals().find((it) => ids.has(it.id) || it.views.some((v) => ids.has(v.id)));
  if (!item) return toast("Attach one of your decor pieces with Decor first, then place it exactly.", { title: "Place exactly" });
  const pts = pin.sketch.flat();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  removePin(pin.id);
  openPlaceDialog(item, { box });
}
// Puts an unsent drawing back on the board to change it.
export function redrawPin(id) {
  const p = pinById(id);
  if (!p || !p.sketch?.length || !["draft", "failed"].includes(p.status)) return;
  S.sketchDraft = p.sketch.map((s) => s.map((pt) => [...pt]));
  removePin(id);
  setTool("sketch");
}

// Closes the open pill; an empty draft is removed.
export function closeDraft() {
  const p = draftPin();
  S.draft = null;
  if (p && p.status === "draft" && !hasContent(p)) S.pins = S.pins.filter((x) => x !== p);
  savePins();
  hooks.refresh();
}
export function openDraft(id) {
  const p = pinById(id);
  if (!p || p.status !== "draft") return;
  if (S.draft && S.draft !== id) closeDraft();
  S.draft = id;
  hooks.refresh();
  focusPill(true);
}
// Demo/automation: set the draft's comment as if typed.
export function setDraftText(pin, text) {
  if (!pin || pin.status !== "draft") return;
  pin.comment = text;
  const P = S.design?.pill;
  if (P && P.for === pin.id) {
    P.input.value = text;
    P.grow();
  }
}
export function removePin(id) {
  if (S.draft === id) S.draft = null;
  S.pins = S.pins.filter((p) => p.id !== id);
  savePins();
  hooks.refresh();
}

function refFull(pin) {
  if ((pin.refs || []).length < MAX_PIN_REFS) return false;
  toast(`Up to ${MAX_PIN_REFS} references per comment.`, { title: "Reference" });
  return true;
}
export function attachLib(pin, item) {
  if (!pin || pin.status !== "draft" || !item?.path || refFull(pin)) return null;
  if (pin.refs.some((r) => r.kind === "lib" && r.path === item.path)) return null;
  const ref = { key: uuid().slice(0, 8), kind: "lib", path: item.path, label: item.label || "Library reference", type: item.type || null, status: "ready" };
  pin.refs.push(ref);
  savePins();
  hooks.refresh();
  return ref;
}
export function attachAsset(pin, assetId, label) {
  if (!pin || pin.status !== "draft" || !assetId || refFull(pin)) return null;
  if (pin.refs.some((r) => r.assetId === assetId)) return null;
  const ref = { key: uuid().slice(0, 8), kind: "asset", assetId, label: label || "Decor", status: "ready" };
  pin.refs.push(ref);
  savePins();
  hooks.refresh();
  return ref;
}
// Decor picker: every decor piece with a character sheet and its angles. The chosen angle and the
// sheet are attached to the comment, so the edit places that exact piece facing the chosen way.
export function useDecor(item) {
  const p = draftPin();
  if (!p) return toast("Click or sketch on the venue to start a comment, then pick your decor.", { title: "Decor" });
  openDecorPicker(p, item?.rootId);
}
export function openDecorPicker(pin, focusRootId = null) {
  if (!pin || pin.status !== "draft") return;
  const body = h("div", { class: "angle-picker" });
  const m = modal("Choose decor and angle", body, { cls: "wide" });
  const attach = (item, view) => {
    pin.refs = pin.refs.filter((r) => !r.decor);
    for (const [id, label] of [[view?.id, `${item.label} \u00b7 ${view?.label}`], [item.id, `${item.label} \u00b7 sheet`]])
      if (id) {
        const ref = attachAsset(pin, id, label);
        if (ref) ref.decor = true;
      }
    m.close();
    focusPill(true);
  };
  const draw = () => {
    const items = decorFinals().sort((a, b) => (b.rootId === focusRootId) - (a.rootId === focusRootId));
    if (!items.length) {
      body.replaceChildren(h("p", { class: "hint" }, "No decor with a character sheet yet. Build one in the Decor step, or attach a library image or upload; it becomes a character sheet before it is placed."));
      return;
    }
    body.replaceChildren(
      h("p", { class: "hint" }, "Pick the side of the piece that should face the camera at this spot."),
      ...items.map((item) => {
        const tile = (view) =>
          h(
            "button",
            { type: "button", class: "angle-pick", onclick: () => attach(item, view) },
            assetImg(view ? view.id : item.id, view ? view.label : "Character sheet"),
            h("span", null, view ? view.label : "Whole sheet"),
          );
        return h(
          "section",
          { class: "angle-group" },
          h("div", { class: "row-between" }, h("strong", null, item.label), item.views.length || !canCutViews(item.rootId) ? null : btn("Cut angles", async () => {
            try {
              await splitSheetFor(item.rootId);
              draw();
            } catch (e) {
              toastErr(e, "Angles");
            }
          }, { small: true, quiet: true })),
          h("div", { class: "angle-grid" }, item.views.map((v) => tile(v)), tile(null)),
        );
      }),
    );
  };
  draw();
}
const uploads = new Map(); // ref key -> promise of the approved asset id
export function attachUpload(pin, blob) {
  if (!pin || pin.status !== "draft" || !blob || refFull(pin)) return null;
  const ref = { key: uuid().slice(0, 8), kind: "asset", label: "Your photo", status: "checking", blobUrl: URL.createObjectURL(blob) };
  pin.refs.push(ref);
  hooks.refresh();
  const p = (async () => {
    const data = await uploadImages([{ blob, name: "reference.jpg" }], "decor", ["detail"]);
    const acc = data.accepted?.[0];
    if (!acc) throw new Error(data.rejected?.[0]?.reason || "The photo was rejected");
    const entry = await screenPending();
    let a = assetById(acc.id);
    if (a?.status === "pending_screen") throw new Error(entry?.error || "The photo check did not finish");
    if (a?.status === "review" && approvable(a)) {
      await approveAsset(a.id, "", { quiet: true });
      a = assetById(acc.id);
    }
    if (a?.status !== "approved") throw new Error(a?.screening?.reason || "The photo did not pass the check");
    return a.id;
  })();
  uploads.set(ref.key, p);
  p.then(
    (id) => Object.assign(ref, { assetId: id, status: "ready" }),
    (e) => Object.assign(ref, { status: "error", error: e.message }),
  ).finally(() => {
    savePins();
    hooks.refresh();
  });
  return ref;
}
export function detachRef(pin, key) {
  if (!pin || pin.status !== "draft") return;
  pin.refs = pin.refs.filter((r) => r.key !== key);
  savePins();
  hooks.refresh();
}

// Enter / send: queue this pin as its own region_edit.
export function sendPin(pin) {
  if (!pin || pin.status !== "draft") return false;
  pin.comment = String(pin.comment || "").trim().slice(0, 500);
  if (!hasContent(pin)) {
    toast("Type what should change here, or attach a reference.", { title: "Comment" });
    return false;
  }
  if (!currentBase()) {
    toast("Approve the isometric overview first.", { type: "error", title: "Comment" });
    return false;
  }
  pin.refs = pin.refs.filter((r) => r.status !== "error");
  pin.status = "queued";
  pin.error = null;
  pin.queuedAt = Date.now();
  if (S.draft === pin.id) S.draft = null;
  S.viewing = null;
  savePins();
  hooks.refresh();
  pump();
  return true;
}
export function retryPin(id) {
  const p = pinById(id);
  if (!p || p.status !== "failed") return;
  Object.assign(p, { status: "queued", error: null, queuedAt: Date.now() });
  savePins();
  hooks.refresh();
  pump();
}

async function toSheet(pin, assetId, decorMeta) {
  registerDecor(assetId, decorMeta);
  pin.phase = "Building the character sheet";
  hooks.refresh();
  return (await ensureSheet(assetId)).id;
}
async function resolveRefs(pin) {
  const ids = [];
  for (const r of pin.refs) {
    if (r.sheet && assetById(r.assetId)?.status === "approved") ids.push(r.assetId);
    else if (r.kind === "lib") {
      pin.phase = "Importing the reference";
      hooks.refresh();
      const a = await importReference(r.path, r.label);
      r.assetId = await toSheet(pin, a.id, { name: r.label, type: r.type });
      r.sheet = true;
      ids.push(r.assetId);
    } else if (uploads.has(r.key)) {
      pin.phase = "Checking the reference photo";
      hooks.refresh();
      const photoId = await uploads.get(r.key);
      r.assetId = await toSheet(pin, photoId, { name: "Uploaded decor" });
      r.sheet = true;
      ids.push(r.assetId);
    } else if (r.assetId && assetById(r.assetId)?.status === "approved") ids.push(r.assetId);
  }
  return [...new Set(ids)].filter((id) => assetById(id)?.status === "approved").slice(0, MAX_PIN_REFS);
}

let pumping = false;
export async function pump() {
  if (pumping) return;
  pumping = true;
  const projectId = pid();
  try {
    for (;;) {
      if (pid() !== projectId) return;
      const pin = S.pins.find((p) => p.status === "queued");
      if (!pin) return;
      await applyPin(pin, projectId);
    }
  } finally {
    pumping = false;
    hooks.refresh();
  }
}

const DEFAULT_REF_COMMENT = "Place the element shown in the reference here, matching the venue's style, scale and lighting.";
async function applyPin(pin, projectId) {
  Object.assign(pin, { status: "running", start: Date.now(), end: null, error: null, phase: "Preparing" });
  savePins();
  hooks.refresh();
  try {
    const referenceAssetIds = await resolveRefs(pin);
    const baseId = currentBase();
    if (!baseId) throw new Error("There is no approved image to edit.");
    const info = await imageInfo(baseId);
    const m = Math.min(info.w, info.h);
    const sketched = !!pin.sketch?.length;
    const round = (v) => Math.round(clamp(v, 0.01, 0.5) * 1e5) / 1e5;
    const region = {
      id: pin.id,
      cx: clamp(pin.cx, 0, 1),
      cy: clamp(pin.cy, 0, 1),
      rx: sketched ? round(pin.rx) : round((pin.r * m) / info.w),
      ry: sketched ? round(pin.ry) : round((pin.r * m) / info.h),
      rotation: 0,
      comment: ((pin.comment || "").trim() || (sketched ? SKETCH_COMMENT : DEFAULT_REF_COMMENT)).slice(0, 500),
      referenceAssetIds,
      ...(sketched ? { sketch: pin.sketch } : {}),
    };
    pin.phase = "Generating";
    hooks.refresh();
    const entry = await runJobRetry(`edit:${pin.id}`, "region_edit", { baseAssetId: baseId, regions: [region] }, { quiet: true, alive: () => pid() === projectId });
    if (pid() !== projectId) return;
    if (entry.status === "failed") throw new Error(entry.code === "OPERATION_MISSING" ? "Region editing (region_edit) is not available on this server yet." : entry.error || "The edit did not complete.");
    const out = outputOf(entry, "region_edit");
    if (!out) throw new Error("The edit finished without an image.");
    saveEditInfo(out.id, { baseAssetId: baseId, regions: [{ ...region, pin: pin.n }] });
    pin.phase = "Applying";
    let qa = null;
    try {
      ({ qa } = await acceptGenerated(out));
    } catch (e) {
      // Shown anyway; the next edit builds on the last approved version.
      qa = `${out.qa?.reason || "flagged"} (not approved: ${e.message})`;
      setQaNote(out.id, qa);
    }
    Object.assign(pin, { status: "applied", end: Date.now(), resultId: out.id, baseId, qa, phase: null });
    S.chain.push(out.id);
    saveChain();
    savePins();
    S.viewing = null;
    hooks.refresh();
    await revealVersion(out.id);
  } catch (e) {
    if (pid() !== projectId) return;
    Object.assign(pin, { status: "failed", end: Date.now(), error: e?.message || String(e), phase: null });
    savePins();
  } finally {
    hooks.refresh();
  }
}

// Undo: step back one version (client-side base pointer).
export function undoVersion() {
  if (runningPin()) {
    toast("Wait for the edit in progress to finish, then undo.", { title: "Undo" });
    return false;
  }
  const last = S.chain.pop();
  if (!last) return false;
  saveChain();
  for (const p of S.pins) if (p.resultId === last) p.status = "undone";
  savePins();
  S.viewing = null;
  const prev = latestShown();
  if (prev) revealVersion(prev);
  toast(`Back to v${versions().length - 1}.`, { title: "Undo" });
  hooks.refresh();
  return true;
}

/* ---------------- Canvas mount + rendering ---------------- */

export function mountDesign(main) {
  if (!S.design || S.design.pid !== pid()) buildDesign();
  if (S.design.root.parentNode !== main) main.replaceChildren(S.design.root);
  syncDesign();
  requestAnimationFrame(() => S.design?.dc.refit());
}

function buildDesign() {
  S.design?.dc.destroy();
  const d = { pid: pid(), pinEls: new Map(), shownId: null, loading: null };
  d.dc = createDesignCanvas({
    onLayout: () => renderOverlay(d),
    onTap: (nx, ny, { readonly }) => {
      if (readonly) return toast(`Viewing v${versionNo(S.viewing)}. Go back to the latest version to comment.`, { title: "Read-only" });
      const cur = draftPin();
      if (cur && hasContent(cur)) return closeDraft();
      placePin(nx, ny);
    },
    onTapOutside: () => closeDraft(),
    onDrop: (nx, ny, dt, target) => handleDrop(nx, ny, dt, target),
    onSketchMove: (pts) => {
      d.live = pts;
      renderSketches(d);
    },
    onSketch: (pts) => addStroke(pts),
  });
  const tool = (name, label, key, ico) =>
    h("button", { type: "button", class: "tool", dataset: { tool: name }, "aria-label": `${label} (${key})`, title: `${label}  ${key}`, onclick: () => setTool(name) }, ico, h("span", { class: "tool-key", "aria-hidden": "true" }, key));
  const action = (name, label, key, ico, fn) =>
    h("button", { type: "button", class: "tool", dataset: { act: name }, "aria-label": `${label}${key ? ` (${key})` : ""}`, title: `${label}${key ? `  ${key}` : ""}`, onclick: fn }, ico);
  d.toolbar = h(
    "div",
    { class: "toolbar", role: "toolbar", "aria-label": "Canvas tools", "aria-orientation": "vertical" },
    tool("comment", "Comment", "C", glyph("comment", 18)),
    tool("sketch", "Sketch", "S", glyph("pencil", 18)),
    tool("pan", "Move", "H", glyph("hand", 18)),
    h("span", { class: "tool-sep", "aria-hidden": "true" }),
    action("undo", "Undo last edit", "Z", icon("undo", 18), () => undoVersion()),
    h("span", { class: "tool-sep", "aria-hidden": "true" }),
    action("zin", "Zoom in", "+", icon("plus", 18), () => d.dc.zoomBy(1.25)),
    action("zout", "Zoom out", "-", icon("minus", 18), () => d.dc.zoomBy(0.8)),
    action("fit", "Fit to screen", "0", icon("fit", 18), () => d.dc.fit()),
  );
  d.hint = h("div", { class: "dc-hint", hidden: true }, "Click anywhere on the venue to add a comment");
  d.area = h("div", { class: "pin-area", hidden: true, "aria-hidden": "true" });
  d.sketchSvg = h("svg", { class: "sketch-layer", "aria-hidden": "true" });
  d.dc.overlay.append(d.sketchSvg, d.area);
  buildPill(d);
  d.msg = h("div", { class: "design-msg", "aria-live": "polite" });
  d.actions = h("div", { class: "design-actions" });
  d.sketchBar = h(
    "div",
    { class: "sketch-bar", hidden: true, dataset: { ui: "1" } },
    h("span", { class: "sketch-bar-dot", "aria-hidden": "true" }),
    h("span", { class: "sketch-bar-text" }),
    h("span", { class: "sketch-bar-sep", "aria-hidden": "true" }),
    h("button", { type: "button", class: "sk-btn", dataset: { act: "undo-stroke" }, title: "Undo the last stroke (Z)", onclick: () => undoStroke() }, icon("undo", 14), h("span", null, "Undo")),
    h("button", { type: "button", class: "sk-btn", dataset: { act: "clear-sketch" }, title: "Clear the drawing", onclick: () => clearSketch() }, icon("close", 14), h("span", null, "Clear")),
    h("button", { type: "button", class: "sk-btn primary", dataset: { act: "done-sketch" }, title: "Finish and describe the drawing (Enter)", onclick: () => finishSketch() }, h("span", null, "Done")),
  );
  buildSticker(d);
  buildRuler(d);
  const stage = h("div", { class: "design-stage" }, d.dc.root, d.toolbar, d.hint, d.sketchBar, d.placeBar, d.ruler.bar);
  d.root = h("section", { class: "design", "aria-label": "Design canvas" }, stage, h("div", { class: "design-foot" }, d.msg, d.actions));
  S.design = d;
  const saved = local.get("tool", "comment");
  d.dc.setTool(["pan", "sketch"].includes(saved) ? saved : "comment");
}

export function setTool(name) {
  if (!S.design) return;
  if (name !== "comment") closeDraft();
  S.design.dc.setTool(name);
  local.set("tool", name);
  hooks.refresh();
}

/* ---------- the comment pill ---------- */

function buildPill(d) {
  const num = h("span", { class: "pill-num", "aria-hidden": "true" });
  const input = h("textarea", { class: "pill-input", rows: "1", maxlength: "500", placeholder: "Add a comment…", "aria-label": "Comment", spellcheck: "true" });
  const send = h("button", { type: "button", class: "pill-send", "aria-label": "Send this comment", title: "Send  Enter" }, glyph("send", 14));
  const refs = h("div", { class: "pill-refs" });
  const area = h("input", { type: "range", min: "4", max: "25", step: "1", class: "pill-area", "aria-label": "Area of the change, percent of the image" });
  const areaVal = h("span", { class: "pill-area-val tnum" });
  const upload = h("button", { type: "button", class: "btn btn-ghost btn-xs pill-upload", title: "Upload a reference photo" }, icon("upload", 13), "Upload");
  const decor = h("button", { type: "button", class: "btn btn-ghost btn-xs pill-upload", title: "Choose one of your decor pieces and its angle" }, icon("layers", 13), "Decor");
  const redraw = h("button", { type: "button", class: "btn btn-ghost btn-xs pill-upload", title: "Change the drawing" }, "Redraw");
  const placeExact = h("button", { type: "button", class: "btn btn-ghost btn-xs pill-upload pill-place", title: "Place the attached decor exactly inside your drawing, at its real angle and size" }, "Place exactly");
  const del = h("button", { type: "button", class: "btn btn-ghost btn-xs pill-upload pill-del", title: "Delete this comment and its drawing" }, icon("close", 13), "Delete");
  const el = h(
    "div",
    { class: "pill", role: "dialog", "aria-label": "Comment", hidden: true, dataset: { ui: "1" } },
    h("div", { class: "pill-row" }, num, input, send),
    h("div", { class: "pill-extra" }, refs, h("div", { class: "pill-foot" }, h("label", { class: "pill-arearow" }, h("span", { class: "pill-label" }, "Area"), area, areaVal), decor, upload, placeExact, redraw, del)),
  );
  const grow = () => {
    input.style.height = "auto";
    const sh = input.scrollHeight || 0;
    if (sh) input.style.height = `${Math.min(sh, 140)}px`;
  };
  input.addEventListener("input", () => {
    const p = draftPin();
    if (!p) return;
    p.comment = input.value;
    grow();
    clearTimeout(d.saveT);
    d.saveT = setTimeout(savePins, 300);
  });
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendPin(draftPin());
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDraft();
    }
  });
  send.addEventListener("click", () => sendPin(draftPin()));
  area.addEventListener("input", () => {
    const p = draftPin();
    if (!p) return;
    p.r = clamp(Number(area.value) / 100, 0.04, 0.25);
    areaVal.textContent = `${Math.round(p.r * 100)}%`;
    savePins();
    renderOverlay(d);
  });
  decor.addEventListener("click", () => openDecorPicker(draftPin()));
  redraw.addEventListener("click", () => redrawPin(draftPin()?.id));
  placeExact.addEventListener("click", () => placeFromSketch(draftPin()));
  del.addEventListener("click", () => {
    const p = draftPin();
    if (p) removePin(p.id);
  });
  upload.addEventListener("click", async () => {
    const p = draftPin();
    if (!p) return;
    const b = await pickFile();
    if (b) attachUpload(p, b);
  });
  for (const ev of ["pointerdown", "pointerup", "wheel"]) el.addEventListener(ev, (e) => e.stopPropagation(), ev === "wheel" ? { passive: true } : undefined);
  d.pill = { el, num, input, send, refs, area, areaVal, upload, redraw, placeExact, grow, for: null, sig: "" };
  d.dc.overlay.append(el);
}

function focusPill(selectEnd) {
  requestAnimationFrame(() => {
    const d = S.design;
    if (!d || !draftPin()) return;
    try {
      d.pill.input.focus({ preventScroll: true });
      if (selectEnd) {
        const n = d.pill.input.value.length;
        d.pill.input.setSelectionRange(n, n);
      }
    } catch {
      /* not focusable */
    }
  });
}

function refThumb(r) {
  if (r.kind === "lib") return h("img", { src: libPath(r.path), alt: r.label, draggable: "false" });
  if (r.assetId) return assetImg(r.assetId, r.label);
  return h("img", { src: r.blobUrl || "", alt: r.label, draggable: "false" });
}
function renderPill(d, pin, vw, vh) {
  const P = d.pill;
  if (!pin || S.viewing) {
    P.el.hidden = true;
    P.for = null;
    return;
  }
  if (P.for !== pin.id) {
    P.for = pin.id;
    P.input.value = pin.comment || "";
    P.area.value = String(Math.round(pin.r * 100));
    P.areaVal.textContent = `${Math.round(pin.r * 100)}%`;
    P.num.textContent = String(pin.n);
    P.sig = "";
    requestAnimationFrame(P.grow);
  }
  P.el.querySelector(".pill-arearow").hidden = !!pin.sketch?.length;
  P.redraw.hidden = !pin.sketch?.length;
  P.placeExact.hidden = !pin.sketch?.length;
  const sig = JSON.stringify(pin.refs.map((r) => [r.key, r.status, r.assetId]));
  if (sig !== P.sig) {
    P.sig = sig;
    P.refs.replaceChildren(
      ...pin.refs.map((r) =>
        h(
          "span",
          { class: `ref-chip${r.status === "checking" ? " checking" : ""}${r.status === "error" ? " error" : ""}`, title: r.status === "error" ? `${r.label}: ${r.error || "failed"}` : r.label },
          refThumb(r),
          r.status === "checking" ? h("span", { class: "ref-state" }, h("span", { class: "spinner", "aria-hidden": "true" })) : r.status === "error" ? h("span", { class: "ref-state" }, "!") : null,
          h("button", { type: "button", class: "ref-x", "aria-label": `Remove ${r.label}`, onclick: () => detachRef(pin, r.key) }, "×"),
        ),
      ),
      ...(pin.refs.length < MAX_PIN_REFS ? [h("span", { class: "pill-hint" }, pin.refs.length ? "Add one more reference" : "Choose Decor and its angle, or drop an image here")] : []),
    );
    P.upload.disabled = pin.refs.length >= MAX_PIN_REFS;
  }
  P.el.hidden = false;
  const [ax, ay] = d.dc.toScreen(pin.cx, pin.cy);
  const cw = Math.min(340, vw - 16);
  P.el.style.width = `${cw}px`;
  const ch = P.el.offsetHeight || 120;
  let left = ax + 22;
  let top = ay - 20;
  if (left + cw > vw - 8) left = ax - 22 - cw;
  if (left < 8) {
    left = clamp(ax - cw / 2, 8, Math.max(8, vw - cw - 8));
    top = ay + 24;
  }
  top = clamp(top, 8, Math.max(8, vh - ch - 8));
  P.el.style.left = `${left}px`;
  P.el.style.top = `${top}px`;
}

/* ---------- pins in screen space ---------- */

const ringC = 2 * Math.PI * 17;
const progressOf = (p) => (p.status === "running" ? 1 - Math.exp(-(Date.now() - (p.start || Date.now())) / EXPECTED_MS) : p.status === "applied" ? 1 : 0);

function makePinEl(d, id) {
  const fg = h("circle", { class: "pin-ring-fg", cx: 20, cy: 20, r: 17, "stroke-dasharray": ringC.toFixed(2), "stroke-dashoffset": ringC.toFixed(2) });
  const ring = h("svg", { class: "pin-ring", viewBox: "0 0 40 40", "aria-hidden": "true" }, h("circle", { class: "pin-ring-bg", cx: 20, cy: 20, r: 17 }), fg);
  const num = h("span", { class: "pin-num" });
  const btnEl = h("button", { type: "button", class: "pin-btn" }, num);
  const time = h("span", { class: "pin-time tnum" });
  const tip = h("span", { class: "pin-tip", role: "tooltip" });
  const bubble = h("div", { class: "pin-bubble", hidden: true });
  const el = h("div", { class: "pin", dataset: { ui: "1", pin: id } }, ring, btnEl, time, tip, bubble);
  Object.assign(el, { _fg: fg, _num: num, _btn: btnEl, _time: time, _tip: tip, _bubble: bubble, _sig: "" });
  btnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const p = pinById(id);
    if (!p) return;
    if (p.status === "draft") return S.draft === id ? closeDraft() : openDraft(id);
    if (p.status === "queued") {
      // Pull a waiting pin back into editing.
      p.status = "draft";
      savePins();
      return openDraft(id);
    }
    el.classList.toggle("show-tip");
  });
  for (const ev of ["pointerdown", "pointerup"]) el.addEventListener(ev, (e) => e.stopPropagation());
  d.dc.overlay.append(el);
  d.pinEls.set(id, el);
  return el;
}

function pinBubble(p) {
  if (p.status !== "failed") return null;
  return [
    h("p", { class: "pin-err" }, h("strong", null, "Edit failed. "), p.error || "The edit did not complete."),
    h(
      "div",
      { class: "row" },
      btn("Retry", () => retryPin(p.id), { small: true, primary: true, cls: "btn-xs" }),
      p.sketch?.length ? btn("Redraw", () => redrawPin(p.id), { small: true, ghost: true, cls: "btn-xs" }) : null,
      btn("Remove", () => removePin(p.id), { small: true, ghost: true, cls: "btn-xs" }),
    ),
  ];
}

function renderOverlay(d) {
  if (!d.dc.size.W || S.design !== d) return;
  const r = d.dc.root.getBoundingClientRect();
  const vw = r.width || d.dc.root.clientWidth || 800;
  const vh = r.height || d.dc.root.clientHeight || 500;
  const live = new Set();
  const minSide = Math.min(d.dc.size.W, d.dc.size.H) * d.dc.scale;
  const list = S.viewing ? [] : activePins();
  for (const p of list) {
    const el = d.pinEls.get(p.id) || makePinEl(d, p.id);
    live.add(p.id);
    const [sx, sy] = d.dc.toScreen(p.cx, p.cy);
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    el.className = `pin s-${p.status}${S.draft === p.id ? " editing" : ""}${p.qa && p.status === "applied" ? " flagged" : ""}${el.classList.contains("show-tip") ? " show-tip" : ""}`;
    el._num.textContent = String(p.n);
    const text = (p.comment || "").trim() || (p.refs.length ? "Reference attached" : "New comment");
    const stateText = { draft: "Draft", queued: "Queued", running: p.phase || "Generating", applied: `Applied${p.qa ? ` · QA: ${p.qa}` : ""}`, failed: "Failed" }[p.status] || "";
    el._tip.textContent = `${text}${stateText ? ` — ${stateText}` : ""}`;
    el._btn.setAttribute("aria-label", `Comment ${p.n}: ${text}. ${stateText}`);
    el._time.textContent = p.status === "running" ? fmtElapsed(Date.now() - (p.start || Date.now())) : p.status === "queued" ? "Queued" : "";
    el._fg.setAttribute("stroke-dashoffset", (ringC * (1 - progressOf(p))).toFixed(2));
    const sig = `${p.status}|${p.error}`;
    if (sig !== el._sig) {
      el._sig = sig;
      const b = pinBubble(p);
      el._bubble.hidden = !b;
      el._bubble.replaceChildren(...(b || []));
    }
  }
  for (const [id, el] of d.pinEls)
    if (!live.has(id)) {
      el.remove();
      d.pinEls.delete(id);
    }
  // Area of influence for the open draft and the pin being generated.
  const ap = (!S.viewing && (draftPin() || runningPin())) || null;
  d.area.hidden = !ap;
  if (ap?.sketch?.length) d.area.hidden = true;
  else if (ap) {
    const [sx, sy] = d.dc.toScreen(ap.cx, ap.cy);
    const rad = ap.r * minSide;
    Object.assign(d.area.style, { left: `${sx - rad}px`, top: `${sy - rad}px`, width: `${rad * 2}px`, height: `${rad * 2}px` });
    d.area.classList.toggle("live", ap.status === "running");
  }
  renderSketches(d);
  renderPlacement(d);
  renderRuler(d);
  renderPill(d, S.viewing ? null : draftPin(), vw, vh);
}

// Pending sketches (and the stroke being drawn) in screen space; applied ones are part of the image.
function renderSketches(d) {
  if (!d.sketchSvg || !d.dc.size.W) return;
  const map = (x, y) => d.dc.toScreen(x, y);
  const paths = [];
  const pins = S.viewing ? [] : activePins().filter((p) => p.sketch?.length);
  for (const p of pins)
    for (const s of p.sketch) {
      const dd = strokePath(s, map);
      paths.push(h("path", { d: dd, class: "sk-halo" }), h("path", { d: dd, class: `sk-line${p.status === "running" ? " live" : ""}` }));
    }
  for (const s of S.viewing ? [] : sketchDraft()) {
    const dd = strokePath(s, map);
    paths.push(h("path", { d: dd, class: "sk-halo" }), h("path", { d: dd, class: "sk-line draft" }));
  }
  if (d.live?.length > 1) {
    const dd = strokePath(d.live, map);
    paths.push(h("path", { d: dd, class: "sk-halo" }), h("path", { d: dd, class: "sk-line" }));
  }
  d.sketchSvg.replaceChildren(...paths);
}

export function syncDesign() {
  const d = S.design;
  if (!d) return;
  const show = shownId();
  if (!show) {
    d.dc.setEmpty("Approve the isometric overview first.");
    return;
  }
  if (d.shownId !== show && d.loading !== show) {
    d.loading = show;
    imageInfo(show)
      .then((info) => {
        if (S.design !== d || d.loading !== show) return;
        d.loading = null;
        d.shownId = show;
        d.dc.setImage(info.url, info.w, info.h);
        hooks.refresh();
      })
      .catch((e) => {
        if (S.design !== d) return;
        d.loading = null;
        d.dc.setEmpty(`The venue image could not be loaded: ${e.message}`);
      });
  }
  const readonly = !!S.viewing && S.viewing !== latestShown();
  d.dc.setReadonly(readonly);
  if (readonly && S.draft) closeDraft();
  d.toolbar.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === d.dc.tool)));
  const undo = d.toolbar.querySelector('[data-act="undo"]');
  if (undo) undo.disabled = !S.chain.length || !!runningPin();
  d.hint.hidden = readonly || !!S.placing || activePins().length > 0 || !d.dc.size.W || d.dc.tool !== "comment";
  const n = sketchDraft().length;
  d.sketchBar.hidden = readonly || !d.dc.size.W || (d.dc.tool !== "sketch" && !n);
  d.sketchBar.querySelector(".sketch-bar-text").textContent = n ? `Sketch \u00b7 ${n} stroke${n === 1 ? "" : "s"}` : "Draw in perspective on the venue";
  for (const act of ["undo-stroke", "clear-sketch", "done-sketch"]) d.sketchBar.querySelector(`[data-act="${act}"]`).disabled = !n;
  renderFoot(d, readonly);
  renderOverlay(d);
}

// Shows a version with the wipe (used for new results and undo).
async function revealVersion(id) {
  const d = S.design;
  if (!d) return;
  d.loading = id;
  try {
    const info = await imageInfo(id);
    if (S.design !== d || d.loading !== id) return;
    await d.dc.reveal(info.url, info.w, info.h);
    if (S.design === d && d.loading === id) {
      d.loading = null;
      d.shownId = id;
    }
  } catch (e) {
    if (S.design === d) d.loading = null;
    toastErr(e, "Could not show the new version");
  }
  hooks.refresh();
}

function renderFoot(d, readonly) {
  const msg = [];
  const acts = [];
  const run = runningPin();
  const q = queuedPins().length;
  const base = currentBase();
  if (readonly) {
    msg.push(h("span", null, h("strong", null, `v${versionNo(S.viewing)}`), h("span", { class: "muted" }, " · read-only")));
    acts.push(btn("Back to latest", () => {
      S.viewing = null;
      hooks.render();
    }, { small: true, primary: true }));
  } else {
    if (run) msg.push(h("span", { class: "msg-live" }, h("span", { class: "live-dot", "aria-hidden": "true" }), `Comment ${run.n}: ${run.phase || "Generating"}`, h("span", { class: "elapsed", dataset: { since: String(run.start) } }, fmtElapsed(Date.now() - run.start)), q ? h("span", { class: "muted" }, ` · ${q} queued`) : null));
    else if (S.chain.length) msg.push(h("span", null, h("strong", null, `v${versions().length - 1}`), h("span", { class: "muted" }, ` · ${S.chain.length} change${S.chain.length === 1 ? "" : "s"} applied. When the venue is finished, generate the 360 view.`)));
    else msg.push(h("span", { class: "muted" }, "Click the venue, type a comment and press Enter. Each comment is applied on its own."));
    const key = `v360:${base}`;
    const line = jobLine(key, "Building the 360 view");
    if (line && !run) msg.push(line);
    acts.push(
      btn("Generate 360 view", () => runLookAround(currentBase()), { small: true, primary: S.chain.length > 0 && !run, ghost: !(S.chain.length > 0 && !run), busy: isRunning(key), disabled: !base, id: "look-around", ico: icon("eye", 15) }),
      btn("Present", () => hooks.present?.(), { small: true, ghost: true, ico: glyph("present", 15), id: "present-design" }),
    );
  }
  d.msg.replaceChildren(...msg.filter(Boolean));
  d.actions.replaceChildren(...acts.filter(Boolean));
}

export function designTick() {
  const d = S.design;
  if (d && runningPin()) renderOverlay(d);
}

/* ---------- drops ---------- */

async function handleDrop(nx, ny, dt, target) {
  const types = [...(dt?.types || [])];
  let item = null;
  if (types.includes(LIB_MIME)) {
    try {
      item = JSON.parse(dt.getData(LIB_MIME));
    } catch {
      return toast("That library item could not be read.", { type: "error", title: "Library" });
    }
  }
  const file = !item ? [...(dt?.files || [])].find((x) => /^image\//.test(x.type)) : null;
  if (!item && !file) return toast("Drop a library image or a photo.", { title: "Canvas" });
  const onPill = target?.closest?.(".pill");
  const pinId = target?.closest?.("[data-pin]")?.dataset.pin;
  let pin = onPill ? draftPin() : pinId ? pinById(pinId) : null;
  if (pin && pin.status === "queued") pin.status = "draft";
  if (!pin || pin.status !== "draft") pin = placePin(nx, ny);
  else openDraft(pin.id);
  if (item) attachLib(pin, item);
  else attachUpload(pin, file);
}

// Library click from the side panel: attach to the open pill.
export function useLibrary(item) {
  const p = draftPin();
  if (!p) return toast("Click the venue to place a comment, then pick a reference (or drag the image onto the venue).", { title: "Library" });
  attachLib(p, item);
  focusPill(true);
}

/* ---------------- Place decor exactly (cut-out, drag, resize) ---------------- */
// 1. Render the piece from the venue camera on a chroma background (copied from its character sheet).
// 2. Cut it out (free). 3. The planner drags and resizes it on the venue. 4. Paste it exactly, with an
// optional AI pass that may only add shadow and light; the object's pixels are protected server side.

const FACINGS = [
  { az: 0, label: "Front" },
  { az: 45, label: "Front right" },
  { az: 90, label: "Right side" },
  { az: 135, label: "Back right" },
  { az: 180, label: "Back" },
  { az: 225, label: "Back left" },
  { az: 270, label: "Left side" },
  { az: 315, label: "Front left" },
];
const placedViewOf = (cid, az, el) =>
  latest("component_sheet", (a) => a.componentId === cid && a.viewType === "placed" && a.azimuth === az && a.elevation === el && a.status !== "rejected");
const cutoutOf = (sourceId) => latest("decor_cutout", (a) => a.sourceAssetId === sourceId);

async function prepareCutout(item, az, el, onPhase) {
  const cid = decorComponentId(item.rootId);
  let view = placedViewOf(cid, az, el);
  if (!view) {
    onPhase("Rendering the piece from the venue camera");
    const entry = await runJobRetry(`placeview:${cid}:${az}:${el}`, "component_sheet", { componentId: cid, viewType: "placed", azimuth: az, elevation: el }, { quiet: true });
    if (entry.status === "failed") throw new Error(entry.error || "The placement view could not be rendered.");
    view = outputOf(entry, "component_sheet");
    if (!view) throw new Error("The placement view finished without an image.");
  }
  if (view.status !== "approved") await acceptGenerated(view);
  let cut = cutoutOf(view.id);
  if (!cut) {
    onPhase("Cutting it out");
    const data = await write((revision) => api("POST", projPath(`/assets/${encodeURIComponent(view.id)}/cutout`), { revision }));
    cut = data.asset;
  }
  return cut;
}

export function openPlaceDialog(item, { box = null } = {}) {
  if (!currentBase()) return toast("Approve the isometric overview first.", { type: "error", title: "Place decor" });
  let az = local.get("placeFacing", 45);
  let el = local.get("placeTilt", 40);
  const body = h("div", { class: "place-dialog" });
  const m = modal(`Place ${item.label}`, body, { cls: "wide" });
  let busy = null;
  const draw = () => {
    body.replaceChildren(...[
      h("p", { class: "muted" }, "The piece is rendered from the same camera as your venue, cut out, and then you drag and resize it exactly where it goes. Its colours and design are copied from the character sheet."),
      h(
        "div",
        { class: "place-grid" },
        h(
          "div",
          { class: "field" },
          "Which side faces the camera?",
          h(
            "div",
            { class: "facing-grid", role: "group" },
            FACINGS.map((f) =>
              h("button", { type: "button", class: "chip", "aria-pressed": String(f.az === az), disabled: !!busy, onclick: () => { az = f.az; local.set("placeFacing", az); draw(); } }, f.label),
            ),
          ),
        ),
        h(
          "label",
          { class: "field" },
          `Camera tilt: ${el}° above the ground`,
          h("input", { type: "range", min: "15", max: "75", step: "5", value: String(el), disabled: !!busy, oninput: (e) => { el = Number(e.target.value); local.set("placeTilt", el); draw(); } }),
          h("span", { class: "hint" }, "Match the drone view of your venue. Most isometric views are about 40 degrees."),
        ),
      ),
      busy ? h("div", { class: "progress", role: "status" }, h("span", { class: "live-dot", "aria-hidden": "true" }), busy) : null,
      h(
        "div",
        { class: "row" },
        btn(placedViewOf(decorComponentId(item.rootId), az, el) ? "Use this angle" : "Render and cut out", async () => {
          try {
            const cut = await prepareCutout(item, az, el, (phase) => { busy = phase; draw(); });
            m.close();
            startPlacing(item, cut, box);
          } catch (e) {
            busy = null;
            draw();
            toastErr(e, "Place decor");
          }
        }, { primary: true, busy: !!busy, disabled: !!busy }),
        btn("Cancel", () => m.close(), { quiet: true, disabled: !!busy }),
      ),
    ].filter(Boolean));
  };
  draw();
}

const PLACE_MODES = [
  ["exact", "Exact", "Paste exactly as shown. No AI, no charge."],
  ["shadows", "Shadows", "AI adds only the ground shadow and light; the piece itself is never changed."],
  ["fit", "Fit to scene", "AI re-renders the piece in the venue's camera perspective, keeping its position, size and design."],
];
// Venue scale: image-width fraction per foot, from a line the planner drew over a known length.
const venueScale = () => {
  const v = local.get("venueScale", null);
  return v && v.base === currentBase() && v.perFt > 0 ? v : null;
};
const feetOf = (pl) => {
  const sc = venueScale();
  return sc ? pl.w / sc.perFt : null;
};
function startPlacing(item, cut, box = null) {
  closeDraft();
  const d = S.design;
  if (!d) return;
  const { W, H } = d.dc.size;
  const aspect = cut.height / cut.width;
  let w = 0.22, x, y;
  if (box) {
    // Fit inside the drawn box, standing on its bottom edge.
    w = clamp(Math.min(box.w, (box.h * H) / (aspect * W)), 0.03, 1.2);
    x = box.x + (box.w - w) / 2;
    y = box.y + box.h - (w * W * aspect) / H;
  } else {
    // True size when both the piece's real width and the venue scale are known.
    const sc = venueScale();
    if (sc && item.size?.widthFt) w = clamp(item.size.widthFt * sc.perFt, 0.02, 1.2);
    x = 0.5 - w / 2;
    y = Math.max(0.02, 0.55 - (w * W * aspect) / H);
  }
  S.placing = { item, cut, x, y, w, flip: false, mode: local.get("placeMode", "fit"), status: "editing" };
  hooks.refresh();
}
export const cancelPlacing = () => {
  if (S.placing?.status === "running") return;
  S.placing = null;
  hooks.refresh();
};
const placeHeight = (pl, d) => (pl.w * d.dc.size.W * (pl.cut.height / pl.cut.width)) / d.dc.size.H;

async function commitPlacing() {
  const pl = S.placing;
  const d = S.design;
  if (!pl || pl.status === "running" || !d) return;
  const baseId = currentBase();
  if (!baseId) return toast("There is no approved image to place onto.", { type: "error", title: "Place decor" });
  const ph = placeHeight(pl, d);
  const r = (v) => Math.round(v * 1e5) / 1e5;
  const region = {
    id: `place${Date.now().toString(36)}`,
    cx: r(clamp(pl.x + pl.w / 2, 0, 1)),
    cy: r(clamp(pl.y + ph * 0.6, 0, 1)),
    rx: r(clamp(pl.w * 0.75, 0.01, 0.5)),
    ry: r(clamp(ph * 0.7, 0.01, 0.5)),
    rotation: 0,
    comment: ((pl.mode === "fit"
      ? `${pl.item.label}: re-render the pasted piece in this venue's camera perspective at the same position and size.`
      : `${pl.item.label} placed exactly as pasted; add only its ground shadow and match the lighting.`) +
      (feetOf(pl) ? ` It is about ${Math.round(feetOf(pl))} ft wide${pl.item.size?.heightFt ? ` and ${pl.item.size.heightFt} ft tall` : ""}.` : pl.item.size?.widthFt ? ` Real size: about ${pl.item.size.widthFt} ft wide${pl.item.size.heightFt ? ` and ${pl.item.size.heightFt} ft tall` : ""}.` : "")).slice(0, 500),
    referenceAssetIds: [],
  };
  pl.status = "running";
  pl.start = Date.now();
  hooks.refresh();
  const projectId = pid();
  try {
    const entry = await runJobRetry(`place:${region.id}`, "region_edit", {
      baseAssetId: baseId,
      regions: [region],
      place: { cutoutAssetId: pl.cut.id, x: r(pl.x), y: r(pl.y), w: r(pl.w), flip: pl.flip, mode: pl.mode },
    }, { quiet: true, alive: () => pid() === projectId });
    if (pid() !== projectId) return;
    if (entry.status === "failed") throw new Error(entry.error || "The placement did not complete.");
    const out = outputOf(entry, "region_edit");
    if (!out) throw new Error("The placement finished without an image.");
    saveEditInfo(out.id, { baseAssetId: baseId, regions: [{ ...region, comment: `Placed ${pl.item.label}` }] });
    try {
      const { qa } = await acceptGenerated(out);
      if (qa) setQaNote(out.id, qa);
    } catch (e) {
      setQaNote(out.id, `${out.qa?.reason || "flagged"} (not approved: ${e.message})`);
    }
    S.chain.push(out.id);
    saveChain();
    S.placing = null;
    S.viewing = null;
    hooks.refresh();
    await revealVersion(out.id);
    toast(`${pl.item.label} placed.`, { type: "success", title: "Placed" });
  } catch (e) {
    if (S.placing) S.placing.status = "editing";
    toastErr(e, "Place decor");
  } finally {
    hooks.refresh();
  }
}

// The sticker on the canvas: drag to move, corner handle to resize (aspect locked).
function buildSticker(d) {
  const img = h("div", { class: "place-img" });
  const handle = h("span", { class: "place-handle", "aria-hidden": "true" });
  const size = h("span", { class: "place-size" });
  const el = h("div", { class: "place-sticker", dataset: { ui: "1" }, title: "Drag to move, drag the corner to resize" }, img, handle, size);
  let drag = null;
  el.addEventListener("pointerdown", (e) => {
    const pl = S.placing;
    if (!pl || pl.status === "running") return;
    e.preventDefault();
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    drag = { mode: e.target === handle ? "size" : "move", x: e.clientX, y: e.clientY, start: { ...pl } };
  });
  el.addEventListener("pointermove", (e) => {
    const pl = S.placing;
    if (!drag || !pl) return;
    const s = d.dc.scale;
    const dx = (e.clientX - drag.x) / (d.dc.size.W * s);
    const dy = (e.clientY - drag.y) / (d.dc.size.H * s);
    if (drag.mode === "move") {
      pl.x = clamp(drag.start.x + dx, -pl.w * 0.8, 1 - pl.w * 0.2);
      pl.y = clamp(drag.start.y + dy, -0.5, 0.98);
    } else pl.w = clamp(drag.start.w + dx, 0.03, 1.2);
    renderPlacement(d);
  });
  const end = () => (drag = null);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("wheel", (e) => {
    const pl = S.placing;
    if (!pl || pl.status === "running") return;
    e.preventDefault();
    e.stopPropagation();
    const k = Math.exp(-e.deltaY * 0.001);
    const cx = pl.x + pl.w / 2;
    pl.w = clamp(pl.w * k, 0.03, 1.2);
    pl.x = cx - pl.w / 2;
    renderPlacement(d);
  }, { passive: false });
  d.sticker = { el, img, size, imgFor: null };
  d.dc.overlay.append(el);

  const modeSeg = h(
    "div",
    { class: "place-modes", role: "group", "aria-label": "How to place it" },
    PLACE_MODES.map(([id, label, tip]) =>
      h("button", { type: "button", class: "sk-btn", dataset: { mode: id }, title: tip, onclick: () => { if (S.placing) { S.placing.mode = id; local.set("placeMode", id); renderPlacement(d); } } }, label),
    ),
  );
  d.placeBar = h(
    "div",
    { class: "sketch-bar place-bar", hidden: true, dataset: { ui: "1" } },
    h("span", { class: "sketch-bar-dot", "aria-hidden": "true" }),
    h("span", { class: "sketch-bar-text" }),
    h("span", { class: "sketch-bar-sep", "aria-hidden": "true" }),
    h("button", { type: "button", class: "sk-btn", dataset: { act: "flip" }, onclick: () => { if (S.placing) { S.placing.flip = !S.placing.flip; renderPlacement(d); } } }, "Flip"),
    h("button", { type: "button", class: "sk-btn", dataset: { act: "scale" }, title: "Draw a line over something of known length on the venue", onclick: () => startRuler(d) }, "Set scale"),
    modeSeg,
    h("button", { type: "button", class: "sk-btn", dataset: { act: "cancel" }, onclick: cancelPlacing }, "Cancel"),
    h("button", { type: "button", class: "sk-btn primary", dataset: { act: "place" }, onclick: commitPlacing }, "Place"),
  );
  d.placeBar._modes = modeSeg;
}

// Ruler: drag a line over a known length, then type its length in feet.
function startRuler(d) {
  S.ruler = { a: null, b: null, feet: "" };
  renderRuler(d);
}
function buildRuler(d) {
  const line = h("line", { class: "ruler-line" });
  const svg = h("svg", { class: "ruler-svg", "aria-hidden": "true" }, line);
  const input = h("input", { class: "input input-sm ruler-input", type: "number", min: "0.5", step: "0.5", inputmode: "decimal", placeholder: "ft" });
  const save = h("button", { type: "button", class: "sk-btn primary" }, "Save scale");
  const cancel = h("button", { type: "button", class: "sk-btn" }, "Cancel");
  const text = h("span", { class: "sketch-bar-text" });
  const bar = h("div", { class: "sketch-bar ruler-bar", dataset: { ui: "1" } }, h("span", { class: "sketch-bar-dot", "aria-hidden": "true" }), text, input, save, cancel);
  const layer = h("div", { class: "ruler-layer", dataset: { ui: "1" } }, svg);
  const toImg = (e) => {
    const r = d.dc.root.getBoundingClientRect();
    const s = d.dc.scale;
    const [ox, oy] = d.dc.toScreen(0, 0);
    return [(e.clientX - r.left - ox) / (d.dc.size.W * s), (e.clientY - r.top - oy) / (d.dc.size.H * s)];
  };
  let drawing = false;
  layer.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    layer.setPointerCapture(e.pointerId);
    S.ruler.a = toImg(e);
    S.ruler.b = S.ruler.a;
    drawing = true;
    renderRuler(d);
  });
  layer.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    S.ruler.b = toImg(e);
    renderRuler(d);
  });
  layer.addEventListener("pointerup", () => {
    drawing = false;
    renderRuler(d);
    setTimeout(() => input.focus(), 0);
  });
  save.addEventListener("click", () => {
    const r = S.ruler;
    const ft = Number(input.value);
    if (!r?.a || !r?.b) return toast("Drag a line over something of known length first.", { title: "Set scale" });
    if (!(ft > 0 && ft < 2000)) return toast("Type the real length of that line in feet.", { title: "Set scale" });
    const { W, H } = d.dc.size;
    const len = Math.hypot(r.b[0] - r.a[0], ((r.b[1] - r.a[1]) * H) / W);
    if (len < 0.01) return toast("Draw a longer line.", { title: "Set scale" });
    local.set("venueScale", { perFt: len / ft, base: currentBase(), at: Date.now() });
    S.ruler = null;
    input.value = "";
    toast(`Scale saved: ${ft} ft across that line.`, { type: "success", title: "Set scale" });
    hooks.refresh();
  });
  cancel.addEventListener("click", () => {
    S.ruler = null;
    hooks.refresh();
  });
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") save.click();
    if (e.key === "Escape") cancel.click();
  });
  d.ruler = { layer, line, bar, text };
  d.dc.overlay.append(layer);
}
function renderRuler(d) {
  if (!d.ruler) return;
  const r = S.viewing ? null : S.ruler;
  d.ruler.layer.hidden = !r;
  d.ruler.bar.hidden = !r;
  if (!r) return;
  if (d.placeBar) d.placeBar.hidden = true;
  d.ruler.text.textContent = r.a && r.b && r.a !== r.b ? "That line is" : "Drag over something of known length: the stairs, a path, the gate";
  if (r.a && r.b) {
    const [x1, y1] = d.dc.toScreen(r.a[0], r.a[1]);
    const [x2, y2] = d.dc.toScreen(r.b[0], r.b[1]);
    Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => d.ruler.line.setAttribute(k, v.toFixed(1)));
  }
}

function renderPlacement(d) {
  if (!d.sticker) return;
  const pl = S.viewing ? null : S.placing;
  d.sticker.el.hidden = !pl;
  d.placeBar.hidden = !pl;
  if (d.sketchBar && pl) d.sketchBar.hidden = true;
  if (!pl || !d.dc.size.W) return;
  if (d.sticker.imgFor !== pl.cut.id) {
    d.sticker.imgFor = pl.cut.id;
    d.sticker.img.replaceChildren(assetImg(pl.cut.id, pl.item.label));
  }
  const [x0, y0] = d.dc.toScreen(pl.x, pl.y);
  const [x1, y1] = d.dc.toScreen(pl.x + pl.w, pl.y + placeHeight(pl, d));
  Object.assign(d.sticker.el.style, { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
  d.sticker.el.classList.toggle("flipped", pl.flip);
  const ft = feetOf(pl);
  d.sticker.size.hidden = !ft;
  if (ft) d.sticker.size.textContent = `\u2248 ${ft >= 10 ? Math.round(ft) : ft.toFixed(1)} ft wide`;
  d.sticker.el.classList.toggle("running", pl.status === "running");
  const running = pl.status === "running";
  d.placeBar.querySelector(".sketch-bar-text").textContent = running
    ? `Placing ${pl.item.label} ${fmtElapsed(Date.now() - (pl.start || Date.now()))}`
    : `${pl.item.label}: drag to move, corner or scroll to resize`;
  for (const b of d.placeBar._modes.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.mode === pl.mode));
  for (const b of d.placeBar.querySelectorAll("button, input")) b.disabled = running;
}

/* ---------------- Look around (360 of the current design) ---------------- */

export const runLookAround = (id) => lookAround(id).catch((e) => toastErr(e, "Look around"));
export async function lookAround(designId, { alive, open = true } = {}) {
  if (!designId) throw new Error("There is no approved design yet.");
  const pred = (a) => (a.designAssetId || optionsOf(a).designAssetId) === designId;
  let out = approvedOf("venue_360", pred) || latest("venue_360", pred);
  if (!out) {
    const entry = await runJobRetry(`v360:${designId}`, "venue_360", { designAssetId: designId }, { quiet: true, alive });
    if (entry.status === "failed") throw new Error(entry.error || "The 360 view could not be generated.");
    out = outputOf(entry, "venue_360");
    if (!out) throw new Error("The 360 job finished without an image.");
  }
  if (out.status !== "approved") {
    try {
      const { qa } = await acceptGenerated(out);
      if (qa) toast(`Quality check: ${qa}. Shown anyway.`, { title: "Look around" });
    } catch (e) {
      toast(`The 360 view could not be approved (${e.message}); showing it anyway.`, { title: "Look around" });
    }
  }
  if (open) openViewerModal(out.id, `Look around v${versionNo(designId) ?? ""}`.trim());
  hooks.refresh();
  return out;
}

/* ---------------- History panel ---------------- */

export function historyPanel() {
  const vs = versions();
  if (!vs.length) return h("p", { class: "empty-line" }, "Versions appear once the overview is approved.");
  const show = shownId();
  const last = vs.at(-1).id;
  const run = runningPin();
  return h(
    "ol",
    { class: "history" },
    [...vs].reverse().map((v) => {
      const info = editInfo(v.id);
      const qa = qaNote(v.id);
      const notApproved = assetById(v.id)?.status !== "approved";
      return h(
        "li",
        { class: `hist${v.id === show ? " shown" : ""}` },
        h("button", { type: "button", class: "hist-thumb", "aria-label": `Show v${v.n}`, onclick: () => {
          S.viewing = v.id === last ? null : v.id;
          hooks.render();
        } }, assetImg(v.id, "")),
        h(
          "div",
          { class: "hist-body" },
          h("div", { class: "row-between" }, h("strong", null, `v${v.n} · ${v.label}`), v.id === last ? h("span", { class: "badge ok" }, "Latest") : null),
          h("p", { class: "muted small hist-text" }, v.n === 0 ? "Isometric overview from your photos" : info?.comment || "Edit"),
          qa || notApproved ? h("span", { class: "qa-chip", title: qa || "" }, `QA: ${qa || "not approved"}`) : null,
          v.id === last && v.n > 0 ? h("div", { class: "row" }, btn("Undo", () => undoVersion(), { small: true, ghost: true, cls: "btn-xs", disabled: !!run, ico: icon("undo", 13) })) : null,
        ),
      );
    }),
  );
}

export function resetDesign() {
  S.design?.dc.destroy();
  S.design = null;
}
