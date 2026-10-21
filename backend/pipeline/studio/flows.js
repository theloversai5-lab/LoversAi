// Stage logic shared by the UI and the demo runner: venue photo slots and the overview
// (isometric + 360). No rendering here.
import {
  S, hooks, local, SLOTS, GROUND, assetById, latest, approvedOf, approvable, rejected, optionsOf, runJobRetry, outputOf, approveAsset,
  acceptGenerated, screenPending, uploadImages, isRunning, resetCaches, resetGate, toast,
} from "./core.js";
import { resetDesign } from "./design.js";
import { clearViewerState } from "./viewer.js";

/* ---------------- Venue slots ---------------- */

export function syncSlots() {
  const map = local.get("slots", {});
  for (const s of SLOTS) {
    const cur = S.slots[s.view] || {};
    let id = cur.assetId && assetById(cur.assetId) ? cur.assetId : map[s.view];
    if (id && !assetById(id)) id = null;
    if (!id) id = latest("venue", (a) => a.view === s.view)?.id || null;
    S.slots[s.view] = { ...cur, assetId: id };
  }
}
const saveSlotMap = () => {
  const map = {};
  for (const s of SLOTS) if (S.slots[s.view]?.assetId) map[s.view] = S.slots[s.view].assetId;
  local.set("slots", map);
};
export const slotAsset = (view) => assetById(S.slots[view]?.assetId);
export const approvedGroundIds = () => GROUND.map(slotAsset).filter((a) => a?.status === "approved").map((a) => a.id);
export const hasNewPhotos = () => SLOTS.some((s) => S.slots[s.view]?.blob);
export const hasAnyPhoto = () => SLOTS.some((s) => S.slots[s.view]?.blob || slotAsset(s.view));

export function setSlotBlob(view, blob) {
  if (!blob) return;
  const slot = S.slots[view] || {};
  if (slot.url) URL.revokeObjectURL(slot.url);
  S.slots[view] = { ...slot, blob, url: URL.createObjectURL(blob), error: null };
  hooks.render();
}

export async function uploadSlots() {
  const pending = SLOTS.filter((s) => S.slots[s.view]?.blob);
  if (!pending.length) return { sent: 0, rejected: 0 };
  const data = await uploadImages(pending.map((s) => ({ blob: S.slots[s.view].blob, name: `${s.view}.jpg` })), "venue", pending.map((s) => s.view));
  const rej = new Map((data.rejected || []).map((r) => [r.index, r]));
  let next = 0;
  pending.forEach((s, i) => {
    const slot = S.slots[s.view];
    if (rej.has(i)) {
      slot.error = rej.get(i).reason || "Photo was rejected";
      return;
    }
    const a = (data.accepted || [])[next++];
    if (!a) return;
    if (slot.url) URL.revokeObjectURL(slot.url);
    Object.assign(slot, { blob: null, url: null, assetId: a.id, error: null });
  });
  saveSlotMap();
  hooks.render();
  return { sent: pending.length, rejected: rej.size };
}

// Uploads new slot photos and screens everything pending. Returns the number of accepted photos.
export async function checkPhotos() {
  await uploadSlots();
  if ((S.project?.assets || []).some((a) => a.status === "pending_screen")) {
    const entry = await screenPending();
    if (entry?.status === "failed") throw new Error(entry.error || "The photo check failed");
  }
  hooks.render();
  return approvedGroundIds().length;
}

/* ---------------- Overview (isometric + 360 from photos) ---------------- */

export const isBase360 = (a) => !(a?.designAssetId || optionsOf(a).designAssetId);
export const isoLatest = () => latest("venue_isometric");
export const base360Latest = () => latest("venue_360", isBase360);
export const base360Approved = () => approvedOf("venue_360", isBase360);

// Runs one generation; approves the output automatically unless the quality check rejected it
// (then the image is still shown with "Use anyway"). Returns the output asset; throws on job failure.
export async function produce(key, operation, options, kind, { pred = () => true, alive = () => true, override = false } = {}) {
  const entry = await runJobRetry(key, operation, options, { quiet: true, alive });
  if (entry.status === "failed") throw new Error(entry.code === "OPERATION_MISSING" ? `The server does not support ${operation} yet.` : entry.error || "The job did not complete");
  const out = outputOf(entry, kind, pred);
  if (!out) throw new Error("The job finished without an image");
  if (out.status === "approved") return out;
  if (approvable(out)) await approveAsset(out.id, "", { quiet: true });
  else if (override && rejected(out)) await acceptGenerated(out);
  return assetById(out.id) || out;
}

const OV = {
  iso: { op: "venue_isometric", kind: "venue_isometric", options: () => ({ venueAssetIds: approvedGroundIds().slice(0, 5) }), pred: () => true },
  v360: { op: "venue_360", kind: "venue_360", options: () => ({}), pred: isBase360 },
};
export function startOverviewJob(w, { alive, override = false } = {}) {
  if (!approvedGroundIds().length) return Promise.reject(new Error("Accept at least one venue photo first."));
  if (isRunning(w)) return S.jobs.get(w).promise.then(() => (w === "iso" ? isoLatest() : base360Latest()));
  delete S.overviewErrors[w];
  const o = OV[w];
  const p = produce(w, o.op, o.options(), o.kind, { pred: o.pred, alive, override }).catch((e) => {
    S.overviewErrors[w] = e.message;
    throw e;
  });
  p.finally(() => hooks.render()).catch(() => {});
  hooks.render();
  return p;
}
// Starts whatever the overview is missing (once per project visit; failures wait for Try again).
export function ensureOverview() {
  if (S.overviewStarted || !S.project || !approvedGroundIds().length) return;
  S.overviewStarted = true;
  // Only the isometric here: the 360 view is generated at the end, from the finished design.
  if (!isoLatest() && !isRunning("iso")) startOverviewJob("iso").catch(() => {});
}
export const useAnyway = (a, label) => acceptGenerated(a).then(() => {
  toast(`${label} accepted despite the quality check.`, { title: "Saved" });
  hooks.render();
});

/* ---------------- Reset ---------------- */

export function resetLocal() {
  for (const s of Object.values(S.slots)) if (s?.url) URL.revokeObjectURL(s.url);
  resetCaches();
  clearViewerState();
  resetGate();
  resetDesign();
  Object.assign(S, {
    project: null, stage: 0, jobs: new Map(), busy: new Set(), slots: {}, pins: [], draft: null, chain: [], viewing: null,
    overviewErrors: {}, overviewStarted: false, qa: {}, costs: null, costOpen: false, presenting: false,
  });
}
