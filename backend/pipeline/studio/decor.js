// Step 2: decor. Pick decor from the library or upload photos, edit it by circling or sketching on it,
// then build a character sheet (consistent front/side/top/detail views) that becomes the element's
// master reference for the Design step.
import {
  S, ELEMENTS, elLabel, local, allAssets, assetById, latest, uploadImages, screenPending, approveAsset, acceptGenerated,
  runJobRetry, isRunning, jobLine, pickFile, dropTarget, assetImg, lightbox, outputOf, btn, modal, loadLibrary, libPath,
  importReference, write, api, projPath, h, toast, clamp,
} from "./core.js";
import { simplifyStroke, sketchBounds, sketchPoints, strokePath, SKETCH_MAX_STROKES, SKETCH_MAX_TOTAL, SKETCH_COMMENT } from "./sketch.js";

const MIN_R = 0.02;
const MAX_REGIONS = 8;
const MAX_EXTRA_REFS = 3;
const editKey = (id) => `decoredit:${id}`;
const sheetKey = (cid) => `decorsheet:${cid}`;
const rid = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const compIdOf = (rootId) => `d_${String(rootId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;

// UI state kept outside the render loop so drawings and comments survive refreshes.
const D = { selected: null, tab: "edit", regions: [], open: null, tool: "circle", busy: null, error: null, root: null, sig: "" };

/* ---------------- Decor items ---------------- */

// Library picks are remembered per project so design-pin references do not show up here.
const picks = () => local.get("decorPicks", []);
// Browser-local details, falling back to the saved component so other browsers see the same piece.
const componentOf = (rootId) => (S.project?.components || []).find((c) => c.id === compIdOf(rootId)) || null;
const meta = (rootId) => {
  const c = componentOf(rootId);
  const saved = local.get("decorMeta", {})[rootId] || {};
  return { ...(c ? { type: c.category, description: c.description } : {}), ...saved };
};
function setMeta(rootId, patch) {
  const m = local.get("decorMeta", {});
  m[rootId] = { ...(m[rootId] || {}), ...patch };
  local.set("decorMeta", m);
}
const decorItems = () =>
  allAssets()
    .filter((a) => a.status !== "rejected" && (a.kind === "decor" || (a.kind === "reference" && (picks().includes(a.id) || !!componentOf(a.id)))))
    .filter((a) => !meta(a.id).hidden);
const editsOf = (baseId) => allAssets().filter((a) => a.kind === "region_edit" && a.baseAssetId === baseId && a.status === "approved");
function chainFrom(id) {
  const out = [];
  for (let cur = assetById(id); cur; ) {
    out.push(cur);
    cur = editsOf(cur.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  }
  return out;
}
const rootOf = (id) => decorItems().find((p) => chainFrom(p.id).some((x) => x.id === id))?.id || null;
const sheetOf = (rootId) => {
  const c = (S.project?.components || []).find((x) => x.id === compIdOf(rootId));
  return (c?.masterAssetId && assetById(c.masterAssetId)) || latest("component_sheet", (a) => a.componentId === compIdOf(rootId) && (a.viewType ?? "full_sheet") === "full_sheet");
};
/* ---------- fixed views (component_sheet single views, copied from the character sheet) ---------- */

export const VIEWS = [
  { viewType: "front", label: "Front" },
  { viewType: "left", label: "Left side" },
  { viewType: "right", label: "Right side" },
  { viewType: "top", label: "Top" },
];
const viewKey = (rootId, viewType) => `decorview:${rootId}:${viewType}`;
// Latest view of each type made after the current character sheet (older ones show the old design).
export function viewsOf(rootId) {
  const sheet = sheetOf(rootId);
  const since = sheet?.status === "approved" ? String(sheet.createdAt || "") : null;
  const out = {};
  if (since == null) return out;
  for (const { viewType } of VIEWS)
    out[viewType] =
      latest(
        "component_sheet",
        (a) =>
          a.componentId === compIdOf(rootId) &&
          a.viewType === viewType &&
          a.status !== "rejected" &&
          (a.derivedFromSheet ? a.derivedFromSheet === sheet.id && newLayout(sheet) && a.cutVersion === 2 : String(a.createdAt || "") >= since),
      ) || null;
  return out;
}

// Sheets made before the fixed front/right/top/left layout cannot be cut into views.
const newLayout = (sheet) => sheet?.sheetLayout === "front-right-top-left";
// Cuts the approved sheet into front / right / top / left views (server side, no AI, instant).
export async function splitSheetFor(rootId) {
  const sheet = sheetOf(rootId);
  if (sheet?.status !== "approved") throw new Error("Build the character sheet first.");
  await write((revision) => api("POST", projPath(`/assets/${encodeURIComponent(sheet.id)}/split`), { revision }));
  update(true);
  return viewsOf(rootId);
}
const cutViews = (rootId) => busy("cut", () => splitSheetFor(rootId));

async function renderView(rootId, viewType) {
  const sheet = sheetOf(rootId);
  if (sheet?.status !== "approved") throw new Error("Build the character sheet first.");
  const entry = await runJobRetry(viewKey(rootId, viewType), "component_sheet", { componentId: compIdOf(rootId), viewType });
  if (entry.status === "failed") throw new Error(entry.error || "The view could not be generated");
  const out = outputOf(entry, "component_sheet");
  if (!out) throw new Error("The view finished without an image");
  // Approving a single view never replaces the character sheet as master.
  await acceptGenerated(out).catch(() => {});
  update(true);
}
const singleView = (rootId, viewType) => busy(`view:${viewType}`, () => renderView(rootId, viewType));
const nameOf = (rootId) => meta(rootId).name || assetById(rootId)?.label || elLabel(meta(rootId).type || "") || "Decor";

export const decorDone = () => decorItems().some((a) => a.status === "approved");
// Decor that may be placed on the venue: only pieces with an approved character sheet.
export { sheetOf as decorSheetOf };
export const canCutViews = (rootId) => newLayout(sheetOf(rootId));
export function decorFinals() {
  return decorItems()
    .filter((a) => a.status === "approved" && sheetOf(a.id)?.status === "approved")
    .map((a) => {
      const views = viewsOf(a.id);
      return {
        rootId: a.id,
        id: sheetOf(a.id).id,
        label: nameOf(a.id),
        views: VIEWS.filter((v) => views[v.viewType]?.status === "approved").map((v) => ({ ...v, id: views[v.viewType].id })),
      };
    });
}

// Registers an asset brought in from the doodle step as a decor piece (shown in the Decor step).
export function registerDecor(assetId, { name, type } = {}) {
  local.set("decorPicks", [...new Set([...picks(), assetId])]);
  const m = meta(assetId);
  setMeta(assetId, { name: m.name || name || "", type: m.type || (type && ELEMENTS[type] ? type : "decoration"), hidden: false });
}

/* ---------------- Actions ---------------- */

const fail = (msg) => {
  D.error = msg;
  update(true);
};
async function busy(key, fn) {
  D.busy = key;
  D.error = null;
  update(true);
  try {
    await fn();
  } catch (e) {
    D.error = e?.message || String(e);
  } finally {
    D.busy = null;
    update(true);
  }
}

// Uploads, screens and approves one photo; returns the approved asset id.
async function uploadOne(blob) {
  const res = await uploadImages([{ blob, name: "decor.jpg" }], "decor", ["detail"]);
  if (res.rejected?.length) throw new Error(res.rejected[0].reason);
  const id = res.accepted?.[0]?.id;
  if (!id) throw new Error("The photo was not accepted");
  const entry = await screenPending();
  if (entry?.status === "failed") throw new Error(entry.error || "The photo check failed");
  const a = assetById(id);
  if (a?.status === "review") await approveAsset(id, "", { quiet: true });
  else if (a?.status !== "approved") throw new Error(a?.screening?.reason || "The photo check did not accept this photo");
  return id;
}

const addPhoto = (blob) =>
  busy("upload", async () => {
    blob = blob || (await pickFile());
    if (!blob) return;
    select(await uploadOne(blob));
  });

function select(id) {
  if (D.selected !== id) {
    D.regions = [];
    D.open = null;
  }
  D.selected = id;
  D.error = null;
  update(true);
}

function hide(rootId) {
  setMeta(rootId, { hidden: true });
  if (rootOf(D.selected) === rootId || D.selected === rootId) D.selected = null;
  update(true);
}

/* ---------- library ---------- */

function openLibrary({ onPick, onClose, title = "Decor library" }) {
  const grid = h("div", { class: "lib-grid decor-lib" });
  const chips = h("div", { class: "chips lib-filter", role: "group", "aria-label": "Filter the library" });
  let filter = "all";
  const m = modal(title, h("div", { class: "decor-lib-wrap" }, chips, grid), { cls: "wide", onClose });
  const draw = () => {
    if (S.library.status !== "done") {
      grid.replaceChildren(h("p", { class: "muted small" }, S.library.status === "error" ? S.library.error : "Loading the library"));
      return;
    }
    const groups = S.library.data.elements;
    chips.replaceChildren(
      ...[["all", "All"], ...groups.map((g) => [g.id, g.label])].map(([id, label]) =>
        h("button", { type: "button", class: "chip", "aria-pressed": String(filter === id), onclick: () => { filter = id; draw(); } }, label),
      ),
    );
    grid.replaceChildren(
      ...groups
        .filter((g) => filter === "all" || g.id === filter)
        .flatMap((g) => g.items)
        .map((it) =>
          h(
            "button",
            { type: "button", class: "lib-item", title: it.description || it.label, onclick: () => { onPick(it); m.close(); } },
            h("img", { src: libPath(it.path), alt: "", loading: "lazy", draggable: "false" }),
            h("span", { class: "lib-cap" }, h("span", { class: "lib-label" }, it.label), it.style ? h("span", { class: "lib-style" }, it.style) : null),
          ),
        ),
    );
  };
  draw();
  loadLibrary().then(draw, draw);
}

const pickFromLibrary = () =>
  openLibrary({
    onPick: (it) =>
      busy("library", async () => {
        const a = await importReference(it.path, it.label);
        local.set("decorPicks", [...new Set([...picks(), a.id])]);
        setMeta(a.id, { name: it.label, type: it.type || meta(a.id).type, description: it.description || "" });
        select(a.id);
      }),
  });

/* ---------- edits ---------- */

const apply = () =>
  busy(null, async () => {
    const baseId = D.selected;
    const regions = D.regions.map((r) => ({ ...r, comment: r.comment.trim() || (r.sketch?.length ? SKETCH_COMMENT : "") }));
    if (!regions.length) throw new Error("Circle or sketch on the decor to mark what to change.");
    if (regions.some((r) => !r.comment)) throw new Error("Describe the change for every marked area.");
    const entry = await runJobRetry(editKey(baseId), "region_edit", {
      baseAssetId: baseId,
      regions: regions.map(({ id, cx, cy, rx, ry, comment, sketch }) => ({
        id, cx, cy, rx, ry, rotation: 0, comment, referenceAssetIds: [], ...(sketch?.length ? { sketch } : {}),
      })),
    });
    if (entry.status === "failed") throw new Error(entry.error || "The edit could not be applied");
    const out = outputOf(entry, "region_edit");
    if (!out) throw new Error("The edit finished without an image");
    const { qa } = await acceptGenerated(out);
    if (qa) toast(`Accepted despite the quality check: ${qa}`, { title: "Decor edit" });
    D.regions = [];
    D.open = null;
    D.selected = out.id;
  });

/* ---------- character sheet ---------- */

function editable(c) {
  return {
    id: c.id, category: c.category, description: c.description, palette: c.palette || [], materials: c.materials || [],
    dimensions: c.dimensions ?? null, referenceAssetIds: c.referenceAssetIds || [],
  };
}

const addExtraRef = (rootId, how) =>
  busy("ref", async () => {
    const cur = meta(rootId).refs || [];
    if (cur.length >= MAX_EXTRA_REFS) throw new Error(`Up to ${MAX_EXTRA_REFS} extra references.`);
    let id;
    if (how === "upload") {
      const blob = await pickFile();
      if (!blob) return;
      id = await uploadOne(blob);
    } else {
      const it = await new Promise((resolve) => openLibrary({ title: "Add a reference", onPick: resolve, onClose: () => resolve(null) }));
      if (!it) return;
      id = (await importReference(it.path, it.label)).id;
    }
    setMeta(rootId, { refs: [...new Set([...cur, id])].slice(0, MAX_EXTRA_REFS) });
  });

// Builds (or rebuilds) the character sheet from the current version; returns the approved sheet.
export async function buildSheetFor(rootId) {
  const m = meta(rootId);
  const type = m.type && (ELEMENTS[m.type] || m.type === "decoration") ? m.type : "entry";
  const current = chainFrom(rootId).at(-1).id;
  const refs = [current, ...(m.refs || []).filter((id) => assetById(id)?.status === "approved")].slice(0, 4);
  const description =
    (m.description || "").trim() ||
    `${nameOf(rootId)}: reproduce exactly the decor element shown in the primary source image, including every detail and edit`;
  const cid = compIdOf(rootId);
  const others = (S.project.components || []).filter((c) => c.id !== cid).map(editable);
  if (others.length >= 12) throw new Error("A project holds at most 12 decor elements with character sheets.");
  const mine = { id: cid, category: type, description: description.slice(0, 2000), palette: [], materials: [], dimensions: null, referenceAssetIds: refs };
  await write((revision) => api("PATCH", projPath(), { revision, changes: { components: [...others, mine] } }));
  const entry = await runJobRetry(sheetKey(cid), "component_sheet", { componentId: cid, viewType: "full_sheet" });
  if (entry.status === "failed") throw new Error(entry.error || "The character sheet could not be generated");
  const out = outputOf(entry, "component_sheet");
  if (!out) throw new Error("The character sheet finished without an image");
  const { qa } = await acceptGenerated(out);
  if (qa) toast(`Accepted despite the quality check: ${qa}`, { title: "Character sheet" });
  // The four angles come straight from the new sheet.
  await splitSheetFor(rootId).catch((e) => toast(`Angles could not be cut: ${e.message}`, { title: "Character sheet" }));
  update(true);
  return assetById(out.id) || out;
}
// The approved sheet for this decor, building it first when missing or out of date.
const ensuring = new Map();
export function ensureSheet(rootId) {
  const sheet = sheetOf(rootId);
  if (sheet?.status === "approved") return Promise.resolve(sheet);
  if (!ensuring.has(rootId)) ensuring.set(rootId, buildSheetFor(rootId).finally(() => ensuring.delete(rootId)));
  return ensuring.get(rootId);
}
const buildSheet = (rootId) => busy("sheet", () => buildSheetFor(rootId));

/* ---------------- Drawing canvas ---------------- */

function ellipseEl(r, n) {
  return h(
    "div",
    { class: `decor-ring${r.sketch?.length ? " sketched" : ""}`, style: `left:${(r.cx - r.rx) * 100}%;top:${(r.cy - r.ry) * 100}%;width:${r.rx * 200}%;height:${r.ry * 200}%` },
    n != null ? h("span", { class: "decor-ring-n" }, String(n)) : null,
  );
}

function sketchSvg(live) {
  const map = (x, y) => [x * 1000, y * 1000];
  const paths = [];
  const add = (s) => {
    const d = strokePath(s, map);
    paths.push(h("path", { d, class: "sk-halo" }), h("path", { d, class: "sk-line" }));
  };
  for (const r of D.regions) for (const s of r.sketch || []) add(s);
  if (live?.length > 1) add(live);
  return h("svg", { class: "sketch-layer", viewBox: "0 0 1000 1000", preserveAspectRatio: "none", "aria-hidden": "true" }, paths);
}

function addSketchStroke(raw) {
  const stroke = simplifyStroke(raw);
  if (stroke.length < 2) return;
  let r = D.regions.find((x) => x.id === D.open && x.sketch);
  if (!r) {
    if (D.regions.length >= MAX_REGIONS) return fail(`Up to ${MAX_REGIONS} areas per edit.`);
    r = { id: rid(), sketch: [], comment: "" };
    D.regions.push(r);
    D.open = r.id;
  }
  if (r.sketch.length >= SKETCH_MAX_STROKES || sketchPoints(r.sketch) + stroke.length > SKETCH_MAX_TOTAL)
    return fail("This sketch is full. Start a new area.");
  r.sketch.push(stroke);
  Object.assign(r, sketchBounds(r.sketch));
  update(true);
}

function undoDecorStroke() {
  const i = D.regions.findIndex((x) => x.id === D.open && x.sketch);
  if (i < 0) return;
  const r = D.regions[i];
  r.sketch.pop();
  if (!r.sketch.length) {
    D.regions.splice(i, 1);
    D.open = null;
  } else Object.assign(r, sketchBounds(r.sketch));
  update(true);
}

function canvas(id) {
  const rings = h("div", { class: "decor-rings" }, D.regions.map((r, i) => ellipseEl(r, i + 1)));
  let svg = sketchSvg(null);
  const box = h("div", { class: "decor-canvas", dataset: { tool: D.tool }, "aria-label": "Mark areas of the decor to change" }, assetImg(id, "Decor"), svg, rings);
  let start = null;
  let ghost = null;
  let pts = null;
  const pt = (e) => {
    const b = box.getBoundingClientRect();
    return { x: clamp((e.clientX - b.left) / b.width, 0, 1), y: clamp((e.clientY - b.top) / b.height, 0, 1) };
  };
  const shape = (a, b) => {
    const rx = clamp(Math.abs(b.x - a.x) / 2, MIN_R, 0.5);
    const ry = clamp(Math.abs(b.y - a.y) / 2, MIN_R, 0.5);
    return { cx: clamp((a.x + b.x) / 2, rx, 1 - rx), cy: clamp((a.y + b.y) / 2, ry, 1 - ry), rx, ry };
  };
  box.addEventListener("pointerdown", (e) => {
    if (isRunning(editKey(id)) || D.busy) return;
    e.preventDefault();
    box.setPointerCapture(e.pointerId);
    const p = pt(e);
    if (D.tool === "sketch") {
      pts = [[p.x, p.y]];
      return;
    }
    if (D.regions.length >= MAX_REGIONS) return fail(`Up to ${MAX_REGIONS} areas per edit.`);
    start = p;
    ghost = ellipseEl({ cx: p.x, cy: p.y, rx: MIN_R, ry: MIN_R });
    rings.append(ghost);
  });
  box.addEventListener("pointermove", (e) => {
    const p = pt(e);
    if (pts) {
      pts.push([p.x, p.y]);
      svg.replaceWith((svg = sketchSvg(pts)));
      return;
    }
    if (start) ghost.replaceWith((ghost = ellipseEl(shape(start, p))));
  });
  const end = (e) => {
    if (pts) {
      const stroke = pts;
      pts = null;
      if (e.type !== "pointercancel") addSketchStroke(stroke);
      else svg.replaceWith((svg = sketchSvg(null)));
      return;
    }
    if (!start) return;
    const s = shape(start, pt(e));
    start = null;
    ghost?.remove();
    if (e.type === "pointercancel") return;
    // A plain click marks a small area around the point.
    const r = s.rx <= MIN_R && s.ry <= MIN_R ? { ...s, rx: 0.08, ry: 0.08, cx: clamp(s.cx, 0.08, 0.92), cy: clamp(s.cy, 0.08, 0.92) } : s;
    D.regions.push({ id: rid(), ...r, comment: "" });
    D.open = null;
    update(true);
    setTimeout(() => D.root?.querySelector(`[data-region="${D.regions.length - 1}"]`)?.focus(), 0);
  };
  box.addEventListener("pointerup", end);
  box.addEventListener("pointercancel", end);
  return box;
}

/* ---------------- View ---------------- */

function toolButton(name, label) {
  return h("button", { type: "button", class: "chip", "aria-pressed": String(D.tool === name), onclick: () => { D.tool = name; D.open = null; update(true); } }, label);
}

/* ---------- tab: angles ---------- */

function anglesTab(rootId) {
  const sheet = sheetOf(rootId);
  const sheetReady = sheet?.status === "approved";
  const cuttable = sheetReady && newLayout(sheet);
  const views = viewsOf(rootId);
  const done = VIEWS.filter((v) => views[v.viewType]).length;
  const running = VIEWS.filter((v) => isRunning(viewKey(rootId, v.viewType))).length;
  if (!sheetReady)
    return h(
      "div",
      { class: "ws-empty" },
      h("h3", null, "No character sheet yet"),
      h("p", { class: "muted" }, "The four angles are cut from the character sheet, so build that first."),
      btn("Go to character sheet", () => setTab("sheet"), { primary: true }),
    );
  return h(
    "div",
    { class: "ws-angles" },
    h(
      "div",
      { class: "ws-bar" },
      h(
        "p",
        { class: "muted" },
        cuttable
          ? "Cut from the character sheet, so the piece never changes. You choose one of these when you place the piece on the venue."
          : "This sheet uses the old layout. Rebuild the character sheet to cut the angles, or make each one with AI.",
      ),
      done < 4 && cuttable ? btn("Cut the 4 angles", () => cutViews(rootId), { primary: true, busy: D.busy === "cut", disabled: !!D.busy || running > 0 }) : null,
    ),
    h(
      "div",
      { class: "angle-row" },
      VIEWS.map((v) => {
        const a = views[v.viewType];
        const busyView = isRunning(viewKey(rootId, v.viewType));
        const canRender = a || !cuttable;
        return h(
          "figure",
          { class: "angle-card" },
          a
            ? h("button", { type: "button", class: "angle-img", onclick: () => lightbox(a.id, v.label), "aria-label": `Open the ${v.label} view` }, assetImg(a.id, v.label))
            : h("div", { class: "angle-img empty" }, busyView ? "Rendering" : "Not cut yet"),
          h(
            "figcaption",
            null,
            h("span", null, v.label),
            canRender
              ? h(
                  "button",
                  { type: "button", class: "link-btn small", disabled: !!D.busy || busyView, title: "Render this angle again with AI", onclick: () => singleView(rootId, v.viewType) },
                  busyView ? "Rendering" : a ? "Redo with AI" : "Make with AI",
                )
              : null,
          ),
        );
      }),
    ),
  );
}

/* ---------- tab: character sheet ---------- */

function sheetTab(rootId) {
  const m = meta(rootId);
  const sheet = sheetOf(rootId);
  const running = isRunning(sheetKey(compIdOf(rootId)));
  const refs = (m.refs || []).filter((id) => assetById(id));
  const preview = running
    ? h("div", { class: "ws-sheet-img pending" }, jobLine(sheetKey(compIdOf(rootId)), "Building the character sheet"))
    : sheet
      ? h("button", { type: "button", class: "ws-sheet-img", onclick: () => lightbox(sheet.id, "Character sheet"), "aria-label": "Open the character sheet full size" }, assetImg(sheet.id, "Character sheet"))
      : h(
          "div",
          { class: "ws-sheet-img pending" },
          h("p", { class: "muted" }, "Front, right side, top and left side of this piece in one sheet, made from its latest version including every edit."),
        );
  const form = h(
    "div",
    { class: "ws-form" },
    h(
      "div",
      { class: "dc-two" },
      h(
        "label",
        { class: "field" },
        "Element",
        h(
          "select",
          { class: "select", disabled: running, onchange: (e) => { setMeta(rootId, { type: e.target.value }); update(true); } },
          Object.keys(ELEMENTS).map((k) => h("option", { value: k, selected: k === (m.type || "entry") }, elLabel(k))),
        ),
      ),
      h("label", { class: "field" }, "Name", h("input", { class: "input", maxlength: "80", value: m.name || "", placeholder: "Gold mirror arch", oninput: (e) => setMeta(rootId, { name: e.target.value }) })),
    ),
    h(
      "label",
      { class: "field" },
      "What must stay the same",
      h("textarea", { class: "input dc-textarea", rows: "4", maxlength: "600", value: m.description || "", placeholder: "Materials, flowers, colours, size", oninput: (e) => setMeta(rootId, { description: e.target.value }) }),
    ),
    h(
      "div",
      { class: "field" },
      `Extra references, optional (${refs.length}/${MAX_EXTRA_REFS})`,
      h("span", { class: "hint" }, "Photos of sides the main image does not show."),
      h(
        "div",
        { class: "row" },
        refs.map((id) =>
          h(
            "span",
            { class: "decor-ref" },
            assetImg(id, "Reference"),
            h("button", { type: "button", class: "icon-btn", "aria-label": "Remove reference", onclick: () => { setMeta(rootId, { refs: refs.filter((x) => x !== id) }); update(true); } }, "x"),
          ),
        ),
        refs.length < MAX_EXTRA_REFS ? btn("Upload", () => addExtraRef(rootId, "upload"), { small: true, quiet: true, disabled: !!D.busy }) : null,
        refs.length < MAX_EXTRA_REFS ? btn("From library", () => addExtraRef(rootId, "library"), { small: true, quiet: true, disabled: !!D.busy }) : null,
      ),
    ),
    btn(sheet ? "Rebuild character sheet" : "Build character sheet", () => buildSheet(rootId), { primary: true, busy: running || D.busy === "sheet", disabled: running || !!D.busy }),
    sheet ? h("p", { class: "hint" }, "Rebuild after editing the piece. The four angles are cut again automatically.") : null,
  );
  return h("div", { class: "ws-split" }, preview, form);
}

/* ---------- tab: edit ---------- */

function editTab(sel, rootId) {
  const chain = chainFrom(rootId);
  const running = isRunning(editKey(sel.id));
  const editable = sel.status === "approved";
  const side = h(
    "div",
    { class: "ws-form" },
    h(
      "div",
      { class: "seg", role: "group", "aria-label": "Drawing tool" },
      toolButton("circle", "Circle an area"),
      toolButton("sketch", "Sketch a shape"),
    ),
    h(
      "p",
      { class: "muted small" },
      !editable
        ? "This photo is still being checked."
        : D.tool === "sketch"
          ? "Draw the new shape on the image. Strokes join one area until you start a new one."
          : "Drag on the image around what should change. Up to 8 areas in one edit.",
    ),
    D.tool === "sketch" && D.open
      ? h("div", { class: "row" }, btn("Undo stroke", undoDecorStroke, { small: true, quiet: true }), btn("New area", () => { D.open = null; update(true); }, { small: true, quiet: true }))
      : null,
    D.regions.length
      ? h(
          "ol",
          { class: "decor-regions" },
          D.regions.map((r, i) =>
            h(
              "li",
              null,
              h("span", { class: "decor-ring-n static" }, String(i + 1)),
              h("textarea", {
                class: "input dc-textarea",
                rows: "2",
                maxlength: "500",
                placeholder: r.sketch?.length ? "What the sketch is: a gold arch, a floral column" : "Change to white orchids, make the arch gold",
                value: r.comment,
                dataset: { region: String(i) },
                oninput: (e) => (r.comment = e.target.value),
              }),
              h("button", { type: "button", class: "icon-btn", "aria-label": `Remove area ${i + 1}`, onclick: () => { D.regions.splice(i, 1); if (D.open === r.id) D.open = null; update(true); } }, "x"),
            ),
          ),
        )
      : h("div", { class: "ws-note" }, "Nothing marked yet."),
    running ? jobLine(editKey(sel.id), "Editing the decor") : null,
    h(
      "div",
      { class: "row" },
      btn("Apply edits", apply, { primary: true, busy: running, disabled: !editable || running || !!D.busy || !D.regions.length }),
      D.regions.length ? btn("Clear", () => { D.regions = []; D.open = null; update(true); }, { quiet: true, disabled: running }) : null,
    ),
    chain.length > 1
      ? h(
          "div",
          { class: "field" },
          "Versions",
          h(
            "div",
            { class: "decor-versions" },
            chain.map((a, i) =>
              h(
                "button",
                { type: "button", class: `decor-ver${a.id === sel.id ? " is-on" : ""}`, onclick: () => select(a.id), "aria-label": `Version ${i + 1}` },
                assetImg(a.id, `Version ${i + 1}`),
                h("span", null, i ? `v${i + 1}` : "Original"),
              ),
            ),
          ),
        )
      : null,
  );
  return h("div", { class: "ws-split edit" }, h("div", { class: "ws-canvas" }, editable ? canvas(sel.id) : h("div", { class: "decor-canvas" }, assetImg(sel.id, "Decor"))), side);
}

function setTab(tab) {
  D.tab = tab;
  update(true);
}

/* ---------------- View ---------------- */

function view({ onContinue, onBack, canContinue = () => true }) {
  const items = decorItems();
  if (D.selected && !assetById(D.selected)) D.selected = null;
  if (!D.selected && items.length) {
    const first = items.find((a) => a.status === "approved") || items[0];
    D.selected = chainFrom(first.id).at(-1).id;
  }
  const sel = D.selected ? assetById(D.selected) : null;
  const rootId = sel ? rootOf(sel.id) || sel.id : null;
  const ready = decorFinals().length;
  const adding = D.busy === "upload" || D.busy === "library";

  const head = h(
    "header",
    { class: "stage-head" },
    h(
      "div",
      { class: "stage-head-text" },
      h("p", { class: "eyebrow" }, "Step 3 of 4"),
      h("h1", null, "Decor"),
      h("p", { class: "lead" }, "Get every piece ready before decorating: edit it if needed, then build its character sheet."),
    ),
  );

  const foot = h(
    "div",
    { class: "stage-foot" },
    h(
      "div",
      { class: "foot-text" },
      items.length ? [h("strong", { class: "tnum" }, `${ready} of ${items.length}`), h("span", { class: "muted" }, ` piece${items.length === 1 ? "" : "s"} ready to place`)] : h("span", { class: "muted" }, "No decor yet"),
    ),
    h("div", { class: "foot-actions" }, btn("Back", onBack, { quiet: true }), btn("Decorate the venue", onContinue, { primary: true, disabled: !canContinue(), id: "to-doodle" })),
  );

  if (!items.length)
    return [
      head,
      h(
        "div",
        { class: "ws-start" },
        h("h2", null, "Add your first decor piece"),
        h("p", { class: "muted" }, "A stage, an entrance arch, a mandap: one piece at a time. Use your own photo or pick from the library."),
        h(
          "div",
          { class: "row" },
          dropTarget(btn(D.busy === "upload" ? "Checking the photo" : "Upload a photo", () => addPhoto(), { primary: true, busy: D.busy === "upload", disabled: adding }), (blob) => addPhoto(blob)),
          btn(D.busy === "library" ? "Adding" : "Choose from library", pickFromLibrary, { busy: D.busy === "library", disabled: adding }),
        ),
        D.error ? h("div", { class: "alert", role: "alert" }, D.error) : null,
      ),
      foot,
    ];

  const list = h(
    "nav",
    { class: "ws-list", "aria-label": "Decor pieces" },
    h(
      "div",
      { class: "ws-list-add" },
      dropTarget(btn("Upload", () => addPhoto(), { small: true, busy: D.busy === "upload", disabled: adding }), (blob) => addPhoto(blob)),
      btn("Library", pickFromLibrary, { small: true, busy: D.busy === "library", disabled: adding }),
    ),
    items.map((p) => {
      const last = chainFrom(p.id).at(-1);
      const sheet = sheetOf(p.id);
      const state = p.status !== "approved" ? p.status.replace(/_/g, " ") : sheet?.status === "approved" ? "Ready to place" : "Needs character sheet";
      return h(
        "div",
        { class: `ws-item${rootId === p.id ? " is-on" : ""}` },
        h(
          "button",
          { type: "button", class: "ws-item-btn", onclick: () => select(last.id), "aria-current": rootId === p.id ? "true" : null },
          h("span", { class: "ws-thumb" }, assetImg(last.id, "")),
          h("span", { class: "ws-item-text" }, h("span", { class: "ws-item-name" }, nameOf(p.id)), h("span", { class: `ws-item-state${sheet?.status === "approved" ? " ok" : ""}` }, state)),
        ),
        h("button", { type: "button", class: "ws-item-x", "aria-label": `Remove ${nameOf(p.id)}`, title: "Remove from this list", onclick: () => hide(p.id) }, "x"),
      );
    }),
  );

  let body = null;
  if (sel && rootId) {
    const sheetReady = sheetOf(rootId)?.status === "approved";
    const done = VIEWS.filter((v) => viewsOf(rootId)[v.viewType]).length;
    const tabs = [
      ["edit", "Edit", null],
      ["sheet", "Character sheet", sheetReady ? "Ready" : null],
      ["angles", "Angles", sheetReady ? `${done}/4` : null],
    ];
    body = h(
      "section",
      { class: "ws-main" },
      h(
        "div",
        { class: "ws-tabs", role: "tablist" },
        tabs.map(([id, label, badge]) =>
          h("button", { type: "button", role: "tab", class: "ws-tab", "aria-selected": String(D.tab === id), onclick: () => setTab(id) }, label, badge ? h("span", { class: "ws-badge" }, badge) : null),
        ),
        h("button", { type: "button", class: "link-btn small ws-full", onclick: () => lightbox(sel.id, "Decor") }, "View full size"),
      ),
      D.error ? h("div", { class: "alert", role: "alert" }, D.error) : null,
      sel.status !== "approved" && D.tab !== "edit"
        ? h("div", { class: "ws-empty" }, h("p", { class: "muted" }, "This photo is still being checked."))
        : D.tab === "sheet"
          ? sheetTab(rootId)
          : D.tab === "angles"
            ? anglesTab(rootId)
            : editTab(sel, rootId),
    );
  }

  return [head, h("div", { class: "ws" }, list, body), foot];
}

let opts = null;
// Rebuilds only when decor data or local edits change, so typing and drawing are never interrupted.
function update(force = false) {
  if (!D.root || !opts || !D.root.isConnected) return;
  const sig = JSON.stringify([
    decorItems().map((a) => [a.id, a.status]),
    allAssets().filter((a) => ["region_edit", "component_sheet", "element_view"].includes(a.kind)).map((a) => [a.id, a.status]),
    (S.project?.components || []).map((c) => [c.id, c.masterAssetId]),
    D.selected,
    D.tab,
    D.busy,
    D.error,
    [...S.jobs.entries()].filter(([k]) => k.startsWith("decor")).map(([k, j]) => [k, j.status]),
  ]);
  if (!force && sig === D.sig) return;
  D.sig = sig;
  D.root.replaceChildren(...view(opts).flat(Infinity).filter(Boolean));
}

export function mountDecor(main, options) {
  opts = options;
  if (!D.root) D.root = h("section", { class: "stage-view decor-step enter" });
  if (main.firstElementChild !== D.root) {
    main.replaceChildren(D.root);
    D.sig = "";
  }
  update();
}

export function resetDecor() {
  Object.assign(D, { selected: null, regions: [], open: null, busy: null, error: null, sig: "" });
}
