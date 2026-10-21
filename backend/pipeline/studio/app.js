// Venue Studio: three steps (photos, overview, design) plus a presentation view.
// Vanilla ES modules, no build step, served from /studio/.
import {
  S, hooks, pid, local, store, PROJECT_KEY, PREV_KEY, SLOTS, GROUND, session, api, loadCapabilities, assetById, byKind, approvedOf, rejected,
  allAssets, assetImg, isRunning, isBusy, act, approveAsset, resumeJobs, pickFile, openCamera, dropTarget, loadLibrary, libPath, LIB_MIME, btn,
  jobLine, lightbox, viewerFor, h, $, toast, toastErr, fmtElapsed, optionsOf, loadCosts, fmtUsd, qaNote,
} from "./core.js";
import { icon, reducedMotion } from "./dom.js";
import {
  mountDesign, designTick, setTool, versions, currentBase, latestShown, versionNo, editInfo, glyph, historyPanel, useLibrary, useDecor, undoVersion, closeDraft,
  undoStroke, finishSketch,
  loadDesignState, pump,
} from "./design.js";
import {
  syncSlots, slotAsset, approvedGroundIds, hasNewPhotos, hasAnyPhoto, setSlotBlob, checkPhotos, ensureOverview, startOverviewJob, useAnyway, isoLatest,
  base360Latest, base360Approved, isBase360, resetLocal,
} from "./flows.js";
import { openDemoPanel, renderDemoDock, demoRunning } from "./demo.js";
import { mountDecor, decorDone, decorFinals } from "./decor.js";

const STAGES = [
  { title: "Venue photos", short: "Photos" },
  { title: "Isometric", short: "Isometric" },
  { title: "Decor", short: "Decor" },
  { title: "Doodle on venue", short: "Doodle" },
];

/* ---------------- Gating ---------------- */

const isoApproved = () => approvedOf("venue_isometric");
const done = [() => approvedGroundIds().length >= 1, () => !!isoApproved(), () => decorDone(), () => S.chain.length > 0];
const reachable = (i) => i === 0 || (i === 1 ? done[0]() || !!isoLatest() : !!isoApproved());
function inferStage() {
  if (!S.project || !done[0]()) return 0;
  if (!done[1]()) return 1;
  return done[2]() ? 3 : 2;
}
function goStage(i) {
  if (i < 0 || i >= STAGES.length || !reachable(i)) return;
  if (S.stage === 3 && i !== 3) closeDraft();
  S.stage = i;
  local.set("stage", i);
  S.sheetOpen = false;
  render();
  $("#main")?.focus({ preventScroll: true });
}

/* ---------------- Header, cost pill, rail ---------------- */

function projectName() {
  const b = S.project?.brief;
  if (!S.project) return "New venue";
  if (b?.style) return b.style;
  if (b?.description) return b.description.trim().split(/\s+/).slice(0, 5).join(" ");
  return "Untitled venue";
}

function renderHeader() {
  $("#project-name").textContent = projectName();
  const prev = store.get(PREV_KEY, null);
  $("#back-project").hidden = !prev || prev === pid();
  const demo = $("#demo-btn");
  demo.lastChild.textContent = demoRunning() ? "Demo running" : "Demo";
  demo.classList.toggle("is-running", demoRunning());
  const pt = $("#panel-toggle");
  pt.hidden = S.stage !== 3 || !S.project;
  pt.setAttribute("aria-expanded", String(isNarrow() ? S.sheetOpen : S.panelOpen));
  renderCost();
}

const OP_LABEL = { screen_assets: "Photo check", venue_isometric: "Isometric", venue_360: "360 view", region_edit: "Edits", references_import: "Library import" };
const opLabel = (op) => OP_LABEL[op] || String(op).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const PROVIDER_LABEL = { openai: "OpenAI", gemini: "Gemini", fal: "fal" };
const rowUsd = (n) => (n > 0 && n < 1 ? fmtUsd(n, 3) : fmtUsd(n));

