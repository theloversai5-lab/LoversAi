// Spec sheet: a vendor uploads a decor photo, enters known sizes and notes, and gets a six-view
// architectural presentation board (component_sheet, viewType "board") for fabrication approval.
import {
  S, ELEMENTS, elLabel, ensureProject, write, api, projPath, assetById, latest, uploadImages, screenPending, approveAsset,
  runJobRetry, isRunning, jobLine, pickFile, assetImg, assetUrl, lightbox, btn, modal, h, toastErr,
} from "./core.js";

const DIMS = [
  ["depthFt", "Length (ft)", "16"],
  ["widthFt", "Width (ft)", "12"],
  ["heightFt", "Height (ft)", "10"],
];
const compId = (type) => `spec_${type}`;
const jobKey = (type) => `board:${type}`;
const boardOf = (type) => latest("component_sheet", (a) => a.componentId === compId(type) && a.viewType === "board");

// Form state survives closing the modal; photos are per element type.
const F = { type: "entry", description: "", notes: "", dims: { depthFt: "", widthFt: "", heightFt: "" }, refs: {}, busy: null, error: null };

function editable(c) {
  return {
    id: c.id,
    category: c.category,
    description: c.description,
    palette: c.palette || [],
    materials: c.materials || [],
    dimensions: c.dimensions ?? null,
    referenceAssetIds: c.referenceAssetIds || [],
  };
}

async function uploadPhoto(rerender) {
  const blob = await pickFile();
  if (!blob) return;
  const type = F.type;
  F.busy = "upload";
  F.error = null;
  rerender();
  try {
    const res = await uploadImages([{ blob, name: "decor.jpg" }], "decor", ["detail"]);
    if (res.rejected?.length) throw new Error(res.rejected[0].reason);
    const id = res.accepted?.[0]?.id;
    if (!id) throw new Error("The photo was not accepted");
    F.refs[type] = id;
    rerender();
    F.busy = "screen";
    rerender();
    const entry = await screenPending();
    if (entry?.status === "failed") throw new Error(entry.error || "The photo check failed");
    const a = assetById(id);
    if (a?.status === "review") await approveAsset(id, "", { quiet: true });
    else if (a?.status !== "approved") throw new Error(a?.screening?.reason || "The photo check did not accept this photo");
  } catch (e) {
    F.error = e.message;
  } finally {
    F.busy = null;
    rerender();
  }
}

async function generate(rerender) {
  const type = F.type;
  F.error = null;
  try {
    const refId = F.refs[type];
    if (!refId || assetById(refId)?.status !== "approved") throw new Error("Add a decor photo first.");
    const dimensions = {};
    for (const [key, label] of DIMS) {
      const raw = String(F.dims[key]).trim();
      if (!raw) continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0.1 || v > 300) throw new Error(`${label} must be between 0.1 and 300.`);
      dimensions[key] = v;
    }
    if (!Object.keys(dimensions).length) throw new Error("Enter at least one overall size.");
    const description = F.description.trim() || `${elLabel(type)} decor element shown in the reference photo`;
    F.busy = "generate";
    rerender();
    await ensureProject();
    const others = (S.project.components || []).filter((c) => c.id !== compId(type)).map(editable);
    const mine = { id: compId(type), category: type, description, palette: [], materials: [], dimensions: null, referenceAssetIds: [refId] };
    await write((revision) => api("PATCH", projPath(), { revision, changes: { components: [...others, mine] } }));
    const notes = F.notes.trim();
    F.busy = null;
    rerender();
    const entry = await runJobRetry(jobKey(type), "component_sheet", {
      componentId: compId(type),
      viewType: "board",
      dimensions,
      ...(notes ? { specNotes: notes } : {}),
    });
    if (entry.status === "failed") F.error = entry.error || "The spec sheet could not be generated";
  } catch (e) {
    F.error = e.message;
  } finally {
    F.busy = null;
    rerender();
  }
}

async function download(a) {
  try {
    const link = h("a", { href: await assetUrl(a.id), download: `spec-sheet-${F.type}.png` });
    document.body.append(link);
    link.click();
    link.remove();
  } catch (e) {
    toastErr(e, "Download");
  }
}

