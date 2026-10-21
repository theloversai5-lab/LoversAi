import sharp from "sharp";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fail } from "./contracts.js";

export const DEFAULT_DATA_DIR = fileURLToPath(
  new URL("../.pipeline-data/", import.meta.url),
);
// Production minimum is 512px. WEDDING_PIPELINE_MIN_IMAGE_SIDE may lower it (floor 256) for thumbnail demos.
export function minImageSide(env = process.env) {
  const value = Number(env.WEDDING_PIPELINE_MIN_IMAGE_SIDE);
  return Number.isSafeInteger(value) && value >= 256 && value <= 512 ? value : 512;
}
export async function normalizeImage(
  buffer,
  { maxBytes = 10 * 1024 * 1024 } = {},
) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > maxBytes)
    fail("INVALID_IMAGE", "Image byte limit exceeded or empty image");
  try {
    const meta = await sharp(buffer, {
      limitInputPixels: 40_000_000,
      animated: false,
    }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format) ||
      (meta.pages || 1) !== 1
    )
      fail(
        "INVALID_IMAGE",
        "Only single-frame JPEG, PNG or WebP images are supported",
      );
    const minSide = minImageSide();
    if (Math.min(meta.width || 0, meta.height || 0) < minSide)
      fail("IMAGE_TOO_SMALL", `Minimum image size is ${minSide} by ${minSide}`);
    const { data, info } = await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({
        width: 4096,
        height: 4096,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92 })
      .toBuffer({ resolveWithObject: true });
    const stats = await sharp(data).stats();
    return {
      buffer: data,
      width: info.width,
      height: info.height,
      mimeType: "image/jpeg",
      hash: createHash("sha256").update(data).digest("hex"),
      qualityFlags: stats.channels.every((c) => c.stdev < 3)
        ? ["low_detail"]
        : [],
    };
  } catch (e) {
    if (e.code && e.status) throw e;
    fail("INVALID_IMAGE", "Image could not be safely decoded");
  }
}
const colors = {
  place: "#e53935",
  remove: "#9c27b0",
  recolor: "#ff9800",
  keep_clear: "#00a080",
};
export async function renderCanvas(base, canvas) {
  const { width, height } = await sharp(base).metadata();
  const shapes = [
    ...(canvas.regions || []).map(
      (r) =>
        `<polygon points="${r.points.map((p) => `${p[0] * width},${p[1] * height}`).join(" ")}" fill="${colors[r.action]}" fill-opacity="0.22" stroke="${colors[r.action]}" stroke-width="4"/>`,
    ),
    ...(canvas.strokes || []).map(
      (r) =>
        `<polyline points="${r.points.map((p) => `${p[0] * width},${p[1] * height}`).join(" ")}" fill="none" stroke="${colors[r.action]}" stroke-width="6" stroke-linecap="round"/>`,
    ),
  ];
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes.join("")}</svg>`,
  );
  return sharp(base)
    .composite([{ input: svg }])
    .png()
    .toBuffer();
}
// Numbered ellipse instruction map for region_edit and suggestions. Regions use
// normalized centre/radii (rx of width, ry of height); rotation is applied in pixel space.
export async function renderRegionMap(base, regions) {
  const { width, height } = await sharp(base).metadata();
  const side = Math.min(width, height);
  const stroke = Math.max(2, Math.round(side * 0.006));
  const edge = Math.max(1, Math.round(stroke / 3));
  const label = Math.max(10, Math.round(side * 0.022));
  const n = (v) => Math.round(v * 100) / 100;
  const shapes = regions.map((r, i) => {
    const cx = r.cx * width,
      cy = r.cy * height,
      rx = r.rx * width,
      ry = r.ry * height,
      rotation = r.rotation || 0,
      rad = (rotation * Math.PI) / 180;
    // Top of the rotated ellipse; the label stays upright and inside the frame.
    const lx = Math.min(width - label, Math.max(label, cx + ry * Math.sin(rad)));
    const ly = Math.min(height - label, Math.max(label, cy - ry * Math.cos(rad)));
    // Sketch strokes: bold blue lines with a white halo, so the model reads the drawn shape.
    const sketch = (r.sketch || [])
      .map((s) => {
        const d = s.map(([x, y], j) => `${j ? "L" : "M"}${n(x * width)} ${n(y * height)}`).join(" ");
        return (
          `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${stroke * 2.2}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.85"/>` +
          `<path d="${d}" fill="none" stroke="#1F6BFF" stroke-width="${stroke * 1.2}" stroke-linecap="round" stroke-linejoin="round"/>`
        );
      })
      .join("");
    return (
      sketch +
      `<g transform="rotate(${n(rotation)} ${n(cx)} ${n(cy)})">` +
      `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx + stroke / 2 + edge / 2)}" ry="${n(ry + stroke / 2 + edge / 2)}" fill="none" stroke="#E3173F" stroke-width="${edge}"/>` +
      `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="#EC6FC4" fill-opacity="0.2" stroke="url(#region-stroke)" stroke-width="${stroke}"/>` +
      `</g>` +
      `<circle cx="${n(lx)}" cy="${n(ly)}" r="${label}" fill="#E3173F" stroke="#ffffff" stroke-width="${Math.max(1, Math.round(label / 6))}"/>` +
      `<text x="${n(lx)}" y="${n(ly)}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${Math.round(label * 1.1)}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`
    );
  });
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="region-stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9A36F"/><stop offset="1" stop-color="#EC6FC4"/></linearGradient></defs>${shapes.join("")}</svg>`,
  );
  return sharp(base)
    .composite([{ input: svg }])
    .png()
    .toBuffer();
}
export class AssetStore {
  constructor(
    root = process.env.WEDDING_PIPELINE_DATA_DIR || DEFAULT_DATA_DIR,
  ) {
    this.root = path.resolve(root);
    for (const relative of [
      "../uploads/",
      "../public/",
      "../../frontend/public/",
    ]) {
      const publicRoot = fileURLToPath(new URL(relative, import.meta.url));
      const inside = path.relative(publicRoot, this.root);
      if (
        inside === "" ||
        (!inside.startsWith(`..${path.sep}`) &&
          inside !== ".." &&
          !path.isAbsolute(inside))
      )
        fail(
          "UNSAFE_STORAGE_ROOT",
          "Pipeline assets must be stored outside public/static directories",
          503,
        );
    }
  }
  filename(assetId) {
    if (typeof assetId !== "string" || !/^[a-f0-9-]{36}$/.test(assetId))
      fail("INVALID_ASSET_ID", "Invalid private asset identifier");
    return path.join(this.root, assetId);
  }
  async write(buffer, mimeType) {
    if (!Buffer.isBuffer(buffer) || buffer.length > 24 * 1024 * 1024)
      fail("ASSET_SIZE", "Output exceeds private asset limit");
    await mkdir(this.root, { recursive: true });
    const id = randomUUID();
    await writeFile(this.filename(id), buffer, { flag: "wx", mode: 0o600 });
    return { id, mimeType, bytes: buffer.length };
  }
  async read(id) {
    return readFile(this.filename(id));
  }
  async remove(id) {
    await unlink(this.filename(id)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}

// SVG ellipses for edit regions (rx/ry are fractions of width/height; rotation in pixel space).
function regionEllipses(regions, width, height, scale, fill) {
  return regions
    .map((r) => {
      const cx = r.cx * width, cy = r.cy * height;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${r.rx * width * scale}" ry="${r.ry * height * scale}" transform="rotate(${r.rotation || 0} ${cx} ${cy})" fill="${fill}"/>`;
    })
    .join("");
}