function costBody(c) {
  const provs = Object.entries(c.byProvider).filter(([, v]) => v > 0);
  const sum = provs.reduce((a, [, v]) => a + v, 0) || 1;
  return [
    h("div", { class: "cost-head" }, h("span", { class: "eyebrow" }, "Run cost"), h("span", { class: "cost-total tnum" }, fmtUsd(c.total))),
    h("p", { class: "hint" }, "Estimated from provider token usage"),
    provs.length
      ? [
          h("div", { class: "cost-bar", "aria-hidden": "true" }, provs.map(([, v], i) => h("span", { class: `cost-seg s${i % 3}`, style: `width:${((v / sum) * 100).toFixed(1)}%` }))),
          h("ul", { class: "cost-legend" }, provs.map(([k, v], i) => h("li", null, h("span", { class: `cost-key s${i % 3}`, "aria-hidden": "true" }), h("span", null, PROVIDER_LABEL[k] || k), h("span", { class: "tnum muted" }, rowUsd(v))))),
        ]
      : null,
    c.byOperation.length
      ? h(
          "table",
          { class: "cost-table" },
          h("thead", null, h("tr", null, h("th", null, "Operation"), h("th", { class: "num" }, "Calls"), h("th", { class: "num" }, "Cost"))),
          h("tbody", null, c.byOperation.map((r) => h("tr", null, h("td", null, opLabel(r.op)), h("td", { class: "num tnum" }, String(r.calls)), h("td", { class: "num tnum" }, rowUsd(r.cost))))),
        )
      : h("p", { class: "muted small" }, "No paid calls yet."),
    c.pricingNote ? h("p", { class: "hint" }, c.pricingNote) : null,
  ];
}

function renderCost() {
  const pill = $("#cost-pill");
  if (!pill) return;
  const c = S.costs?.pid === pid() ? S.costs.data : null;
  pill.hidden = !c || !!S.missing.costs;
  if (c) {
    pill.querySelector(".cost-val").textContent = fmtUsd(c.total);
    pill.setAttribute("aria-expanded", String(!!S.costOpen));
    pill.setAttribute("aria-label", `Run cost ${fmtUsd(c.total)}. Show the breakdown`);
  }
  let pop = document.getElementById("cost-pop");
  if (!c || !S.costOpen) {
    pop?.remove();
    if (!c) S.costOpen = false;
    return;
  }
  if (!pop) {
    pop = h("div", { id: "cost-pop", class: "cost-pop", role: "dialog", "aria-label": "Run cost breakdown" });
    document.body.append(pop);
  }
  const sig = JSON.stringify(c);
  if (pop.dataset.sig !== sig) {
    pop.dataset.sig = sig;
    pop.replaceChildren(...[costBody(c)].flat(Infinity).filter(Boolean));
  }
}

function railSub(i) {
  if (i === 0) return `${approvedGroundIds().length} of 4 accepted`;
  if (i === 2) return `${decorFinals().length} with character sheet`;
  if (i === 1) return isoApproved() ? "Approved" : isRunning("iso") ? "Generating" : isoLatest() && rejected(isoLatest()) ? "Flagged" : "Not started";
  const n = S.chain.length;
  return n ? `v${n} · ${n} change${n === 1 ? "" : "s"}` : "No changes yet";
}

function renderRail() {
  const items = STAGES.map((s, i) => {
    const ok = done[i]();
    const cur = i === S.stage && !S.presenting;
    return h(
      "li",
      null,
      h(
        "button",
        {
          type: "button",
          class: `stage-btn${ok ? " done" : ""}${cur ? " current" : ""}`,
          "aria-current": cur ? "step" : null,
          disabled: !S.project && i > 0 ? true : !reachable(i),
          onclick: () => {
            S.presenting = false;
            goStage(i);
          },
          "aria-label": `Step ${i + 1}: ${s.title}${ok ? ", done" : ""}`,
        },
        h("span", { class: "stage-num", "aria-hidden": "true" }, ok && !cur ? icon("check", 14) : String(i + 1)),
        h("span", { class: "stage-text" }, h("span", { class: "stage-title" }, h("span", { class: "long" }, s.title), h("span", { class: "short" }, s.short)), S.project ? h("span", { class: "stage-sub" }, railSub(i)) : null),
      ),
    );
  });
  $("#rail").replaceChildren(
    h("ol", { class: "stages" }, items),
    h(
      "div",
      { class: "rail-foot" },
      h(
        "button",
        { type: "button", class: `stage-btn present-btn${S.presenting ? " current" : ""}`, disabled: !isoApproved(), onclick: openPresentation, id: "present-btn", "aria-label": "Presentation" },
        h("span", { class: "stage-num", "aria-hidden": "true" }, glyph("present", 14)),
        h("span", { class: "stage-text" }, h("span", { class: "stage-title" }, h("span", { class: "long" }, "Presentation"), h("span", { class: "short" }, "Present"))),
      ),
    ),
  );
}

/* ---------------- Shared stage chrome ---------------- */

