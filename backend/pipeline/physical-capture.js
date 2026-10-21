import { approvedAsset, fail, id, text } from "./contracts.js";
import { fingerprint } from "./fingerprints.js";

export const PHYSICAL_OPERATIONS = [
  "lens_calibration",
  "hdr_merge",
  "venue_reconstruction",
  "scene_showcase",
];
export const PHYSICAL_INPUT_KINDS = [
  "calibration_input",
  "exposure",
  "reconstruction_input",
];
const recipeKey = {
  lens_calibration: "calibration",
  hdr_merge: "hdr",
  venue_reconstruction: "reconstruction",
};
const inputKind = {
  lens_calibration: "calibration_input",
  hdr_merge: "exposure",
  venue_reconstruction: "reconstruction_input",
};
const range = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
function shape(v, allowed) {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).some((k) => !allowed.includes(k))
  )
    fail("INVALID_PHYSICAL_CAPTURE", "Unexpected physical capture fields");
}
function selected(value, project, kind, min, max) {
  if (
    !Array.isArray(value) ||
    value.length < min ||
    value.length > max ||
    new Set(value).size !== value.length ||
    value.some((v) => !id(v))
  )
    fail(
      "INVALID_PHYSICAL_CAPTURE",
      `Select ${min}–${max} distinct ${kind} asset IDs`,
    );
  for (const assetId of value) {
    if (!project.assets.some((a) => a.id === assetId && a.kind === kind))
      fail(
        "INVALID_PHYSICAL_CAPTURE",
        "Capture references must have the correct role in this project",
      );
  }
  return [...value];
}

export function validatePhysicalCapture(value, project) {
  shape(value, ["calibration", "hdr", "reconstruction"]);
  const result = { calibration: null, hdr: null, reconstruction: null };
  if (value.calibration != null) {
    const c = value.calibration;
    shape(c, ["assetIds", "columns", "rows", "squareSizeMetres", "cameraId"]);
    if (
      ![c.columns, c.rows].every(
        (v) => Number.isSafeInteger(v) && v >= 4 && v <= 20,
      ) ||
      !range(c.squareSizeMetres, 0.001, 1)
    )
      fail(
        "INVALID_PHYSICAL_CAPTURE",
        "Provide checkerboard inner corner counts and measured square size in metres",
      );
    const cameraId = text(c.cameraId, 100, "INVALID_PHYSICAL_CAPTURE");
    if (!cameraId)
      fail(
        "INVALID_PHYSICAL_CAPTURE",
        "A stable camera/lens identifier is required",
      );
    result.calibration = {
      assetIds: selected(c.assetIds, project, "calibration_input", 8, 20),
      columns: c.columns,
      rows: c.rows,
      squareSizeMetres: c.squareSizeMetres,
      cameraId,
    };
  }
  if (value.hdr != null) {
    const c = value.hdr;
    shape(c, [
      "assetIds",
      "exposureSeconds",
      "iso",
      "fNumber",
      "cameraId",
      "whiteBalance",
      "cameraPosition",
      "sceneMotion",
    ]);
    const assetIds = selected(c.assetIds, project, "exposure", 3, 7);
    if (
      !Array.isArray(c.exposureSeconds) ||
      c.exposureSeconds.length !== assetIds.length ||
      c.exposureSeconds.some((t) => !range(t, 0.000001, 120)) ||
      new Set(c.exposureSeconds).size !== assetIds.length ||
      Math.max(...c.exposureSeconds) / Math.min(...c.exposureSeconds) < 4 ||
      !range(c.iso, 25, 51200) ||
      !range(c.fNumber, 0.7, 64) ||
      c.whiteBalance !== "locked" ||
      c.cameraPosition !== "fixed" ||
      c.sceneMotion !== "static"
    )
      fail(
        "INVALID_PHYSICAL_CAPTURE",
        "HDR needs timed brackets spanning at least two stops, fixed ISO/aperture/white balance, tripod and static scene",
      );
    const cameraId = text(c.cameraId, 100, "INVALID_PHYSICAL_CAPTURE");
    if (!cameraId)
      fail(
        "INVALID_PHYSICAL_CAPTURE",
        "Identify the camera/lens used for the bracket",
      );
    result.hdr = {
      assetIds,
      exposureSeconds: [...c.exposureSeconds],
      iso: c.iso,
      fNumber: c.fNumber,
      cameraId,
      whiteBalance: "locked",
      cameraPosition: "fixed",
      sceneMotion: "static",
    };
  }
  if (value.reconstruction != null) {
    const c = value.reconstruction;
    shape(c, ["assetIds", "calibrationAssetId", "quality", "cameraId"]);
    if (
      !id(c.calibrationAssetId) ||
      !project.assets.some(
        (a) => a.id === c.calibrationAssetId && a.kind === "camera_calibration",
      ) ||
      !["sparse", "dense"].includes(c.quality)
    )
      fail(
        "INVALID_PHYSICAL_CAPTURE",
        "Select a calibration result and explicit sparse/dense reconstruction quality",
      );
    const cameraId = text(c.cameraId, 100, "INVALID_PHYSICAL_CAPTURE");
    if (
      !cameraId ||
      (result.calibration && result.calibration.cameraId !== cameraId)
    )
      fail(
        "INVALID_PHYSICAL_CAPTURE",
        "Reconstruction must use the calibration camera/lens",
      );
    result.reconstruction = {
      assetIds: selected(c.assetIds, project, "reconstruction_input", 12, 60),
      calibrationAssetId: c.calibrationAssetId,
      quality: c.quality,
      cameraId,
    };
  }
  return result;
}