function body(rerender) {
  const type = F.type;
  const ref = F.refs[type] ? assetById(F.refs[type]) : null;
  const board = boardOf(type);
  const running = isRunning(jobKey(type));
  const busy = !!F.busy || running;
  const field = (label, control) => h("label", { class: "field" }, label, control);
  return [
    h("p", { class: "hint" }, "Upload a decor photo, enter the sizes you know and any specs. The board shows plan, front, left, right, exploded and isometric views with dimensions in feet, labels and schedules. Missing sizes are derived proportionally."),
    h(
      "div",
      { class: "spec-grid" },
      h(
        "div",
        { class: "spec-photo" },
        h(
          "button",
          { type: "button", class: "spec-drop", disabled: busy, onclick: () => uploadPhoto(rerender), "aria-label": ref ? "Replace the decor photo" : "Add a decor photo" },
          ref ? assetImg(ref.id, "Decor photo") : h("span", { class: "muted small" }, F.busy === "upload" ? "Uploading" : "Add decor photo"),
        ),
        ref ? h("span", { class: "hint" }, F.busy === "screen" ? "Checking the photo" : ref.status === "approved" ? "Photo accepted" : ref.status.replace(/_/g, " ")) : null,
      ),
      h(
        "div",
        { class: "spec-form" },
        field(
          "Element",
          h(
            "select",
            { class: "select", disabled: busy, onchange: (e) => { F.type = e.target.value; F.error = null; rerender(); } },
            Object.keys(ELEMENTS).map((k) => h("option", { value: k, selected: k === type }, elLabel(k))),
          ),
        ),
        field("What is it", h("input", { class: "input", maxlength: "300", placeholder: "Entrance arch tunnel with half arches and lamp racks", value: F.description, oninput: (e) => (F.description = e.target.value) })),
        h(
          "div",
          { class: "spec-dims" },
          DIMS.map(([key, label, ph]) =>
            field(label, h("input", { class: "input", type: "number", min: "0.1", max: "300", step: "0.5", inputmode: "decimal", placeholder: ph, value: F.dims[key], oninput: (e) => (F.dims[key] = e.target.value) })),
          ),
        ),
        field(
          "Specs and notes",
          h("textarea", { class: "input spec-notes", rows: "3", maxlength: "1500", placeholder: "5 alternating half arches, 8 ft clear walkway, lamp racks in side zones, 6 in platform rise, entry step at front", value: F.notes, oninput: (e) => (F.notes = e.target.value) }),
        ),
      ),
    ),
    F.error ? h("div", { class: "alert", role: "alert" }, F.error) : null,
    running ? jobLine(jobKey(type), "Drafting the presentation board") : null,
    h(
      "div",
      { class: "row" },
      btn(board ? "Generate new spec sheet" : "Generate spec sheet", () => generate(rerender), { primary: true, busy, disabled: busy || !ref || ref.status !== "approved" }),
    ),
    board && !running
      ? h(
          "div",
          { class: "spec-result" },
          h("button", { type: "button", class: "spec-board", onclick: () => lightbox(board.id, `${elLabel(type)} spec sheet`), "aria-label": "Open the spec sheet full size" }, assetImg(board.id, `${elLabel(type)} spec sheet`)),
          board.qa?.decision && board.qa.decision !== "pass" ? h("p", { class: "hint" }, `Quality check: ${board.qa.reason || board.qa.decision}`) : null,
          h("div", { class: "row" }, btn("Open full size", () => lightbox(board.id, `${elLabel(type)} spec sheet`), { small: true }), btn("Download", () => download(board), { small: true, quiet: true })),
        )
      : null,
  ];
}

export function openSpecSheet() {
  const content = h("div", { class: "spec-sheet" });
  let timer;
  const rerender = () => {
    if (!content.isConnected && timer) return;
    content.replaceChildren(...[body(rerender)].flat(Infinity).filter(Boolean));
  };
  rerender();
  // Inputs keep their own state; only refresh while something is in flight, so typing is never interrupted.
  timer = setInterval(() => {
    if (!content.isConnected) return clearInterval(timer);
    if (F.busy || isRunning(jobKey(F.type)) || content.dataset.waiting === "1") rerender();
    content.dataset.waiting = isRunning(jobKey(F.type)) ? "1" : "";
  }, 1000);
  modal("Spec sheet", content, { cls: "wide", onClose: () => clearInterval(timer) });
}