function stageHead(i, title, lead) {
  return h("header", { class: "stage-head" }, h("div", { class: "stage-head-text" }, h("p", { class: "eyebrow" }, `Step ${i + 1} of ${STAGES.length}`), h("h1", null, title), lead ? h("p", { class: "lead" }, lead) : null));
}
function stageFoot(text, ...actions) {
  return h("div", { class: "stage-foot" }, h("div", { class: "foot-text" }, text), h("div", { class: "foot-actions" }, actions.filter(Boolean)));
}

/* ---------------- Step 1: venue photos ---------------- */

function compass(dir) {
  const a = (dir * Math.PI) / 180;
  const x = 24 + Math.sin(a) * 15;
  const y = 24 - Math.cos(a) * 15;
  return h(
    "svg",
    { class: "compass", viewBox: "0 0 48 48", "aria-hidden": "true" },
    h("circle", { cx: 24, cy: 24, r: 18, class: "compass-ring" }),
    h("path", { d: `M24 24 L${x.toFixed(1)} ${y.toFixed(1)}`, class: "compass-ray" }),
    h("circle", { cx: 24, cy: 24, r: 2.5, class: "compass-me" }),
  );
}

function verdict(a) {
  if (!a) return null;
  const map = { approved: ["ok", "Accepted"], review: ["warn", "Needs review"], rejected: ["bad", "Rejected"], pending_screen: ["", "Not checked yet"], candidate: ["", "Ready"] };
  const [cls, text] = map[a.status] || ["", a.status];
  return h("span", { class: `badge ${cls}` }, text);
}

function renderVenue() {
  const accepted = approvedGroundIds().length;
  const busy = isBusy("check");
  const slot = (s) => {
    const sl = S.slots[s.view] || {};
    const a = slotAsset(s.view);
    const filled = sl.blob || a;
    const reason = sl.blob && sl.error ? sl.error : a && !sl.blob && ["rejected", "review"].includes(a.status) ? a.screening?.reason : null;
    const status = sl.blob ? h("span", { class: `badge ${sl.error ? "bad" : ""}` }, sl.error ? "Upload failed" : busy ? "Checking" : "New") : verdict(a) || h("span", { class: "badge" }, "Empty");
    const card = h(
      "article",
      { class: `slot${filled ? " filled" : ""}${a?.status === "approved" && !sl.blob ? " ok" : ""}`, "aria-label": `${s.label} photo` },
      h(
        "div",
        { class: "slot-media" },
        sl.url
          ? h("img", { src: sl.url, alt: `${s.label} photo, not checked yet` })
          : a
            ? assetImg(a.id, `${s.label} venue photo`)
            : h("div", { class: "slot-empty" }, compass(s.dir), h("span", { class: "slot-hint" }, s.hint), h("span", { class: "hint" }, "Drop a photo here")),
        busy && sl.blob ? h("div", { class: "slot-scan skeleton", "aria-hidden": "true" }) : null,
      ),
      h(
        "div",
        { class: "slot-body" },
        h("div", { class: "row-between" }, h("span", { class: "slot-tag" }, s.label), status),
        reason ? h("p", { class: "slot-reason" }, reason) : null,
        h(
          "div",
          { class: "slot-actions" },
          btn("Upload", async () => setSlotBlob(s.view, await pickFile()), { small: true, ghost: true, disabled: busy, ico: icon("upload", 14), ariaLabel: `Upload the ${s.label} photo` }),
          btn(filled ? "Retake" : "Camera", async () => setSlotBlob(s.view, await openCamera(`${s.label} view`)), { small: true, ghost: true, disabled: busy, ico: icon("camera", 14), ariaLabel: `${filled ? "Retake" : "Take"} the ${s.label} photo with the camera` }),
          a && !sl.blob && a.status === "review" ? btn("Accept", () => act(`approve:${a.id}`, () => approveAsset(a.id, `${s.label} photo accepted`)), { small: true, quiet: true, busy: isBusy(`approve:${a.id}`), cls: "push" }) : null,
        ),
      ),
    );
    return dropTarget(card, (blob) => blob && setSlotBlob(s.view, blob));
  };
  return h(
    "section",
    { class: "stage-view" },
    stageHead(0, "Photograph the venue", "Stand in the middle of the space and take one photo facing each direction. One accepted photo is enough."),
    !S.project ? h("div", { class: "callout" }, h("div", null, h("strong", null, "New here?"), h("span", { class: "muted" }, " The demo designs a preset venue end to end.")), btn("Run the demo", openDemoPanel, { small: true, quiet: true })) : null,
    h("div", { class: "slots" }, SLOTS.map(slot)),
    stageFoot(
      [h("strong", { class: "tnum" }, `${accepted} of 4`), h("span", { class: "muted" }, " accepted"), busy ? h("div", { class: "progress", role: "status" }, h("span", { class: "live-dot", "aria-hidden": "true" }), "Uploading and checking the photos") : null],
      btn("Continue", continueFromPhotos, { primary: true, busy, disabled: !hasAnyPhoto(), id: "to-overview" }),
    ),
  );
}

