export class PipelineError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export const fail = (code, message, status = 400) => {
  throw new PipelineError(code, message, status);
};
export const id = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
export function text(value = "", max = 2000, code = "INVALID_INPUT") {
  if (typeof value !== "string" || value.length > max)
    fail(code, `Expected text of at most ${max} characters`);
  return value.trim();
}
function array(value = [], max = 20, code = "INVALID_INPUT") {
  if (!Array.isArray(value) || value.length > max)
    fail(code, `Expected at most ${max} items`);
  return value;
}
function object(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(code, "Expected an object");
}
function keys(value, allowed, code) {
  object(value, code);
  if (Object.keys(value).some((k) => !allowed.includes(k)))
    fail(code, "Unexpected field");
}
const strings = (v, max, n, code) =>
  array(v, max, code).map((x) => text(x, n, code));
export function validateBrief(value = {}) {
  const code = "INVALID_BRIEF";
  keys(
    value,
    ["description", "ceremony", "style", "palette", "constraints"],
    code,
  );
  return {
    description: text(value.description, 8000, code),
    ceremony: text(value.ceremony, 100, code),
    style: text(value.style, 200, code),
    palette: strings(value.palette, 8, 40, code),
    constraints: strings(value.constraints, 30, 300, code),
  };
}
export const CATEGORIES = [
  "flowers",
  "decoration",
  "entry",
  "mandap",
  "stage",
  "dance_floor",
  "bar",
  "lounge",
  "dining",
  "photo_booth",
];
export function validateComponents(values = []) {
  const code = "INVALID_COMPONENT",
    seen = new Set();
  return array(values, 12, code).map((c) => {
    keys(
      c,
      [
        "id",
        "category",
        "description",
        "palette",
        "materials",
        "dimensions",
        "referenceAssetIds",
      ],
      code,
    );
    if (!id(c.id) || seen.has(c.id) || !CATEGORIES.includes(c.category))
      fail(code, "Unique component ID and supported category required");
    seen.add(c.id);
    const description = text(c.description, 2000, code);
    if (!description) fail(code, "Component description required");
    let dimensions = null;
    if (c.dimensions != null) {
      keys(c.dimensions, ["width", "depth", "height", "unit"], code);
      if (
        c.dimensions.unit !== "m" ||
        ["width", "depth", "height"].some(
          (k) =>
            !Number.isFinite(c.dimensions[k]) ||
            c.dimensions[k] <= 0 ||
            c.dimensions[k] > 100,
        )
      )
        fail(code, "Dimensions must be measured positive metres, at most 100");
      dimensions = { ...c.dimensions };
    }
    const refs = array(c.referenceAssetIds, 4, code);
    if (refs.some((x) => !id(x))) fail(code, "Invalid reference asset ID");
    return {
      id: c.id,
      category: c.category,
      description,
      palette: strings(c.palette, 8, 40, code),
      materials: strings(c.materials, 10, 100, code),
      dimensions,
      referenceAssetIds: refs,
    };
  });
}
export function approvedAsset(project, assetId, kinds) {
  const asset = project.assets?.find((a) => a.id === assetId);
  if (
    !asset ||
    asset.status !== "approved" ||
    (kinds && !kinds.includes(asset.kind))
  )
    fail(
      "ASSET_NOT_APPROVED",
      "Asset must be approved and belong to this project",
    );
  return asset;
}
function points(values, min, max) {
  return array(values, max, "INVALID_CANVAS")
    .map((p) => {
      if (
        !Array.isArray(p) ||
        p.length !== 2 ||
        p.some((n) => !Number.isFinite(n) || n < 0 || n > 1)
      )
        fail(
          "INVALID_CANVAS",
          "Coordinates must be finite normalized values from 0 to 1",
        );
      return [...p];
    })
    .filter((_, i, a) => {
      if (a.length < min)
        fail("INVALID_CANVAS", `At least ${min} points required`);
      return true;
    });
}
const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function inside(p, poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
const on = (a, b, p) =>
  Math.abs(cross(a, b, p)) < 1e-9 &&
  p[0] >= Math.min(a[0], b[0]) - 1e-9 &&
  p[0] <= Math.max(a[0], b[0]) + 1e-9 &&
  p[1] >= Math.min(a[1], b[1]) - 1e-9 &&
  p[1] <= Math.max(a[1], b[1]) + 1e-9;
function intersects(a, b, c, d) {
  return (
    (cross(a, b, c) * cross(a, b, d) < 0 &&
      cross(c, d, a) * cross(c, d, b) < 0) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}
export function overlap(a, b) {
  return (
    a.some((p) => inside(p, b)) ||
    b.some((p) => inside(p, a)) ||
    a.some((p, i) =>
      b.some((q, j) =>
        intersects(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length]),
      ),
    )
  );
}
export function validateCanvas(value, project) {
  const code = "INVALID_CANVAS";
  keys(value, ["baseAssetId", "regions", "strokes"], code);
  approvedAsset(project, value.baseAssetId, [
    "venue",
    "showcase",
    "panorama",
    "venue_isometric",
    "placement",
  ]);
  const seen = new Set();
  const layer = (item, polygon) => {
    keys(item, ["id", "action", "componentId", "points"], code);
    if (!polygon && item.action === "keep_clear")
      fail(
        code,
        "Keep-clear areas require a polygon; a stroke has no defined clearance width",
      );
    if (
      !id(item.id) ||
      seen.has(item.id) ||
      !["place", "remove", "recolor", "keep_clear"].includes(item.action)
    )
      fail(code, "Unique layer IDs and supported actions required");
    seen.add(item.id);
    if (item.action === "place" || item.action === "recolor") {
      const component = project.components?.find(
        (c) => c.id === item.componentId,
      );
      if (!component) fail(code, "Unknown component ID");
      approvedAsset(project, component.masterAssetId, ["component_sheet"]);
    } else if (item.componentId != null)
      fail(code, "Component ID only supported on place/recolor layers");
    const pts = points(item.points, polygon ? 3 : 2, polygon ? 64 : 500);
    if (pts.length < (polygon ? 3 : 2)) fail(code, "Too few points");
    if (
      polygon &&
      Math.abs(
        pts.reduce(
          (s, p, i) =>
            s +
            p[0] * pts[(i + 1) % pts.length][1] -
            pts[(i + 1) % pts.length][0] * p[1],
          0,
        ),
      ) < 0.00001
    )
      fail(code, "Region must enclose a nonzero area");
    return {
      id: item.id,
      action: item.action,
      ...(item.componentId ? { componentId: item.componentId } : {}),
      points: pts,
    };
  };
  const regions = array(value.regions, 30, code).map((x) => layer(x, true));
  const strokes = array(value.strokes, 50, code).map((x) => layer(x, false));
  const protectedRegions = regions.filter((r) => r.action === "keep_clear");
  for (const layer of [...regions, ...strokes].filter((r) =>
    ["place", "recolor"].includes(r.action),
  ))
    if (protectedRegions.some((p) => overlap(layer.points, p.points)))
      fail(
        "PROTECTED_REGION_CONFLICT",
        "Placement or recolor overlaps a keep-clear region",
      );
  return { baseAssetId: value.baseAssetId, regions, strokes };
}

const COMPONENT_SHEET_VIEW_TYPES = ["front", "top", "side", "left", "right", "detail", "full_sheet", "spec", "board"];
// Dimensioned drawings: documentation outputs, never component masters or render references.
export const DRAWING_VIEW_TYPES = ["spec", "board"];

export function validateVenueIsometricOptions(options = {}, project) {
  const code = "INVALID_JOB";
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((k) => k !== "venueAssetIds")
  )
    fail(code, "venue_isometric options must contain only venueAssetIds");
  const venueAssetIds = options.venueAssetIds;
  if (
    !Array.isArray(venueAssetIds) ||
    venueAssetIds.length < isometricMinViews() ||
    venueAssetIds.length > 5 ||
    new Set(venueAssetIds).size !== venueAssetIds.length ||
    venueAssetIds.some((x) => typeof x !== "string")
  )
    fail(code, `venueAssetIds must be ${isometricMinViews()} to 5 distinct asset IDs`);
  // Classify assets: ground views (front/right/back/left/unspecified) and satellite/aerial
  let satelliteCount = 0;
  let groundCount = 0;
  for (const assetId of venueAssetIds) {
    const asset = approvedAsset(project, assetId, ["venue"]);
    if (["satellite", "aerial"].includes(asset.view)) {
      satelliteCount++;
    } else {
      groundCount++;
    }
  }
  if (satelliteCount > 1)
    fail(code, "At most one satellite or aerial view is allowed");
  // Three opposing ground views (e.g. front/right/back) suffice for a generative isometric.
  if (groundCount < isometricMinViews())
    fail(code, `At least ${isometricMinViews()} approved ground venue view(s) required`);
  return { venueAssetIds: [...venueAssetIds] };
}