// OpenAI edit mask: same size as the base, transparent (editable) inside the regions, opaque elsewhere.
export async function regionEditMask(base, regions, { scale = 1.35 } = {}) {
  const { width, height } = await sharp(base).metadata();
  const holes = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${regionEllipses(regions, width, height, scale, "#fff")}</svg>`,
  );
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite([{ input: holes, blend: "dest-out" }])
    .png()
    .toBuffer();
}

// Keeps the base pixel-identical outside the edit regions: the generated image is resized to the
// base, then blended in only inside slightly enlarged, feathered ellipses.
// Blends an AI edit back onto the base. Kept: the marked regions themselves, plus anything the AI
// actually changed within a wider zone around them (so an object that grows past the mark is not cut
// off by a hard edge). Untouched pixels and everything outside the zone stay exactly the base.
export async function compositeRegions(base, generated, regions, { scale = 1.5, zone = 2.4, threshold = 30 } = {}) {
  const { width, height } = await sharp(base).metadata();
  const n = width * height;
  const sigma = Math.max(2, Math.round(Math.min(width, height) * 0.01));
  const ellipseMask = async (list, k) => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000"/>${regionEllipses(list, width, height, k, "#fff")}</svg>`,
    );
    return sharp(svg).flatten({ background: "#000" }).extractChannel(0).raw().toBuffer();
  };
  // The zone reaches past the mark by 10% of the image plus a share of the mark's size, capped at 25%.
  const grow = (v) => v + Math.min(0.25, v * (zone - 1) + 0.1);
  const zoneRegions = regions.map((r) => ({ ...r, rx: Math.min(0.95, grow(r.rx)), ry: Math.min(0.95, grow(r.ry)) }));
  const [core, wide] = await Promise.all([ellipseMask(regions, scale), ellipseMask(zoneRegions, 1)]);
  // Two steps: sharp applies joinChannel before resize within one pipeline.
  const resized = await sharp(generated).resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer();
  // Compare softened copies so re-rendered texture noise does not count as a change.
  const soft = (buf) => sharp(buf, { raw: { width, height, channels: 3 } }).blur(1.6).raw().toBuffer();
  const baseRaw = await sharp(base).removeAlpha().raw().toBuffer();
  const [a, b] = await Promise.all([soft(baseRaw), soft(resized)]);
  const keep = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    if (core[i] > 127) keep[i] = 255;
    else if (wide[i] > 127) {
      const d = Math.max(Math.abs(a[i * 3] - b[i * 3]), Math.abs(a[i * 3 + 1] - b[i * 3 + 1]), Math.abs(a[i * 3 + 2] - b[i * 3 + 2]));
      if (d > threshold) keep[i] = 255;
    }
  }
  // Close small holes and speckle, then feather the edge.
  const mask = await sharp(keep, { raw: { width, height, channels: 1 } })
    .blur(Math.max(1.5, sigma / 2))
    .threshold(60)
    .blur(sigma)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const overlay = await sharp(resized, { raw: { width, height, channels: 3 } })
    .joinChannel(mask, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
  return sharp(base).removeAlpha().composite([{ input: overlay }]).jpeg({ quality: 92 }).toBuffer();
}