function continueFromPhotos() {
  act("check", async () => {
    if (hasNewPhotos() || allAssets().some((a) => a.status === "pending_screen")) await checkPhotos();
    if (approvedGroundIds().length) goStage(1);
    else toast("No photo is accepted yet. Retake a rejected photo, or Accept one marked Needs review.", { title: "Photos" });
  });
}

/* ---------------- Step 2: overview ---------------- */

function ovCard(w) {
  const iso = w === "iso";
  const a = iso ? isoLatest() : base360Latest();
  const busy = isRunning(w);
  const err = S.overviewErrors[w];
  const title = iso ? "Isometric" : "Look around";
  const flagged = a && a.status !== "approved" && rejected(a);
  const qa = a && a.status === "approved" ? qaNote(a.id) : null;
  const media = busy
    ? h("div", { class: "ov-wait skeleton" }, jobLine(w, iso ? "Drawing the isometric overview" : "Building the 360 view"))
    : a
      ? iso
        ? h("button", { type: "button", class: "ov-img", onclick: () => lightbox(a.id, "Isometric overview"), "aria-label": "Open the isometric overview full size" }, assetImg(a.id, "Isometric overview"))
        : viewerFor(a.id, "360 view of the venue")
      : h("div", { class: `ov-wait${err ? "" : " skeleton"}` }, err ? h("p", { class: "muted small" }, "Not generated.") : h("p", { class: "muted small" }, "Starting"));
  const badge = busy ? h("span", { class: "badge" }, "Generating") : a?.status === "approved" ? h("span", { class: `badge ${qa ? "warn" : "ok"}` }, qa ? "Accepted with QA note" : "Approved") : flagged ? h("span", { class: "badge warn" }, "Flagged") : null;
  return h(
    "div",
    { class: "ov-panel card", id: iso ? "ov-iso" : "ov-360" },
    h("div", { class: "card-head" }, h("div", null, h("h2", null, title), h("p", { class: "hint" }, iso ? "Becomes the design canvas" : "A 360 view stitched from your photos")), badge),
    h("div", { class: "ov-media" }, media),
    !busy && err ? h("div", { class: "alert", role: "alert" }, h("strong", null, `${title}: `), err) : null,
    !busy && (flagged || qa) ? h("p", { class: "qa-note" }, `Quality check: ${qa || a.qa?.reason || "flagged"}`) : null,
    h(
      "div",
      { class: "card-actions" },
      !busy && flagged ? btn("Use anyway", () => act(`use:${a.id}`, () => useAnyway(a, title)), { small: true, primary: iso, busy: isBusy(`use:${a.id}`), id: iso ? "iso-use" : "v360-use" }) : null,
      !busy && (a || err) ? btn(err && !a ? "Try again" : "Regenerate", () => startOverviewJob(w).catch(() => {}), { small: true, ghost: true, id: iso ? "iso-regen" : "v360-regen" }) : null,
    ),
  );
}

function renderOverview() {
  ensureOverview();
  return h(
    "section",
    { class: "stage-view" },
    stageHead(1, "The empty venue, from above", "Generated from your photos as soon as this step opens: the venue exactly as it is, with nothing added. It becomes the canvas you decorate in the last step."),
    h("div", { class: "overview" }, ovCard("iso"), ovCard("v360")),
    stageFoot(
      isoApproved() ? h("span", null, "Next: finalise every decor piece.") : h("span", { class: "muted" }, isRunning("iso") ? "Generating the isometric" : "The isometric needs approval to continue."),
      btn("Continue to decor", () => goStage(2), { primary: true, disabled: !isoApproved(), id: "to-decor" }),
    ),
  );
}

/* ---------------- Side panel: Library + History ---------------- */

const isNarrow = () => {
  try {
    return matchMedia("(max-width: 860px)").matches;
  } catch {
    return false;
  }
};

