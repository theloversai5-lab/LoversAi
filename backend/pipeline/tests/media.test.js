import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { normalizeImage, renderCanvas, AssetStore } from "../media.js";

test("private storage rejects the application's publicly served upload root", () => {
  const exposed = new URL("../../uploads/wedding", import.meta.url);
  assert.throws(
    () => new AssetStore(exposed.pathname.replace(/^\/([A-Za-z]:)/, "$1")),
    { code: "UNSAFE_STORAGE_ROOT" },
  );
});
test("rejects spoofed and undersized image bytes", async () => {
  await assert.rejects(
    normalizeImage(Buffer.from("<svg>not a photograph</svg>")),
    { code: "INVALID_IMAGE" },
  );
  const tiny = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(normalizeImage(tiny), { code: "IMAGE_TOO_SMALL" });
});
test("normalizes real PNG bytes to truthful JPEG and identical fingerprints", async () => {
  const png = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const a = await normalizeImage(png),
    b = await normalizeImage(png);
  assert.equal(a.mimeType, "image/jpeg");
  assert.equal(a.hash, b.hash);
  assert.equal((await sharp(a.buffer).metadata()).format, "jpeg");
});
test("canvas regions change actual output pixels", async () => {
  const base = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const overlay = await renderCanvas(base, {
    regions: [
      {
        id: "r",
        action: "place",
        points: [
          [0.1, 0.1],
          [0.8, 0.1],
          [0.8, 0.8],
          [0.1, 0.8],
        ],
      },
    ],
    strokes: [],
  });
  const { data, info } = await sharp(overlay)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (300 * info.width + 300) * info.channels;
  assert.ok(data[i + 1] < 250, "annotated center is tinted");
  assert.equal(data[0], 255, "outside annotation stays white");
});
test("private storage never resolves traversal IDs", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wedding-test-"));
  try {
    const store = new AssetStore(dir);
    await assert.rejects(store.read("../etc/passwd"), {
      code: "INVALID_ASSET_ID",
    });
    const saved = await store.write(Buffer.from("private"), "application/json");
    assert.equal((await store.read(saved.id)).toString(), "private");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
