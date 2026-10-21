import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { PipelineError, fail } from "./contracts.js";
export const MAX_VIDEO_BYTES = 24 * 1024 * 1024;
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
let activeImports = 0;
const inputOptions = [
  "-max_alloc",
  "67108864",
  "-protocol_whitelist",
  "file,pipe",
  "-f",
  "mov",
  "-enable_drefs",
  "0",
  "-use_absolute_path",
  "0",
];

function runTool(executable, args, deadline) {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      return reject(
        new PipelineError(
          "VIDEO_TIMEOUT",
          "Video validation exceeded its time budget",
          504,
        ),
      );
    const child = spawn(executable, args, {
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    let size = 0,
      failure;
    const timer = setTimeout(
      () => {
        failure = new PipelineError(
          "VIDEO_TIMEOUT",
          "Video validation exceeded its time budget",
          504,
        );
        child.kill();
      },
      Math.min(30000, remaining),
    );
    child.on("error", () => {
      failure = new PipelineError(
        "VIDEO_TOOL_UNAVAILABLE",
        "Configure FFmpeg and FFprobe executable paths for Flow video imports",
        503,
      );
    });
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > 256 * 1024) {
        failure = new PipelineError(
          "INVALID_VIDEO",
          "Media probe output exceeded its limit",
          422,
        );
        child.kill();
      } else chunks.push(chunk);
    });
    child.stderr.on("data", () => {}); // Never retain paths, metadata or raw decoder diagnostics.
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0)
        reject(
          new PipelineError(
            "INVALID_VIDEO",
            "MP4 decoding failed; export a valid H.264 clip from Flow",
            422,
          ),
        );
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}
function validateProbe(value, { normalized = false } = {}) {
  const videos = value.streams?.filter((s) => s.codec_type === "video") || [];
  if (videos.length !== 1)
    fail("INVALID_VIDEO", "Exactly one H.264 video stream is required", 422);
  const video = videos[0],
    duration = Number(video.duration ?? value.format?.duration),
    containerDuration = Number(value.format?.duration);
  const [numerator, denominator] = String(video.avg_frame_rate)
    .split("/")
    .map(Number);
  const fps = numerator / denominator,
    frames =
      video.nb_frames === undefined || video.nb_frames === "N/A"
        ? null
        : Number(video.nb_frames),
    width = Number(video.width),
    height = Number(video.height);
  if (
    video.codec_name !== "h264" ||
    !Number.isFinite(duration) ||
    !Number.isFinite(containerDuration) ||
    duration < 2 ||
    duration > 30 ||
    containerDuration < 2 ||
    containerDuration > 30 ||
    !Number.isFinite(fps) ||
    fps < 1 ||
    fps > 60 ||
    (frames !== null &&
      (!Number.isSafeInteger(frames) || frames < 2 || frames > 1800)) ||
    (normalized && (frames === null || fps !== 30)) ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    Math.min(width, height) < (normalized ? 2 : 256) ||
    (normalized
      ? width > 1920 || height > 1080 || width % 2 !== 0 || height % 2 !== 0
      : Math.max(width, height) > 4096) ||
    width * height > 8_400_000
  )
    fail(
      "INVALID_VIDEO",
      normalized
        ? "Decoded MP4 failed output size, frame count or frame rate validation"
        : "Use a 2–30 second H.264 MP4, 256–4096 pixels per side (at most 8.4 MP), 1–60 fps",
      422,
    );
  return {
    durationSeconds: duration,
    width,
    height,
    fps,
    frameCount: frames,
    codec: "h264",
  };
}