function libraryTab() {
  if (S.library.status === "idle") loadLibrary().catch(() => {});
  if (S.library.status === "loading") return h("div", { class: "lib-grid", role: "status", "aria-label": "Loading the library" }, [0, 1, 2, 3].map(() => h("div", { class: "lib-item skeleton" })));
  if (S.library.status === "error") return h("div", { class: "alert", role: "alert" }, S.library.error, " ", h("button", { type: "button", class: "link-btn", onclick: () => loadLibrary().catch(() => {}) }, "Try again"));
  const groups = S.library.data?.elements || [];
  const items = groups.filter((g) => S.libFilter === "all" || g.id === S.libFilter).flatMap((g) => g.items);
  const mine = decorFinals();
  return [
    mine.length
      ? h(
          "div",
          { class: "lib-mine" },
          h("p", { class: "eyebrow" }, "Your decor"),
          h(
            "div",
            { class: "lib-grid" },
            mine.map((it) =>
              h(
                "button",
                { type: "button", class: "lib-item mine", title: it.label, onpointerdown: (e) => e.preventDefault(), onclick: () => { useDecor(it); if (isNarrow() && S.draft) S.sheetOpen = false; render(); } },
                h("span", { class: "mine-img" }, assetImg(it.views[0]?.id || it.id, it.label)),
                h("span", { class: "mine-cap" }, h("span", { class: "lib-label" }, it.label), h("span", { class: "lib-style" }, it.views.length ? `${it.views.length} angles ready` : "Character sheet")),
              ),
            ),
          ),
        )
      : null,
    h("div", { class: "chips lib-filter", role: "group", "aria-label": "Filter the library" }, [["all", "All"], ...groups.map((g) => [g.id, g.label])].map(([id, label]) => h("button", { type: "button", class: "chip", "aria-pressed": String(S.libFilter === id), onclick: () => { S.libFilter = id; render(); } }, label))),
    h("p", { class: "hint" }, S.draft ? "Pick your decor to choose its angle. Library images are turned into a character sheet first." : "Circle or sketch on the venue first, then pick decor."),
    S.missing.import ? h("div", { class: "notice" }, S.missing.import) : null,
    h(
      "div",
      { class: "lib-grid" },
      items.map((it) =>
        h(
          "button",
          {
            type: "button",
            class: "lib-item",
            draggable: "true",
            title: it.description || it.label,
            "aria-label": `${it.label}${it.style ? `, ${it.style}` : ""}`,
            ondragstart: (e) => {
              e.dataTransfer.setData(LIB_MIME, JSON.stringify(it));
              e.dataTransfer.setData("text/plain", it.label);
              e.dataTransfer.effectAllowed = "copy";
            },
            // Keep the comment pill open while picking.
            onpointerdown: (e) => e.preventDefault(),
            onclick: () => {
              useLibrary(it);
              if (isNarrow() && S.draft) S.sheetOpen = false;
              render();
            },
          },
          h("img", { src: libPath(it.path), alt: "", loading: "lazy", draggable: "false" }),
          h("span", { class: "lib-cap" }, h("span", { class: "lib-label" }, it.label), it.style ? h("span", { class: "lib-style" }, it.style) : null),
        ),
      ),
    ),
  ];
}

function renderPanel() {
  const panel = $("#panel");
  const visible = S.stage === 3 && !!S.project && !S.presenting;
  panel.hidden = !visible;
  document.body.classList.toggle("has-panel", visible && S.panelOpen && !isNarrow());
  document.body.classList.toggle("sheet-open", visible && S.sheetOpen && isNarrow());
  if (!visible) return;
  if (!["library", "history"].includes(S.panelTab)) S.panelTab = "library";
  const tabs = [["library", "Library", "library"], ["history", "History", "history"]];
  const body = S.panelTab === "library" ? libraryTab() : historyPanel();
  const scroll = panel.querySelector(".panel-body")?.scrollTop || 0;
  panel.replaceChildren(
    h(
      "div",
      { class: "panel-tabs", role: "tablist", "aria-label": "Side panel" },
      tabs.map(([id, label, ico]) => h("button", { type: "button", role: "tab", class: "panel-tab", "aria-selected": String(S.panelTab === id), onpointerdown: (e) => e.preventDefault(), onclick: () => { S.panelTab = id; render(); } }, icon(ico, 14), h("span", null, label), id === "history" && S.chain.length ? h("span", { class: "tab-count tnum" }, String(S.chain.length)) : null)),
      h("button", { type: "button", class: "icon-btn panel-close", "aria-label": "Close the panel", onclick: () => { if (isNarrow()) S.sheetOpen = false; else S.panelOpen = false; render(); } }, icon("close", 14)),
    ),
    h("div", { class: "panel-body", role: "tabpanel" }, [body].flat(Infinity).filter(Boolean)),
  );
  const pb = panel.querySelector(".panel-body");
  if (pb) pb.scrollTop = scroll;
}

