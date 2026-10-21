// Freehand sketch helpers shared by the Decor step and the Design canvas.
// Strokes are arrays of normalized [x, y] image points; the server draws them on the region map.
import { clamp } from "./dom.js";

export const SKETCH_MAX_STROKES = 24;
export const SKETCH_MAX_POINTS = 400;
export const SKETCH_MAX_TOTAL = 2000;
export const SKETCH_COMMENT = "Build what the sketch shows here, following its shape, footprint and perspective, matching the scene's style, scale and lighting.";

// Drops points closer than `minStep` (normalized) and caps the stroke length.
export function simplifyStroke(points, minStep = 0.004) {
  const out = [];
  for (const [x, y] of points) {
    const p = [Math.round(clamp(x, 0, 1) * 1e4) / 1e4, Math.round(clamp(y, 0, 1) * 1e4) / 1e4];
    const last = out.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minStep) out.push(p);
  }
  const lastIn = points.at(-1);
  if (out.length === 1 && lastIn) out.push([clamp(lastIn[0], 0, 1), clamp(lastIn[1], 0, 1)]);
  if (out.length <= SKETCH_MAX_POINTS) return out;
  const step = out.length / SKETCH_MAX_POINTS;
  return Array.from({ length: SKETCH_MAX_POINTS }, (_, i) => out[Math.min(out.length - 1, Math.floor(i * step))]);
}

export const sketchPoints = (strokes) => (strokes || []).reduce((n, s) => n + s.length, 0);

// The edit region: an ellipse that encloses the sketch's bounding box (sqrt 2 plus a margin).
export function sketchBounds(strokes) {
  const pts = (strokes || []).flat();
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const rx = clamp(((x1 - x0) / 2) * 1.5 + 0.02, 0.03, 0.5);
  const ry = clamp(((y1 - y0) / 2) * 1.5 + 0.02, 0.03, 0.5);
  return { cx: clamp((x0 + x1) / 2, 0, 1), cy: clamp((y0 + y1) / 2, 0, 1), rx, ry };
}

// SVG path data for a stroke, given a mapper from normalized to screen/element coordinates.
export function strokePath(stroke, map) {
  return stroke
    .map((p, i) => {
      const [x, y] = map(p[0], p[1]);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