// Default 3. Demo runtimes may set WEDDING_PIPELINE_ISOMETRIC_MIN_VIEWS=1 for single-photo concept venues.
export function isometricMinViews(env = process.env) {
  const v = Number(env.WEDDING_PIPELINE_ISOMETRIC_MIN_VIEWS);
  return Number.isSafeInteger(v) && v >= 1 && v <= 3 ? v : 3;
}

export function validatePlacementOptions(options = {}, project) {
  const code = "INVALID_JOB";
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((k) => !["baseAssetId", "componentId"].includes(k))
  )
    fail(code, "placement options must contain only baseAssetId and componentId");
  const { baseAssetId, componentId } = options;
  if (!baseAssetId || typeof baseAssetId !== "string")
    fail(code, "placement options require a baseAssetId");
  if (!componentId || typeof componentId !== "string")
    fail(code, "placement options require a componentId");
  // Validate base asset is an approved venue_isometric or placement asset in this project
  approvedAsset(project, baseAssetId, ["venue_isometric", "placement"]);
  // Validate componentId references a component with an approved master sheet
  const component = project.components?.find((c) => c.id === componentId);
  if (!component) fail(code, "Unknown component ID");
  if (!component.masterAssetId)
    fail(
      "ASSET_NOT_APPROVED",
      `Component ${componentId} needs an approved master sheet`,
    );
  approvedAsset(project, component.masterAssetId, ["component_sheet"]);
  // Validate the project canvas uses this base and has exactly one place region for the component
  if (!project.canvas)
    fail(code, "Project canvas is required for placement");
  if (project.canvas.baseAssetId !== baseAssetId)
    fail(
      code,
      "Project canvas baseAssetId must match placement baseAssetId",
    );
  const placeRegions = (project.canvas.regions || []).filter(
    (r) => r.action === "place" && r.componentId === componentId,
  );
  if (placeRegions.length !== 1)
    fail(
      code,
      "Canvas must contain exactly one place region for the target component",
    );
  return { baseAssetId, componentId };
}