/* ---------------- Presentation ---------------- */

function openPresentation() {
  if (!isoApproved()) return;
  closeDraft();
  S.presenting = true;
  S.costOpen = false;
  render();
}
function closePresentation() {
  S.presenting = false;
  render();
  $("#present-btn")?.focus();
}

const design360Of = (id) => approvedOf("venue_360", (a) => (a.designAssetId || optionsOf(a).designAssetId) === id);
function presentSig() {
  return JSON.stringify([pid(), versions().map((v) => v.id), approvedGroundIds(), allAssets().filter((a) => a.status === "approved").length, S.costs?.data?.total ?? null]);
}

function renderPresentation() {
  let root = document.getElementById("present");
  if (!S.presenting || !S.project || !isoApproved()) {
    if (root) {
      root.remove();
      document.body.classList.remove("presenting");
    }
    S.presenting = false;
    return;
  }
  const sig = presentSig();
  if (root && root.dataset.sig === sig) return;
  const fig = (id, cap, cls = "") => h("figure", { class: `p-fig ${cls}` }, h("button", { type: "button", class: "p-img", onclick: () => lightbox(id, cap || "Image"), "aria-label": `Open ${cap || "image"}` }, assetImg(id, cap)), cap ? h("figcaption", null, cap) : null);
  const section = (n, title, sub, ...kids) => h("section", { class: "p-section" }, h("header", { class: "p-head" }, h("span", { class: "p-num tnum" }, String(n).padStart(2, "0")), h("div", null, h("h2", null, title), sub ? h("p", { class: "muted" }, sub) : null)), ...kids);
  const vs = versions();
  const iso = isoApproved();
  const final = latestShown() || iso.id;
  const photos = GROUND.map((v) => [v, slotAsset(v)]).filter(([, a]) => a?.status === "approved");
  const pano = base360Approved() || base360Latest();
  const finalPano = design360Of(currentBase());
  const c = S.costs?.pid === pid() ? S.costs.data : null;
  let n = 0;
  const body = h(
    "div",
    { class: "p-body" },
    h("div", { class: "p-hero" }, h("p", { class: "eyebrow" }, "Venue design"), h("h1", null, projectName()), S.project?.brief?.description ? h("p", { class: "lead" }, S.project.brief.description) : null),
    photos.length ? section(++n, "Venue", `${photos.length} direction${photos.length === 1 ? "" : "s"} photographed`, h("div", { class: "p-grid four" }, photos.map(([v, a]) => fig(a.id, SLOTS.find((s) => s.view === v)?.label || v)))) : null,
    decorFinals().length
      ? section(++n, "Decor", "Each piece with its character sheet or final edit", h("div", { class: "p-grid four" }, decorFinals().map((d) => fig(d.id, d.label))))
      : null,
    section(++n, "Overview", "Isometric drawn from the venue photos", fig(iso.id, "", "wide")),
    pano ? section(++n, "Venue 360", "Look around the venue as photographed", h("div", { class: "p-viewer" }, viewerFor(pano.id, "360 view of the venue"))) : null,
    vs.length > 1
      ? section(
          ++n,
          "Versions",
          `${vs.length - 1} change${vs.length === 2 ? "" : "s"}, each applied from one comment`,
          h(
            "ol",
            { class: "p-versions" },
            vs.slice(1).map((v, i) => {
              const info = editInfo(v.id);
              const before = info?.baseAssetId && assetById(info.baseAssetId) ? info.baseAssetId : vs[i].id;
              const qa = qaNote(v.id);
              return h(
                "li",
                { class: "p-version" },
                h("div", { class: "p-pair" }, fig(before, `Before · v${versionNo(before) ?? i}`), fig(v.id, `After · v${v.n}`)),
                h("p", { class: "p-note" }, h("strong", null, `v${v.n} `), info?.comment || "Edit"),
                qa ? h("span", { class: "qa-chip" }, `QA: ${qa}`) : null,
              );
            }),
          ),
        )
      : null,
    section(++n, "Final design", final === iso.id ? "No edits yet; showing the overview" : `v${versionNo(final)}`, fig(final, "", "wide")),
    finalPano ? section(++n, "Look around the design", "360 view of the final design", h("div", { class: "p-viewer" }, viewerFor(finalPano.id, "360 view of the design"))) : null,
    c ? section(++n, "Run cost", "Estimated from provider token usage", h("div", { class: "p-cost card" }, costBody(c))) : null,
  );
  const scroll = root?.querySelector(".p-scroll")?.scrollTop || 0;
  const fresh = !root;
  if (!root) {
    root = h("div", { id: "present", class: "present", role: "dialog", "aria-modal": "true", "aria-label": "Presentation" });
    document.body.append(root);
    document.body.classList.add("presenting");
  }
  root.dataset.sig = sig;
  root.replaceChildren(
    h("div", { class: "p-bar" }, h("span", { class: "brand-name" }, "Lovers AI"), h("span", { class: "brand-sep", "aria-hidden": "true" }), h("span", { class: "muted" }, "Presentation"), h("button", { type: "button", class: "btn btn-sm btn-ghost push", id: "present-close", onclick: closePresentation }, "Close")),
    h("div", { class: "p-scroll" }, body),
  );
  const sc = root.querySelector(".p-scroll");
  if (sc) sc.scrollTop = scroll;
  if (fresh) setTimeout(() => root.querySelector("#present-close")?.focus(), 0);
}