export async function normalizeFlowVideo(
  buffer,
  {
    ffmpeg = process.env.WEDDING_PIPELINE_FFMPEG || "ffmpeg",
    ffprobe = process.env.WEDDING_PIPELINE_FFPROBE || "ffprobe",
  } = {},
) {
  if (
    !Buffer.isBuffer(buffer) ||
    !buffer.length ||
    buffer.length > MAX_VIDEO_BYTES
  )
    fail("VIDEO_SIZE", "MP4 upload must be at most 24 MiB");
  if (buffer.length < 12 || buffer.toString("ascii", 4, 8) !== "ftyp")
    fail("INVALID_VIDEO", "Only actual MP4 containers are accepted", 422);
  if (activeImports >= 2)
    fail(
      "VIDEO_BUSY",
      "Two video imports are already decoding; retry after they finish",
      429,
    );
  activeImports++;
  let root;
  const deadline = Date.now() + 90000;
  try {
    root = await mkdtemp(path.join(tmpdir(), "wedding-flow-video-"));
    const input = path.join(root, "input.mp4"),
      output = path.join(root, "clean.mp4");
    await writeFile(input, buffer, { mode: 0o600 });
    const probe = async (file, normalized = false) => {
      const text = await runTool(
        ffprobe,
        [
          "-v",
          "error",
          "-probesize",
          "5242880",
          "-analyzeduration",
          "5000000",
          ...inputOptions,
          "-show_entries",
          "format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate,duration,nb_frames",
          "-of",
          "json",
          file,
        ],
        deadline,
      );
      try {
        return validateProbe(JSON.parse(text), { normalized });
      } catch (error) {
        if (error.status) throw error;
        fail("INVALID_VIDEO", "Media metadata could not be validated", 422);
      }
    };
    const source = await probe(input);
    await runTool(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-xerror",
        "-err_detect",
        "explode",
        ...inputOptions,
        "-i",
        input,
        "-map",
        "0:v:0",
        "-an",
        "-sn",
        "-dn",
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-vf",
        "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-threads",
        "2",
        "-t",
        "31",
        "-fs",
        String(MAX_VIDEO_BYTES),
        "-movflags",
        "+faststart",
        output,
      ],
      deadline,
    );
    const clean = await readFile(output);
    if (clean.length > MAX_VIDEO_BYTES - 65536)
      fail(
        "VIDEO_SIZE",
        "Sanitized MP4 reached its byte cap; use a smaller Flow export",
        422,
      );
    const metadata = await probe(output, true);
    if (Math.abs(metadata.durationSeconds - source.durationSeconds) > 0.2)
      fail(
        "INVALID_VIDEO",
        "Video duration changed during decoding; re-export the original clip",
        422,
      );
    const times = [
        0,
        metadata.durationSeconds / 2,
        Math.max(0, metadata.durationSeconds - 0.1),
      ],
      frames = [];
    for (let i = 0; i < times.length; i++) {
      const file = path.join(root, `frame-${i}.jpg`);
      await runTool(
        ffmpeg,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-nostdin",
          "-y",
          ...inputOptions,
          "-ss",
          String(times[i]),
          "-i",
          output,
          "-frames:v",
          "1",
          "-vf",
          "scale=512:512:force_original_aspect_ratio=decrease",
          "-an",
          "-sn",
          "-dn",
          "-q:v",
          "3",
          file,
        ],
        deadline,
      );
      frames.push(
        await sharp(await readFile(file))
          .resize(512, 512, { fit: "contain", background: "#161616" })
          .jpeg()
          .toBuffer(),
      );
    }
    const contactSheet = await sharp({
      create: { width: 1536, height: 512, channels: 3, background: "#161616" },
    })
      .composite(frames.map((input, i) => ({ input, left: i * 512, top: 0 })))
      .jpeg({ quality: 90 })
      .toBuffer();
    return {
      buffer: clean,
      contactSheet,
      metadata: {
        ...metadata,
        source,
        audioRemoved: true,
        metadataStripped: true,
        sampleTimesSeconds: times,
      },
      hash: sha(clean),
      inputHash: sha(buffer),
    };
  } finally {
    activeImports--;
    if (root) {
      if (
        path.dirname(root) !== path.resolve(tmpdir()) ||
        !path.basename(root).startsWith("wedding-flow-video-")
      )
        throw new Error("Unexpected video temporary directory");
      await rm(root, { recursive: true, force: true });
    }
  }
}