export function validateComponentSheetOptions(options = {}) {
  const code = "INVALID_JOB";
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((k) => !["componentId", "viewType", "dimensions", "specNotes"].includes(k))
  )
    fail(code, "component_sheet options must contain only componentId, viewType, dimensions and specNotes");
  const viewType = options.viewType ?? "full_sheet";
  if (!COMPONENT_SHEET_VIEW_TYPES.includes(viewType))
    fail(
      code,
      `viewType must be one of: ${COMPONENT_SHEET_VIEW_TYPES.join(", ")}`,
    );
  const result = {};
  if (options.componentId !== undefined) result.componentId = options.componentId;
  result.viewType = viewType;
  if (options.dimensions !== undefined) {
    const d = options.dimensions;
    const ok = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0.1 && v <= 300;
    if (
      !DRAWING_VIEW_TYPES.includes(viewType) ||
      !d ||
      typeof d !== "object" ||
      Object.keys(d).some((k) => !["widthFt", "depthFt", "heightFt"].includes(k)) ||
      !Object.values(d).every(ok)
    )
      fail(code, "dimensions (widthFt/depthFt/heightFt, 0.1-300 ft) are only allowed with viewType spec or board");
    result.dimensions = { ...d };
  }
  if (options.specNotes !== undefined) {
    const n = options.specNotes;
    if (viewType !== "board" || typeof n !== "string" || !n.trim() || n.length > 1500)
      fail(code, "specNotes (1-1500 characters) are only allowed with viewType board");
    result.specNotes = n.trim();
  }
  return result;
}

// venue_360: AI-generated wide eye-level panorama of the (decorated) venue.
export function validateVenue360Options(options = {}, project) {
  const code = "INVALID_JOB";
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).some((k) => k !== "designAssetId")
  )
    fail(code, "venue_360 options must contain only designAssetId");
  if (!project.assets.some((a) => a.kind === "venue" && a.status === "approved"))
    fail(code, "At least one approved venue photograph is required");
  if (options.designAssetId !== undefined) {
    if (!id(options.designAssetId)) fail(code, "Invalid designAssetId");
    approvedAsset(project, options.designAssetId, [
      "showcase",
      "placement",
      "venue_isometric",
      "region_edit",
    ]);
    return { designAssetId: options.designAssetId };
  }
  return {};
}