/* ---------------- Render ---------------- */

function render() {
  if (!S.booted) return;
  if (S.stage > 3) S.stage = 3;
  if (!reachable(S.stage)) S.stage = inferStage();
  renderHeader();
  renderRail();
  document.body.dataset.stage = String(S.stage);
  const main = $("#main");
  if (S.stage === 3) mountDesign(main);
  else if (S.stage === 2) mountDecor(main, { onContinue: () => goStage(3), onBack: () => goStage(1), canContinue: () => decorFinals().length > 0 });
  else {
    const active = document.activeElement;
    const focusId = active?.id || null;
    const scroll = main.scrollTop;
    const view = (S.stage === 0 ? renderVenue : renderOverview)();
    // Animate only when a step opens, not on every progress re-render.
    if (lastView !== S.stage) view.classList.add("enter");
    main.replaceChildren(view);
    main.scrollTop = scroll;
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el && el !== document.activeElement) el.focus({ preventScroll: true });
    }
  }
  lastView = S.stage;
  renderPanel();
  renderDemoDock();
  renderPresentation();
}
let lastView = null;
let pending = 0;
function refresh() {
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    render();
  });
}
hooks.render = render;
hooks.refresh = refresh;
hooks.backToProject = () => switchProject(store.get(PREV_KEY, null));
hooks.present = openPresentation;
hooks.goStage = goStage;

/* ---------------- Projects ---------------- */

function adoptProject(project) {
  resetLocal();
  S.project = project;
  store.set(PROJECT_KEY, pid());
  syncSlots();
  loadDesignState();
  const saved = local.get("stage", null);
  S.stage = saved != null && saved <= 3 && reachable(saved) ? saved : inferStage();
  loadCosts().catch(() => {});
}

async function switchProject(id) {
  if (!id) return;
  if (demoRunning() && !confirm("A demo is running. Leave it and return to your project?")) return;
  let project;
  try {
    project = (await api("GET", `/projects/${encodeURIComponent(id)}`)).project;
  } catch (e) {
    if (e.status === 404) {
      store.del(PREV_KEY);
      render();
      return toast("Your previous project was not found on the server.", { type: "error", title: "Project" });
    }
    return toastErr(e, "Could not load your project");
  }
  S.demo = null;
  adoptProject(project);
  store.del(PREV_KEY);
  render();
  await resumeJobs(jobKeyOf);
  render();
}

function newProject() {
  if (demoRunning() && !confirm("A demo is running. Leave it and start a new project?")) return;
  if (S.project && !demoRunning() && !confirm("Start a new project? The current project stays on the server, but this browser will stop showing it.")) return;
  store.del(PROJECT_KEY);
  S.demo = null;
  resetLocal();
  syncSlots();
  render();
  toast("New project started. Begin with the venue photos.", { title: "New project" });
}

const jobKeyOf = (job) => {
  const o = job.options || {};
  if (job.operation === "screen_assets") return "screen";
  if (job.operation === "venue_isometric") return "iso";
  if (job.operation === "venue_360") return o.designAssetId ? `v360:${o.designAssetId}` : "v360";
  if (job.operation === "region_edit") return `edit:${o.regions?.[0]?.id || job.id}`;
  return job.operation;
};

/* ---------------- Keyboard + outside clicks ---------------- */