// ---------------- Decor placement ----------------

// Cuts an object out of a flat chroma-key background (the "placed" component view). The key colour is
// read from the image border, so a near-green background still works. Only background connected to
// the border is removed, so green inside the object (leaves) survives. Returns a trimmed RGBA PNG.
export async function chromaCutout(buffer) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const border = [];
  for (let x = 0; x < w; x += 4) border.push(px(x), px((h - 1) * w + x));
  for (let y = 0; y < h; y += 4) border.push(px(y * w), px(y * w + w - 1));
  const med = (k) => border.map((c) => c[k]).sort((a, b) => a - b)[border.length >> 1];
  const key = [med(0), med(1), med(2)];
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = px(i);
    dist[i] = Math.hypot(r - key[0], g - key[1], b - key[2]);
  }
  const HARD = 70, SOFT = 120;
  // Flood fill from the border through background-like pixels.
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => {
    if (!bg[i] && dist[i] < SOFT) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) push(x), push((h - 1) * w + x);
  for (let y = 0; y < h; y++) push(y * w), push(y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  const out = Buffer.alloc(w * h * 4);
  let solid = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    let [r, g, b] = px(i);
    let a = 255;
    if (bg[i]) a = dist[i] <= HARD ? 0 : Math.round(((dist[i] - HARD) / (SOFT - HARD)) * 255);
    // Despill: pull the key's dominant channel back toward the others on edge pixels.
    if (a < 255 || bg[i]) {
      const kc = key.indexOf(Math.max(...key));
      const v = [r, g, b];
      const others = [0, 1, 2].filter((k) => k !== kc).map((k) => v[k]);
      v[kc] = Math.min(v[kc], Math.max(...others));
      [r, g, b] = v;
    }
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
    if (a > 24) {
      solid++;
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const share = solid / (w * h);
  if (share < 0.02 || share > 0.97)
    fail("CUTOUT_FAILED", "Could not separate the decor from its background; render the placement view again", 422);
  const pad = 2;
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad);
  const cw = Math.min(w, x1 + pad + 1) - left, ch = Math.min(h, y1 + pad + 1) - top;
  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .png()
    .toBuffer();
}

// Pastes a cut-out onto the base at a normalized box (x, y = top-left; w = width as a fraction of the
// base width; the height follows the cut-out's aspect ratio). flip mirrors it horizontally.
export async function pasteCutout(base, cutout, { x, y, w, flip = false }) {
  const { width: W, height: H } = await sharp(base).metadata();
  const meta = await sharp(cutout).metadata();
  const pw = Math.max(4, Math.round(w * W));
  const ph = Math.max(4, Math.round((pw * meta.height) / meta.width));
  let piece = sharp(cutout).resize(pw, ph);
  if (flip) piece = piece.flop();
  piece = await piece.png().toBuffer();
  // Clip to the canvas: sharp needs the overlay inside the base.
  const left = Math.round(x * W), top = Math.round(y * H);
  const cl = Math.max(0, -left), ct = Math.max(0, -top);
  const cw = Math.min(pw - cl, W - Math.max(0, left)), ch = Math.min(ph - ct, H - Math.max(0, top));
  if (cw <= 0 || ch <= 0) fail("INVALID_JOB", "The placed decor is outside the image", 400);
  const visible = await sharp(piece).extract({ left: cl, top: ct, width: cw, height: ch }).png().toBuffer();
  return sharp(base)
    .composite([{ input: visible, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}