export function physicalHash(project, operation) {
  const recipe = project.physicalCapture?.[recipeKey[operation]] ?? null;
  return fingerprint({
    formatVersion: 1,
    operation,
    recipe,
    inputs: (recipe?.assetIds ?? []).map((assetId) => {
      const a = project.assets.find((x) => x.id === assetId);
      return a
        ? {
            id: a.id,
            hash: a.hash ?? a.sha256 ?? null,
            kind: a.kind,
            status: a.status,
            width: a.width,
            height: a.height,
          }
        : null;
    }),
    ...(operation === "venue_reconstruction"
      ? {
          calibrationInputHash: physicalHash(project, "lens_calibration"),
          calibration: project.assets
            .filter((a) => a.id === recipe?.calibrationAssetId)
            .map((a) => ({
              id: a.id,
              sha256: a.sha256,
              status: a.status,
              sourcePhysicalHash: a.sourcePhysicalHash,
            })),
        }
      : {}),
  });
}

export function requireCurrentPhysical(project, asset) {
  if (
    !recipeKey[asset?.physicalOperation] ||
    asset.sourcePhysicalHash !== physicalHash(project, asset.physicalOperation)
  )
    fail(
      "STALE_PHYSICAL_CAPTURE",
      "Physical capture settings, input approvals or calibration changed; regenerate this result",
      409,
    );
}

export function physicalInputs(project, operation) {
  const key = recipeKey[operation];
  const recipe = project.physicalCapture?.[key];
  if (!key || !recipe)
    fail(
      "PHYSICAL_CAPTURE_REQUIRED",
      "Configure the matching physical capture recipe first",
    );
  const inputs = recipe.assetIds.map((assetId) =>
    approvedAsset(project, assetId, [inputKind[operation]]),
  );
  if (
    inputs.some(
      (a) =>
        !a.hash ||
        !Number.isSafeInteger(a.width) ||
        !Number.isSafeInteger(a.height),
    )
  )
    fail(
      "CAPTURE_METADATA_REQUIRED",
      "Physical inputs require decoded image metadata and normalized checksums",
    );
  if (new Set(inputs.map((a) => a.hash)).size !== inputs.length)
    fail("DUPLICATE_IMAGE", "Physical capture must use distinct photographs");
  if (
    inputs.some(
      (a) => a.width !== inputs[0].width || a.height !== inputs[0].height,
    )
  )
    fail(
      "CAPTURE_DIMENSIONS_MISMATCH",
      "All images must use identical normalized dimensions and orientation",
    );
  if (operation === "venue_reconstruction") {
    const calibration = approvedAsset(project, recipe.calibrationAssetId, [
      "camera_calibration",
    ]);
    requireCurrentPhysical(project, calibration);
    if (
      calibration.cameraId !== recipe.cameraId ||
      calibration.width !== inputs[0].width ||
      calibration.height !== inputs[0].height
    )
      fail(
        "CALIBRATION_MISMATCH",
        "Camera/lens and image dimensions must match the approved calibration",
      );
    if (!process.env.WEDDING_PIPELINE_COLMAP?.trim())
      fail(
        "COLMAP_NOT_CONFIGURED",
        "Configure a compatible native COLMAP executable before queuing reconstruction",
        503,
      );
    if (/\.(bat|cmd|ps1)$/i.test(process.env.WEDDING_PIPELINE_COLMAP.trim()))
      fail(
        "COLMAP_NATIVE_EXECUTABLE_REQUIRED",
        "Use the native COLMAP executable rather than a shell wrapper",
        503,
      );
  }
  return {
    recipe,
    inputs,
    sourcePhysicalHash: physicalHash(project, operation),
  };
}

export function physicalReadiness(project) {
  return {
    formatVersion: 1,
    sourceRevision: project.revision,
    nativeRuntimeVerified: false,
    operations: ["lens_calibration", "hdr_merge", "venue_reconstruction"].map(
      (operation) => {
        try {
          const r = physicalInputs(project, operation);
          return {
            operation,
            status: "ready_for_processing",
            sourcePhysicalHash: r.sourcePhysicalHash,
            inputCount: r.inputs.length,
          };
        } catch (error) {
          if (!error.status) throw error;
          return {
            operation,
            status: "blocked",
            code: error.code,
            reason: error.message,
          };
        }
      },
    ),
    captureDeclarationsIndependentlyVerified: false,
    trueHdri: false,
    full360CoverageVerified: false,
  };
}
