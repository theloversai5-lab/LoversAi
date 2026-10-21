import { fail, id, text } from "./contracts.js";
import { fingerprint } from "./fingerprints.js";

export const CONTEXT_VIEWS = ["satellite", "aerial", "detail"];
export const VENUE_VIEWS = [
  "front",
  "right",
  "back",
  "left",
  "unspecified",
  ...CONTEXT_VIEWS,
];

export function validateVenueCapture(value, project) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (k) =>
        ![
          "assetIds",
          "sourceType",
          "sourceLabel",
          "cameraPosition",
          "overlap",
          "displayHorizontalFovDeg",
        ].includes(k),
    )
  )
    fail(
      "INVALID_VENUE_CAPTURE",
      "Provide capture asset IDs, provenance and optional display settings",
    );
  const assetIds = value.assetIds ?? [];
  if (
    !Array.isArray(assetIds) ||
    assetIds.length > 5 ||
    new Set(assetIds).size !== assetIds.length ||
    assetIds.some((x) => !id(x))
  )
    fail(
      "INVALID_VENUE_CAPTURE",
      "Select at most five distinct project venue asset IDs",
    );
  for (const assetId of assetIds) {
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset || asset.kind !== "venue" || CONTEXT_VIEWS.includes(asset.view))
      fail(
        "INVALID_VENUE_CAPTURE",
        "Capture selection must use owned ground venue images; context views cannot be stitched",
      );
  }
  const sourceType = value.sourceType ?? "unknown";
  const cameraPosition = value.cameraPosition ?? "unknown";
  const overlap = value.overlap ?? "unknown";
  const displayHorizontalFovDeg = value.displayHorizontalFovDeg ?? 120;
  if (
    !["photographs", "pdf_demo", "synthetic_fixture", "unknown"].includes(
      sourceType,
    ) ||
    !["fixed", "moving", "unknown"].includes(cameraPosition) ||
    !["declared", "unknown"].includes(overlap) ||
    !Number.isFinite(displayHorizontalFovDeg) ||
    displayHorizontalFovDeg < 30 ||
    displayHorizontalFovDeg > 180
  )
    fail(
      "INVALID_VENUE_CAPTURE",
      "Unsupported capture declarations or display field of view outside 30–180 degrees",
    );
  return {
    assetIds: [...assetIds],
    sourceType,
    sourceLabel: text(value.sourceLabel, 200, "INVALID_VENUE_CAPTURE"),
    cameraPosition,
    overlap,
    displayHorizontalFovDeg,
  };
}

export function selectedGroundViews(project) {
  if (project.venueCapture?.assetIds?.length)
    return project.venueCapture.assetIds.map((assetId) =>
      project.assets.find((a) => a.id === assetId),
    );
  return project.assets.filter(
    (a) => a.kind === "venue" && !CONTEXT_VIEWS.includes(a.view),
  );
}

export function venueCaptureHash(project) {
  return fingerprint({
    formatVersion: 1,
    capture: project.venueCapture ?? null,
    sources: selectedGroundViews(project).map((a) =>
      a
        ? {
            id: a.id,
            kind: a.kind,
            hash: a.hash ?? null,
            view: a.view,
            width: a.width ?? null,
            height: a.height ?? null,
            status: a.status,
          }
        : null,
    ),
  });
}

export const RECAPTURE_GUIDANCE = [
  "Capture four or five adjacent ground views from one camera position with substantial visual overlap.",
  "Use stable exposure, one lens and original photographs at least 512 pixels on each side; larger source images preserve more detail.",
  "Avoid moving foreground people, abrupt camera translation and changing lighting between views.",
  "Label aerial, satellite and detail images as context; they do not replace missing ground captures.",
  "Ordinary JPEG captures cannot establish radiometric HDR, complete 360 coverage, physical scale or reconstructed venue geometry.",
];

export function venueReadiness(project) {
  const selected = selectedGroundViews(project);
  const blockers = [];
  const warnings = ["OVERLAP_NOT_YET_VERIFIED", "LDR_PARTIAL_COVERAGE_ONLY"];
  if (selected.length < 4 || selected.length > 5)
    blockers.push("VENUE_VIEW_COUNT");
  if (
    selected.some(
      (a) => !a || a.kind !== "venue" || CONTEXT_VIEWS.includes(a.view),
    )
  )
    blockers.push("INVALID_VENUE_SELECTION");
  if (selected.some((a) => a && a.status !== "approved"))
    blockers.push("VENUE_APPROVAL_REQUIRED");
  if (
    selected.some(
      (a) =>
        a &&
        Number.isFinite(a.width) &&
        Number.isFinite(a.height) &&
        Math.min(a.width, a.height) < 512,
    )
  )
    blockers.push("IMAGE_TOO_SMALL");
  const hashes = selected.filter((a) => a?.hash).map((a) => a.hash);
  if (new Set(hashes).size !== hashes.length) blockers.push("DUPLICATE_IMAGE");
  const labels = selected
    .filter((a) => a && a.view !== "unspecified")
    .map((a) => a.view);
  if (new Set(labels).size !== labels.length)
    blockers.push("DUPLICATE_GROUND_VIEW");
  if (project.venueCapture?.cameraPosition === "moving")
    blockers.push("CAMERA_TRANSLATION_UNSUPPORTED");
  if (project.venueCapture?.cameraPosition !== "fixed")
    warnings.push("CAMERA_POSITION_UNCONFIRMED");
  if (project.venueCapture?.sourceType === "pdf_demo")
    warnings.push("PDF_DEMO_NOT_CAPTURE_EVIDENCE");
  if (project.venueCapture?.sourceType === "synthetic_fixture")
    warnings.push("SYNTHETIC_NOT_REAL_VENUE");
  if (!project.venueCapture || project.venueCapture.sourceType === "unknown")
    warnings.push("SOURCE_PROVENANCE_UNDECLARED");
  if (
    selected.some(
      (a) =>
        a &&
        (!a.hash || !Number.isFinite(a.width) || !Number.isFinite(a.height)),
    )
  )
    warnings.push("SOURCE_METADATA_INCOMPLETE");
  return {
    formatVersion: 1,
    sourceRevision: project.revision,
    sourceCaptureHash: venueCaptureHash(project),
    status: blockers.length ? "blocked" : "ready_for_alignment",
    canEnqueuePanorama: blockers.length === 0,
    alignmentVerified: false,
    trueHdri: false,
    reconstructedGeometry: false,
    capture: project.venueCapture ?? null,
    selectedGroundViews: selected
      .filter(Boolean)
      .map((a) => ({
        id: a.id,
        view: a.view,
        status: a.status,
        width: a.width ?? null,
        height: a.height ?? null,
      })),
    excludedContextAssetIds: project.assets
      .filter((a) => a.kind === "venue" && CONTEXT_VIEWS.includes(a.view))
      .map((a) => a.id),
    blockers,
    warnings,
    recaptureGuidance: RECAPTURE_GUIDANCE,
  };
}

export function requireReadyCapture(project) {
  const report = venueReadiness(project);
  if (!report.canEnqueuePanorama)
    fail(
      report.blockers[0],
      `Venue capture is blocked: ${report.blockers.join(", ")}. Read venue-readiness for recapture guidance`,
    );
  return { report, views: selectedGroundViews(project) };
}

export function requireCurrentEnvironment(project, asset) {
  if (
    !asset?.sourceCaptureHash ||
    asset.sourceCaptureHash !== venueCaptureHash(project)
  )
    fail(
      "STALE_ENVIRONMENT",
      "Selected captures, their approval or capture settings changed; regenerate the environment",
      409,
    );
  requireReadyCapture(project);
}
