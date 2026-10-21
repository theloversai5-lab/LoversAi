import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function createVideo(
  root,
  duration = 2.4,
  { size = "320x256", fragmented = false } = {},
) {
  const file = path.join(root, `input-${duration}.mp4`);
  execFileSync(
    process.env.WEDDING_PIPELINE_FFMPEG || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc2=size=${size}:rate=10`,
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=8000",
      "-t",
      String(duration),
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-metadata",
      "title=PRIVATE_SOURCE_TITLE",
      "-movflags",
      fragmented ? "frag_keyframe+empty_moov" : "+faststart",
      file,
    ],
    { windowsHide: true, timeout: 20000 },
  );
  return readFile(file);
}