// region_edit: numbered ellipse regions, each with a comment and optional references.
export const REGION_EDIT_BASE_KINDS = [
  "venue_isometric",
  "region_edit",
  "showcase",
  "placement",
  "venue",
  // Decor elements can be edited directly before they go into a spec sheet.
  "decor",
  "reference",
  "element_view",
  "component_sheet",
];
export const REGION_REFERENCE_KINDS = [
  "decor",
  "reference",
  "component_sheet",
  "element_view",
  "venue",
  "region_edit",
];
const inRange = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

// Shared ellipse geometry for region_edit regions and suggestion requests.
// cx/rx are fractions of image width, cy/ry of image height; rotation in degrees (pixel space).
export function validateEllipse(value, code = "INVALID_JOB") {
  if (
    !inRange(value.cx, 0, 1) ||
    !inRange(value.cy, 0, 1) ||
    !inRange(value.rx, 0.01, 0.5) ||
    !inRange(value.ry, 0.01, 0.5) ||
    (value.rotation !== undefined && !inRange(value.rotation, -90, 90))
  )
    fail(
      code,
      "Region needs cx, cy in [0,1], rx, ry in [0.01,0.5] and rotation in [-90,90] degrees",
    );
  return {
    cx: value.cx,
    cy: value.cy,
    rx: value.rx,
    ry: value.ry,
    rotation: value.rotation ?? 0,
  };
}

// Freehand sketch: up to 24 strokes of 2-400 normalized [x, y] points (2000 points in total).
export const SKETCH_LIMITS = { strokes: 24, points: 400, total: 2000 };
export function validateSketch(value, code = "INVALID_JOB") {
  if (value === undefined) return null;
  if (!Array.isArray(value) || !value.length || value.length > SKETCH_LIMITS.strokes)
    fail(code, `sketch must contain 1 to ${SKETCH_LIMITS.strokes} strokes`);
  let total = 0;
  const strokes = value.map((stroke) => {
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length > SKETCH_LIMITS.points)
      fail(code, `Each sketch stroke needs 2 to ${SKETCH_LIMITS.points} points`);
    total += stroke.length;
    return stroke.map((pt) => {
      if (!Array.isArray(pt) || pt.length !== 2 || !inRange(pt[0], 0, 1) || !inRange(pt[1], 0, 1))
        fail(code, "Sketch points must be [x, y] pairs in [0, 1]");
      return [Math.round(pt[0] * 1e4) / 1e4, Math.round(pt[1] * 1e4) / 1e4];
    });
  });
  if (total > SKETCH_LIMITS.total) fail(code, `A sketch may contain at most ${SKETCH_LIMITS.total} points`);
  return strokes;
}

export function validateRegionEditOptions(options = {}, project) {
  const code = "INVALID_JOB";
  keys(options, ["baseAssetId", "regions"], code);
  if (!id(options.baseAssetId)) fail(code, "region_edit requires a baseAssetId");
  approvedAsset(project, options.baseAssetId, REGION_EDIT_BASE_KINDS);
  if (
    !Array.isArray(options.regions) ||
    !options.regions.length ||
    options.regions.length > 8
  )
    fail(code, "region_edit requires one to eight regions");
  const seen = new Set(),
    unique = new Set([options.baseAssetId]);
  const regions = options.regions.map((r) => {
    keys(
      r,
      ["id", "cx", "cy", "rx", "ry", "rotation", "comment", "referenceAssetIds", "sketch"],
      code,
    );
    if (!id(r.id) || seen.has(r.id)) fail(code, "Unique region IDs required");
    seen.add(r.id);
    const geometry = validateEllipse(r, code);
    const comment = text(r.comment, 500, code);
    if (!comment) fail(code, "Each region needs a comment of 1 to 500 characters");
    const refs = array(r.referenceAssetIds ?? [], 3, code);
    if (refs.some((x) => !id(x)) || new Set(refs).size !== refs.length)
      fail(code, "Region references must be distinct asset IDs");
    for (const assetId of refs) {
      approvedAsset(project, assetId, REGION_REFERENCE_KINDS);
      unique.add(assetId);
    }
    const sketch = validateSketch(r.sketch, code);
    return { id: r.id, ...geometry, comment, referenceAssetIds: [...refs], ...(sketch ? { sketch } : {}) };
  });
  // Base + region map + distinct region references must fit the 13-image budget.
  if (unique.size + 1 > 13)
    fail(
      "REFERENCE_LIMIT",
      "Base image, region map and region references exceed the 13-reference budget; remove references or split the edit",
    );
  return { baseAssetId: options.baseAssetId, regions };
}
