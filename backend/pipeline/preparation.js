import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { approvedAsset, validateCanvas, fail } from "./contracts.js";
import { renderCanvas, renderRegionMap, pasteCutout } from "./media.js";
import { compilePrompt } from "./prompts.js";
import { requireCurrentEnvironment } from "./venue-capture.js";

export const GENERATIVE_OPERATIONS = [
  "component_sheet",
  "showcase",
  "venue_isometric",
  "placement",
  "venue_360",
  "region_edit",
  "element_view",
];
// Wide output for panoramic tasks; others use the model default.
export const ASPECT_RATIO = { venue_360: "21:9" };
const SUPPORTED_RATIOS = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"];
// Region edits must keep the base framing: pick the supported ratio closest to the base.
export function nearestAspectRatio(width, height) {
  if (!(width > 0 && height > 0)) return undefined;
  const target = Math.log(width / height);
  return SUPPORTED_RATIOS.reduce((best, r) => {
    const [w, h] = r.split(":").map(Number);
    const [bw, bh] = best.split(":").map(Number);
    return Math.abs(Math.log(w / h) - target) < Math.abs(Math.log(bw / bh) - target)
      ? r
      : best;
  });
}

// Shared by nonbillable inspection, enqueue validation and paid stage execution.
export async function prepareGeneration(job, { assets, saveOverlay }) {
  if (!GENERATIVE_OPERATIONS.includes(job.operation))
    fail(
      "INVALID_TASK",
      `Only ${GENERATIVE_OPERATIONS.join(", ")} support generation`,
    );
  const p = structuredClone(job.snapshot);
  let overlay, overlayBuffer, placedBase;
  let aspectRatio =
    job.operation === "component_sheet" && job.options?.viewType === "board"
      ? "3:2"
      : ASPECT_RATIO[job.operation];
  if (job.operation === "showcase" && p.canvas) {
    validateCanvas(p.canvas, p);
    const base = approvedAsset(p, p.canvas.baseAssetId);
    if (base.kind === "panorama") requireCurrentEnvironment(p, base);
    overlayBuffer = await renderCanvas(await assets.read(base.id), p.canvas);
    const meta = {
      kind: "canvas_overlay",
      status: "approved",
      referenceAssetIds: [base.id],
    };
    overlay = saveOverlay
      ? await saveOverlay(overlayBuffer, "image/png", meta)
      : { ...meta, id: randomUUID(), mimeType: "image/png" };
    p.assets.push(overlay);
  } else if (job.operation === "placement" && p.canvas) {
    // Rasterize the placement overlay from the canvas for the placement region
    validateCanvas(p.canvas, p);
    const base = approvedAsset(p, job.options.baseAssetId);
    overlayBuffer = await renderCanvas(await assets.read(base.id), p.canvas);
    const meta = {
      kind: "canvas_overlay",
      status: "approved",
      referenceAssetIds: [base.id],
    };
    overlay = saveOverlay
      ? await saveOverlay(overlayBuffer, "image/png", meta)
      : { ...meta, id: randomUUID(), mimeType: "image/png" };
    p.assets.push(overlay);
  } else if (job.operation === "region_edit") {
    const base = approvedAsset(p, job.options.baseAssetId);
    let baseBuffer = await assets.read(base.id);
    if (job.options.place) {
      approvedAsset(p, job.options.place.cutoutAssetId, ["decor_cutout"]);
      baseBuffer = await pasteCutout(baseBuffer, await assets.read(job.options.place.cutoutAssetId), job.options.place);
      placedBase = { id: base.id, buffer: baseBuffer };
    }
    const { width, height } = await sharp(baseBuffer).metadata();
    aspectRatio = nearestAspectRatio(width, height);
    overlayBuffer = await renderRegionMap(baseBuffer, job.options.regions);
    const meta = {
      kind: "canvas_overlay",
      status: "approved",
      referenceAssetIds: [base.id],
    };
    overlay = saveOverlay
      ? await saveOverlay(overlayBuffer, "image/png", meta)
      : { ...meta, id: randomUUID(), mimeType: "image/png" };
    p.assets.push(overlay);
  }
  const prompt = compilePrompt(job.operation, p, {
    ...job.options,
    overlayAssetId: overlay?.id,
  });
  if (prompt.references.length > 13)
    fail(
      "REFERENCE_LIMIT",
      "At most 13 source references are supported; QA reserves the fourteenth image slot",
    );
  const references = await Promise.all(
    prompt.references.map(async (r) => ({
      ...r,
      mimeType: approvedAsset(p, r.assetId).mimeType,
      buffer:
        r.assetId === overlay?.id
          ? overlayBuffer
          : r.assetId === placedBase?.id
            ? placedBase.buffer
            : await assets.read(r.assetId),
    })),
  );
  return { prompt, references, overlay, aspectRatio, placedBuffer: placedBase?.buffer };
}
