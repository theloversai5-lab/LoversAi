// Pure geometry + labelling helpers for the Venue Studio canvas. No DOM access: unit-testable in Node.

const TAU = Math.PI * 2;

// Resamples a polyline to n points spaced evenly along its arc length, so drawing speed does not bias the fit.
export function resample(points, n = 96) {
  const pts = (points || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (pts.length < 2) return pts.map((p) => [p[0], p[1]]);
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    total += l;
  }
  if (total <= 0) return [[pts[0][0], pts[0][1]]];
  const out = [];
  const step = total / (n - 1);
  let i = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = Math.min(total, k * step);
    while (i < seg.length - 1 && acc + seg[i] < target) acc += seg[i++];
    const f = seg[i] ? (target - acc) / seg[i] : 0;
    const a = pts[i];
    const b = pts[i + 1];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

const normDeg = (deg) => {
  let d = ((deg % 180) + 180) % 180; // ellipses are symmetric under 180 degrees
  if (d > 90) d -= 180;
  return d === -90 ? 90 : d;
};

function quantile(sorted, q) {
  if (!sorted.length) return 1;
  const pos = clamp01(q) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Fits an ellipse to a rough hand-drawn loop.
//  centre = mean of the arc-length-resampled stroke
//  axes   = eigenvectors of the 2x2 covariance (principal axis gives the rotation)
//  radii  = least-squares fit of u^2/a^2 + v^2/b^2 = 1 in the principal frame (PCA sqrt(2*lambda) fallback),
//           then scaled so that `coverage` (default 90%) of the stroke points lie inside the ellipse.
// Returns { cx, cy, rx, ry, rotation } in input units, rotation in degrees (-90, 90], rx >= ry.
// Moving-average smoothing (window 2k+1) so hand jitter does not inflate the arc length unevenly.
export function smooth(points, k = 2) {
  const pts = (points || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (pts.length < 2 * k + 2) return pts.map((p) => [p[0], p[1]]);
  return pts.map((_, i) => {
    let x = 0;
    let y = 0;
    let c = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(pts.length - 1, i + k); j++) {
      x += pts[j][0];
      y += pts[j][1];
      c++;
    }
    return [x / c, y / c];
  });
}

// A loop usually overshoots its start. Cut the stroke where it comes back closest to the start
// (searching the second half only) so the overlap does not pull the centre.
export function trimLoop(pts) {
  const n = pts.length;
  if (n < 8) return pts;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const diag = Math.hypot(x1 - x0, y1 - y0) || 1;
  let best = -1;
  let bestD = Infinity;
  for (let i = Math.floor(n * 0.6); i < n; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best > 0 && bestD < diag * 0.2 ? pts.slice(0, best + 1) : pts;
}

export function fitEllipse(points, { coverage = 0.9, minR = 2, maxAspect = 8, samples = 96 } = {}) {
  const pts = resample(trimLoop(resample(smooth(points), samples * 2)), samples);
  const n = pts.length;
  if (n < 3) return null;
  let mx = 0;
  let my = 0;
  for (const [x, y] of pts) {
    mx += x;
    my += y;
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of pts) {
    const dx = x - mx;
    const dy = y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= n;
  syy /= n;
  sxy /= n;
  const half = (sxx + syy) / 2;
  const disc = Math.sqrt(Math.max(0, ((sxx - syy) / 2) ** 2 + sxy * sxy));
  const l1 = half + disc;
  const l2 = Math.max(0, half - disc);
  if (!(l1 > 0)) return null;
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const uv = pts.map(([x, y]) => {
    const dx = x - mx;
    const dy = y - my;
    return [dx * c + dy * s, -dx * s + dy * c];
  });
  // Least squares for A = 1/a^2, B = 1/b^2.
  let s40 = 0;
  let s04 = 0;
  let s22 = 0;
  let s20 = 0;
  let s02 = 0;
  for (const [u, v] of uv) {
    const u2 = u * u;
    const v2 = v * v;
    s40 += u2 * u2;
    s04 += v2 * v2;
    s22 += u2 * v2;
    s20 += u2;
    s02 += v2;
  }
  const det = s40 * s04 - s22 * s22;
  let a;
  let b;
  if (Math.abs(det) > 1e-12) {
    const A = (s20 * s04 - s02 * s22) / det;
    const B = (s02 * s40 - s20 * s22) / det;
    if (A > 0 && B > 0) {
      a = 1 / Math.sqrt(A);
      b = 1 / Math.sqrt(B);
    }
  }
  if (!(a > 0 && b > 0) || !Number.isFinite(a) || !Number.isFinite(b)) {
    a = Math.sqrt(2 * l1);
    b = Math.sqrt(2 * Math.max(l2, l1 * 1e-4));
  }
  let rot = theta;
  if (b > a) {
    [a, b] = [b, a];
    rot += Math.PI / 2;
  }
  b = Math.max(b, a / maxAspect);
  const cr = Math.cos(rot - theta);
  const sr = Math.sin(rot - theta);
  // Coverage is measured on the user's own (unsmoothed, evenly resampled) stroke points.
  const raw = resample(points, samples);
  const radial = (raw.length >= 3 ? raw : pts)
    .map(([x, y]) => {
      const dx = x - mx;
      const dy = y - my;
      const u = dx * c + dy * s;
      const v = -dx * s + dy * c;
      const uu = u * cr + v * sr;
      const vv = -u * sr + v * cr;
      return Math.hypot(uu / a, vv / b);
    })
    .sort((p, q) => p - q);
  const scale = quantile(radial, coverage);
  a = Math.max(minR, a * scale);
  b = Math.max(minR, b * scale);
  if (b > a) [a, b] = [b, a];
  return { cx: mx, cy: my, rx: a, ry: b, rotation: normDeg((rot * 180) / Math.PI) };
}

export function ellipsePoint(e, t) {
  const r = (e.rotation * Math.PI) / 180;
  const x = e.rx * Math.cos(t);
  const y = e.ry * Math.sin(t);
  return [e.cx + x * Math.cos(r) - y * Math.sin(r), e.cy + x * Math.sin(r) + y * Math.cos(r)];
}

export function ellipsePolyline(e, n = 64) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(ellipsePoint(e, (i / n) * TAU));
  return out;
}

// For each stroke point, the point of the fitted ellipse at the same polar angle (morph target).
export function morphTargets(points, e) {
  const r = (e.rotation * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return points.map(([x, y]) => {
    const dx = x - e.cx;
    const dy = y - e.cy;
    const u = dx * c + dy * s;
    const v = -dx * s + dy * c;
    return ellipsePoint(e, Math.atan2(v / (e.ry || 1), u / (e.rx || 1)));
  });
}

// Point-in-ellipse test with an optional padding (same units as the ellipse).
export function hitEllipse(e, x, y, pad = 0) {
  const r = (e.rotation * Math.PI) / 180;
  const dx = x - e.cx;
  const dy = y - e.cy;
  const u = dx * Math.cos(r) + dy * Math.sin(r);
  const v = -dx * Math.sin(r) + dy * Math.cos(r);
  const a = e.rx + pad;
  const b = e.ry + pad;
  return (u * u) / (a * a) + (v * v) / (b * b) <= 1;
}

// Axis-aligned bounding box of a rotated ellipse.
export function ellipseBox(e) {
  const r = (e.rotation * Math.PI) / 180;
  const hw = Math.sqrt((e.rx * Math.cos(r)) ** 2 + (e.ry * Math.sin(r)) ** 2);
  const hh = Math.sqrt((e.rx * Math.sin(r)) ** 2 + (e.ry * Math.cos(r)) ** 2);
  return { x0: e.cx - hw, y0: e.cy - hh, x1: e.cx + hw, y1: e.cy + hh };
}

// Normalized convention used for the server contract (region_edit / suggest):
//   cx = cx_px / W, cy = cy_px / H, rx = rx_px / W, ry = ry_px / H, rotation in degrees, measured in pixel
//   space, clockwise (image y axis points down). rx is the semi-axis along the rotated x axis.
const r5 = (v) => Math.round(v * 100000) / 100000;
export function toNorm(e, W, H) {
  return {
    cx: r5(clamp01(e.cx / W)),
    cy: r5(clamp01(e.cy / H)),
    // Server contract (contracts.validateEllipse): rx, ry in [0.01, 0.5], rotation in [-90, 90].
    rx: r5(Math.min(0.5, Math.max(0.01, e.rx / W))),
    ry: r5(Math.min(0.5, Math.max(0.01, e.ry / H))),
    rotation: Math.round(normDeg(e.rotation) * 10) / 10,
  };
}
export function fromNorm(n, W, H) {
  return { cx: n.cx * W, cy: n.cy * H, rx: n.rx * W, ry: n.ry * H, rotation: n.rotation || 0 };
}

/* ---------------- Camera angle labels (element_view) ---------------- */

export const AZIMUTHS = [0, 45, 90, 135, 180, 225, 270, 315];
export const ELEVATIONS = [-30, 0, 30, 60, 90];
export const ZOOMS = [
  { value: 2, label: "wide" },
  { value: 5, label: "medium" },
  { value: 8, label: "close-up" },
];
const AZ_NAME = {
  0: "front",
  45: "front-right quarter",
  90: "right side",
  135: "back-right quarter",
  180: "back",
  225: "back-left quarter",
  270: "left side",
  315: "front-left quarter",
};
const EL_NAME = { "-30": "low angle", 0: "eye level", 30: "elevated", 60: "high angle", 90: "top-down" };

export const snapAzimuth = (deg) => {
  const d = ((Math.round(Number(deg) / 45) * 45) % 360 + 360) % 360;
  return Number.isFinite(d) ? d : 0;
};
export const snapElevation = (deg) =>
  ELEVATIONS.reduce((best, v) => (Math.abs(v - deg) < Math.abs(best - deg) ? v : best), ELEVATIONS[1]);
export const zoomLabel = (z) => (z <= 3 ? "wide" : z <= 6 ? "medium" : "close-up");
export function angleLabel(az, el, zoom) {
  const a = snapAzimuth(az);
  const e = snapElevation(el);
  return `${e === 90 ? "top-down" : AZ_NAME[a]}${e === 90 ? "" : ` · ${EL_NAME[e]}`} · ${zoomLabel(zoom)}`;
}
export const ANGLE_PRESETS = [
  { id: "front", label: "Front", azimuth: 0, elevation: 0, zoom: 5 },
  { id: "q-left", label: "3/4 left", azimuth: 315, elevation: 30, zoom: 5 },
  { id: "q-right", label: "3/4 right", azimuth: 45, elevation: 30, zoom: 5 },
  { id: "side", label: "Side", azimuth: 90, elevation: 0, zoom: 5 },
  { id: "top", label: "Top-down", azimuth: 0, elevation: 90, zoom: 2 },
  { id: "hero", label: "Low hero", azimuth: 0, elevation: -30, zoom: 2 },
];

/* ---------------- Local suggestion fallback ---------------- */

const IDEAS = {
  entry: [
    { label: "Entrance arch", prompt: "A grand floral entrance arch that frames the arrival path" },
    { label: "Welcome signage", prompt: "An elegant welcome sign with the couple's monogram and soft florals" },
    { label: "Petal aisle", prompt: "A petal-lined arrival aisle with lanterns on both sides" },
  ],
  stage: [
    { label: "Stage", prompt: "A raised stage with a layered floral backdrop and warm uplighting" },
    { label: "Mandap", prompt: "A four-pillar mandap with draped fabric canopy and floral strands" },
    { label: "Floral backdrop", prompt: "A tall floral wall backdrop behind the main focal point" },
  ],
  dining: [
    { label: "Seating", prompt: "Rows of guest seating facing the stage with aisle markers" },
    { label: "Dining tables", prompt: "Long dining tables with low floral runners and candles" },
  ],
  dance_floor: [{ label: "Dance floor", prompt: "A glossy dance floor framed by festoon lighting" }],
  lounge: [
    { label: "Lounge", prompt: "A cosy lounge of low sofas, cushions and side tables on a rug" },
    { label: "Fire-pit lounge", prompt: "An outdoor lounge circle around a lantern-lit centrepiece" },
  ],
  photo_booth: [
    { label: "Photo booth", prompt: "A photo booth with a flower wall and a neon script sign" },
    { label: "Swing frame", prompt: "A floral swing frame set up as a photo spot" },
  ],
  bar: [{ label: "Bar", prompt: "A styled bar counter with a floral canopy and pendant lights" }],
  mandap: [{ label: "Mandap", prompt: "A four-pillar mandap with draped fabric canopy and floral strands" }],
};
const tag = (type, i) => ({ ...IDEAS[type][i % IDEAS[type].length], elementType: type === "mandap" ? "mandap" : type });

// Position heuristics on a normalized region: bottom edge -> arrival, top centre -> stage,
// open centre -> stage / seating / dance floor, corners -> lounge / photo booth, sides -> bar / lounge.
export function fallbackSuggestions(region, elementHint) {
  const { cx = 0.5, cy = 0.5 } = region || {};
  const corner = (cx < 0.3 || cx > 0.7) && (cy < 0.35 || cy > 0.65);
  const side = cx < 0.28 || cx > 0.72;
  let list;
  if (cy > 0.72 && !corner) list = [tag("entry", 0), tag("entry", 1), tag("entry", 2), tag("photo_booth", 0)];
  else if (cy < 0.38 && Math.abs(cx - 0.5) < 0.22) list = [tag("stage", 0), tag("mandap", 0), tag("stage", 2), tag("dining", 0)];
  else if (corner) list = [tag("lounge", 0), tag("photo_booth", 0), tag("photo_booth", 1), tag("bar", 0)];
  else if (side) list = [tag("bar", 0), tag("lounge", 0), tag("dining", 1), tag("photo_booth", 0)];
  else list = [tag("stage", 0), tag("dining", 0), tag("dance_floor", 0), tag("dining", 1)];
  list.push(tag("lounge", 1));
  if (elementHint && IDEAS[elementHint]) list.unshift(tag(elementHint, 0));
  const seen = new Set();
  return list.filter((x) => (seen.has(x.label) ? false : seen.add(x.label))).slice(0, 6);
}