function onKey(e) {
  const t = e.target;
  if (e.key === "Escape") {
    if (S.costOpen) {
      S.costOpen = false;
      renderCost();
      $("#cost-pill")?.focus();
      return;
    }
    if (S.presenting && !document.querySelector(".modal")) return closePresentation();
  }
  if (t && (t.closest?.("input, textarea, select, [contenteditable]") || t.isContentEditable)) return;
  if (document.querySelector(".modal, .present")) return;
  if (S.stage !== 3 || !S.design) return;
  const dc = S.design.dc;
  const k = e.key;
  const mod = e.ctrlKey || e.metaKey;
  if (k === " " && !e.repeat) {
    dc.setSpace(true);
    e.preventDefault();
    return;
  }
  let handled = true;
  if (!mod && (k === "c" || k === "C")) setTool("comment");
  else if (!mod && (k === "s" || k === "S")) setTool("sketch");
  else if (!mod && (k === "h" || k === "H" || k === "v" || k === "V")) setTool("pan");
  else if (k === "z" || k === "Z") {
    if (!undoStroke()) undoVersion();
  } else if (k === "Enter" && (S.sketchDraft || []).length) finishSketch();
  else if (k === "Escape") closeDraft();
  else if (k === "+" || k === "=") dc.zoomBy(1.25);
  else if (k === "-" || k === "_") dc.zoomBy(0.8);
  else if (k === "0") dc.fit();
  else handled = false;
  if (handled) {
    e.preventDefault();
    refresh();
  }
}
document.addEventListener("keydown", onKey);
document.addEventListener("keyup", (e) => {
  if (e.key === " ") S.design?.dc.setSpace(false);
});
document.addEventListener(
  "pointerdown",
  (e) => {
    if (S.costOpen && !e.target.closest?.("#cost-pop, #cost-pill")) {
      S.costOpen = false;
      renderCost();
    }
  },
  true,
);

/* ---------------- Boot ---------------- */

setInterval(() => {
  document.querySelectorAll("[data-job]").forEach((el) => {
    const j = S.jobs.get(el.dataset.job);
    if (j?.status === "running") el.textContent = fmtElapsed(Date.now() - j.start);
  });
  document.querySelectorAll("[data-since]").forEach((el) => (el.textContent = fmtElapsed(Date.now() - Number(el.dataset.since))));
  designTick();
}, 1000);

window.addEventListener("beforeunload", (e) => {
  if (hasNewPhotos() || S.pins.some((p) => ["running", "queued"].includes(p.status))) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("unhandledrejection", (e) => toastErr(e.reason, "Unexpected error"));
let lastNarrow = null;
window.addEventListener("resize", () => {
  const n = isNarrow();
  if (n !== lastNarrow) {
    lastNarrow = n;
    refresh();
  }
});

async function boot() {
  if (reducedMotion()) document.documentElement.classList.add("reduce-motion");
  $("#new-project").addEventListener("click", newProject);
  $("#demo-btn").addEventListener("click", openDemoPanel);

  $("#back-project").addEventListener("click", () => switchProject(store.get(PREV_KEY, null)));
  $("#cost-pill").addEventListener("click", () => {
    S.costOpen = !S.costOpen;
    renderCost();
    if (S.costOpen) loadCosts().catch(() => {});
  });
  $("#panel-toggle").addEventListener("click", () => {
    if (isNarrow()) S.sheetOpen = !S.sheetOpen;
    else S.panelOpen = !S.panelOpen;
    render();
  });
  try {
    await session();
  } catch (e) {
    $("#main").replaceChildren(h("div", { class: "fatal" }, h("h1", null, "Studio unavailable"), h("p", { class: "muted" }, e.message), btn("Try again", () => location.reload(), { primary: true })));
    $("#project-name").textContent = "Offline";
    return;
  }
  loadCapabilities().then(() => refresh());
  const savedId = store.get(PROJECT_KEY, null);
  let project = null;
  if (savedId) {
    try {
      project = (await api("GET", `/projects/${encodeURIComponent(savedId)}`)).project;
    } catch (e) {
      if (e.status === 404) {
        store.del(PROJECT_KEY);
        toast("The saved project was not found. Starting a new one.", { title: "New project" });
      } else toastErr(e, "Could not load your project");
    }
  }
  if (project) adoptProject(project);
  else syncSlots();
  S.booted = true;
  lastNarrow = isNarrow();
  S.panelOpen = !lastNarrow;
  render();
  loadLibrary().catch(() => {});
  if (S.project) {
    await resumeJobs(jobKeyOf);
    render();
    pump();
  }
}

boot();
