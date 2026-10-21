// element_view: re-render one approved decor element from a requested camera angle.
// Angles use the Qwen multiple-angles vocabulary so Gemini and fal receive the same camera.
import { approvedAsset, fail, id, text } from "./contracts.js";

export const ELEMENT_VIEW_SOURCE_KINDS = [
  "decor",
  "reference",
  "component_sheet",
  "element_view",
  // Edited decor (Decor step) can be turned around too.
  "region_edit",
];
export const ANGLE_PROVIDERS = ["gemini", "fal"];

const AZIMUTH_WORDS = [
  "front view",
  "front-right quarter view",
  "right side view",
  "back-right quarter view",
  "back view",
  "back-left quarter view",
  "left side view",
  "front-left quarter view",
];

export function azimuthWords(azimuth) {
  return AZIMUTH_WORDS[Math.round(azimuth / 45) % 8];
}
export function elevationWords(elevation) {
  if (elevation >= 75) return "bird's-eye top-down shot";
  if (elevation >= 45) return "high-angle shot";
  if (elevation >= 15) return "elevated shot";
  if (elevation > -15) return "eye-level shot";
  return "low-angle shot";
}
export function distanceWords(zoom) {
  if (zoom <= 2) return "wide shot";
  if (zoom < 8) return "medium shot";
  return "close-up";
}
export function angleLabel({ azimuth, elevation, zoom }) {
  return `${azimuthWords(azimuth)}, ${elevationWords(elevation)}, ${distanceWords(zoom)}`;
}

const inRange = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

export function validateElementViewOptions(options = {}, project, env = process.env) {
  const code = "INVALID_JOB";
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (k) =>
        !["sourceAssetId", "azimuth", "elevation", "zoom", "provider", "note"].includes(k),
    )
  )
    fail(
      code,
      "element_view options must contain only sourceAssetId, azimuth, elevation, zoom, provider and note",
    );
  if (!id(options.sourceAssetId)) fail(code, "element_view requires a sourceAssetId");
  approvedAsset(project, options.sourceAssetId, ELEMENT_VIEW_SOURCE_KINDS);
  if (
    !inRange(options.azimuth, 0, 359) ||
    !inRange(options.elevation, -30, 90) ||
    !inRange(options.zoom, 0, 10)
  )
    fail(code, "azimuth must be 0-359, elevation -30 to 90 and zoom 0-10");
  const provider = options.provider ?? (env.WEDDING_ANGLES_PROVIDER || "gemini");
  if (!ANGLE_PROVIDERS.includes(provider))
    fail(code, `provider must be one of: ${ANGLE_PROVIDERS.join(", ")}`);
  const note = text(options.note ?? "", 200, code);
  return {
    sourceAssetId: options.sourceAssetId,
    azimuth: options.azimuth,
    elevation: options.elevation,
    zoom: options.zoom,
    provider,
    ...(note ? { note } : {}),
  };
}
