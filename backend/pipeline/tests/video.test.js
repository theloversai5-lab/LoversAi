import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { createVideo } from "./video-fixture.js";
import { normalizeFlowVideo } from "../video.js";

test("returned MP4 is actually decoded, sanitized and sampled into a real contact sheet", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-video-test-"));
  try {
    const input = await createVideo(root),
      result = await normalizeFlowVideo(input);
    assert.ok(result.buffer.length > 1000);
    assert.equal(result.metadata.codec, "h264");
    assert.equal(result.metadata.fps, 30);
    assert.ok(Math.abs(result.metadata.durationSeconds - 2.4) < 0.1);
    assert.notEqual(result.inputHash, result.hash);
    const thumbnail = await sharp(result.contactSheet).metadata();
    assert.equal(thumbnail.format, "jpeg");
    assert.equal(thumbnail.width, 1536);
    assert.equal(thumbnail.height, 512);
    const output = path.join(root, "output.mp4");
    await writeFile(output, result.buffer);
    const actual = JSON.parse(
      execFileSync(
        "ffprobe",
        ["-v", "error", "-show_streams", "-show_format", "-of", "json", output],
        { encoding: "utf8", timeout: 10000 },
      ),
    );
    assert.equal(
      actual.streams.filter((s) => s.codec_type === "audio").length,
      0,
    );
    assert.equal(actual.format.tags?.title, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("spoofed MP4, oversized upload, short video and missing media runtime fail explicitly", async () => {
  await assert.rejects(normalizeFlowVideo(Buffer.from("not an MP4")), {
    code: "INVALID_VIDEO",
  });
  await assert.rejects(normalizeFlowVideo(Buffer.alloc(24 * 1024 * 1024 + 1)), {
    code: "VIDEO_SIZE",
  });
  const root = await mkdtemp(path.join(tmpdir(), "wedding-video-reject-"));
  try {
    const input = await createVideo(root, 0.5);
    await assert.rejects(normalizeFlowVideo(input), { code: "INVALID_VIDEO" });
    await assert.rejects(
      normalizeFlowVideo(input, {
        ffprobe: path.join(root, "missing-ffprobe"),
      }),
      { code: "VIDEO_TOOL_UNAVAILABLE" },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("only two video sanitizers can consume local decoding resources concurrently", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-video-busy-"));
  try {
    const input = await createVideo(root);
    const results = await Promise.allSettled([
      normalizeFlowVideo(input),
      normalizeFlowVideo(input),
      normalizeFlowVideo(input),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
    assert.equal(results[2].reason.code, "VIDEO_BUSY");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fragmented H264 MP4 with no declared frame count is decoded and counted in fresh output", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-video-fragmented-"));
  try {
    const input = await createVideo(root, 2.4, { fragmented: true });
    const result = await normalizeFlowVideo(input);
    assert.equal(result.metadata.source.frameCount, null);
    assert.ok(Number.isInteger(result.metadata.frameCount));
    assert.ok(result.metadata.frameCount >= 60);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("valid wide source retains its aspect ratio even when sanitized height is below source minimum", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-video-wide-"));
  try {
    const input = await createVideo(root, 2.4, { size: "4096x256" });
    const result = await normalizeFlowVideo(input);
    assert.equal(result.metadata.source.width, 4096);
    assert.equal(result.metadata.source.height, 256);
    assert.equal(result.metadata.width, 1920);
    assert.equal(result.metadata.height, 120);
    assert.equal((await sharp(result.contactSheet).metadata()).width, 1536);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
