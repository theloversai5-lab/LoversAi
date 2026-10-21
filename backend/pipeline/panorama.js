import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PipelineError, fail } from "./contracts.js";
import sharp from "sharp";

function captureDiagnostics(value, count) {
  if (value == null) return null;
  const integer = (x, min, max) =>
    Number.isSafeInteger(x) && x >= min && x <= max;
  const finite = (x, min, max) => Number.isFinite(x) && x >= min && x <= max;
  if (
    !Array.isArray(value.inputs) ||
    value.inputs.length !== count ||
    !Array.isArray(value.overlap?.featureCounts) ||
    value.overlap.featureCounts.length !== count ||
    value.overlap.featureCounts.some((n) => !integer(n, 0, 100000)) ||
    typeof value.overlap.connected !== "boolean" ||
    !Array.isArray(value.overlap.pairs) ||
    value.overlap.pairs.length > 10 ||
    !Array.isArray(value.alignmentAttempts) ||
    value.alignmentAttempts.length > 2
  )
    fail(
      "STITCH_FAILED",
      "Invalid capture diagnostics from panorama worker",
      502,
    );
  const inputs = value.inputs.map((row, index) => {
    if (
      row.index !== index ||
      !integer(row.originalWidth, 512, 100000) ||
      !integer(row.originalHeight, 512, 100000) ||
      !integer(row.processingWidth, 1, 1600) ||
      !integer(row.processingHeight, 1, 1600) ||
      !finite(row.processingScale, 0.000001, 1) ||
      row.upsampled !== false ||
      !finite(row.laplacianVariance, 0, 1e9)
    )
      fail("STITCH_FAILED", "Invalid panorama source dimensions", 502);
    return {
      index,
      originalWidth: row.originalWidth,
      originalHeight: row.originalHeight,
      processingWidth: row.processingWidth,
      processingHeight: row.processingHeight,
      processingScale: row.processingScale,
      upsampled: false,
      laplacianVariance: row.laplacianVariance,
    };
  });
  const pairs = value.overlap.pairs.map((row) => {
    if (
      !integer(row.from, 0, count - 1) ||
      !integer(row.to, 0, count - 1) ||
      row.from >= row.to ||
      !integer(row.matches, 0, 100000) ||
      !integer(row.inliers, 0, row.matches) ||
      !finite(row.inlierRatio, 0, 1) ||
      typeof row.connected !== "boolean"
    )
      fail("STITCH_FAILED", "Invalid panorama overlap diagnostics", 502);
    return {
      from: row.from,
      to: row.to,
      matches: row.matches,
      inliers: row.inliers,
      inlierRatio: row.inlierRatio,
      connected: row.connected,
    };
  });
  const alignmentAttempts = value.alignmentAttempts.map((row) => {
    if (
      !["spherical_panorama_crop", "planar_mosaic"].includes(row.projection) ||
      !integer(row.estimateStatus, 0, 100) ||
      (row.composeStatus !== undefined &&
        !integer(row.composeStatus, 0, 100)) ||
      (row.usedInputIndices !== undefined &&
        (!Array.isArray(row.usedInputIndices) ||
          row.usedInputIndices.length > count ||
          row.usedInputIndices.some((i) => !integer(i, 0, count - 1))))
    )
      fail("STITCH_FAILED", "Invalid panorama alignment diagnostics", 502);
    return {
      projection: row.projection,
      estimateStatus: row.estimateStatus,
      ...(row.composeStatus !== undefined
        ? { composeStatus: row.composeStatus }
        : {}),
      ...(row.usedInputIndices
        ? { usedInputIndices: row.usedInputIndices }
        : {}),
    };
  });
  let output;
  if (value.output) {
    if (
      !integer(value.output.width, 1, 100000) ||
      !integer(value.output.height, 1, 100000) ||
      !finite(value.output.nearBlackPixelFraction, 0, 1) ||
      value.output.nearBlackIsCoverageEstimate !== false ||
      value.output.seamsRequireHumanReview !== true
    )
      fail("STITCH_FAILED", "Invalid panorama output diagnostics", 502);
    output = {
      width: value.output.width,
      height: value.output.height,
      nearBlackPixelFraction: value.output.nearBlackPixelFraction,
      nearBlackIsCoverageEstimate: false,
      seamsRequireHumanReview: true,
    };
  }
  return {
    inputs,
    overlap: {
      connected: value.overlap.connected,
      featureCounts: value.overlap.featureCounts,
      pairs,
    },
    alignmentAttempts,
    ...(output ? { output } : {}),
  };
}

export async function stitchVenue({
  buffers,
  python = process.env.WEDDING_PIPELINE_PYTHON || "python",
}) {
  if (!Array.isArray(buffers) || buffers.length < 4 || buffers.length > 5)
    fail("VENUE_VIEW_COUNT", "Four or five approved venue images are required");
  if (
    buffers.some(
      (b) => !Buffer.isBuffer(b) || !b.length || b.length > 10 * 1024 * 1024,
    )
  )
    fail(
      "INVALID_IMAGE",
      "Panorama inputs must be nonempty decoded images at most 10 MiB",
    );
  const dir = await mkdtemp(path.join(tmpdir(), "wedding-panorama-"));
  try {
    const files = [];
    for (let i = 0; i < buffers.length; i++) {
      const p = path.join(dir, `${i}.jpg`);
      await writeFile(p, buffers[i]);
      files.push(p);
    }
    const output = path.join(dir, "panorama.jpg");
    const metadata = await new Promise((resolve, reject) => {
      const child = spawn(
        python,
        [fileURLToPath(new URL("./python/stitch.py", import.meta.url))],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      let stdout = "",
        stderr = "",
        settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        error ? reject(error) : resolve(value);
      };
      const timer = setTimeout(() => {
        child.kill();
        finish(
          new PipelineError(
            "STITCH_TIMEOUT",
            "Panorama stitching timed out; use smaller, better-overlapping images",
            504,
          ),
        );
      }, 120000);
      child.on("error", () =>
        finish(
          new PipelineError(
            "STITCH_UNAVAILABLE",
            "Configure a Python runtime with the pipeline OpenCV requirements",
            503,
          ),
        ),
      );
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.length > 65536) {
          child.kill();
          finish(
            new PipelineError(
              "STITCH_FAILED",
              "Invalid panorama worker output",
              502,
            ),
          );
        }
      });
      child.stderr.on("data", (chunk) => {
        stderr = (stderr + chunk).slice(-2048);
      });
      child.stdin.on("error", () => {});
      child.on("close", (code) => {
        let value;
        try {
          value = JSON.parse(stdout);
        } catch {
          return finish(
            new PipelineError(
              "STITCH_UNAVAILABLE",
              "Panorama worker failed; check Python and OpenCV installation",
              503,
            ),
          );
        }
        try {
          const diagnostics = captureDiagnostics(
            value.diagnostics,
            buffers.length,
          );
          if (code !== 0 || value.error) {
            const error = new PipelineError(
              typeof value.error === "string" &&
              value.error.startsWith("OVERLAP_REQUIRED")
                ? "OVERLAP_REQUIRED"
                : "STITCH_FAILED",
              typeof value.error === "string"
                ? value.error.slice(0, 1000)
                : "Panorama worker failed",
              422,
            );
            if (diagnostics) error.captureDiagnostics = diagnostics;
            return finish(error);
          }
          if (
            !Number.isSafeInteger(value.width) ||
            !Number.isSafeInteger(value.height) ||
            value.width < 1 ||
            value.height < 1 ||
            value.width * value.height > 24_000_000 ||
            value.trueHdri !== false ||
            value.coverage !== "partial_or_unknown" ||
            !["spherical_panorama_crop", "planar_mosaic"].includes(
              value.projection,
            ) ||
            !Array.isArray(value.usedInputIndices) ||
            value.usedInputIndices.length !== buffers.length ||
            new Set(value.usedInputIndices).size !== buffers.length ||
            value.usedInputIndices.some(
              (i) => !Number.isInteger(i) || i < 0 || i >= buffers.length,
            ) ||
            !diagnostics?.overlap.connected ||
            diagnostics.output?.width !== value.width ||
            diagnostics.output?.height !== value.height ||
            !Array.isArray(value.warnings) ||
            value.warnings.length > 10 ||
            value.warnings.some((w) => typeof w !== "string" || w.length > 1000)
          )
            fail(
              "STITCH_FAILED",
              "Panorama worker returned incomplete input coverage or invalid metadata",
              502,
            );
          finish(null, {
            width: value.width,
            height: value.height,
            projection: value.projection,
            trueHdri: false,
            coverage: "partial_or_unknown",
            usedInputIndices: value.usedInputIndices,
            diagnostics,
            warnings: value.warnings,
          });
        } catch (error) {
          finish(error);
        }
      });
      child.stdin.end(JSON.stringify({ files, output }));
    });
    const outputStat = await stat(output);
    if (!outputStat.isFile() || outputStat.size > 24 * 1024 * 1024)
      fail("ASSET_SIZE", "Stitched image exceeds the 24 MiB asset budget");
    const buffer = await readFile(output);
    let decoded;
    try {
      decoded = await sharp(buffer, {
        limitInputPixels: 24_000_000,
      }).metadata();
    } catch {
      fail("STITCH_FAILED", "Panorama output could not be safely decoded", 502);
    }
    if (
      decoded.format !== "jpeg" ||
      decoded.width !== metadata.width ||
      decoded.height !== metadata.height
    )
      fail(
        "STITCH_FAILED",
        "Decoded panorama dimensions do not match worker metadata",
        502,
      );
    return {
      ...metadata,
      buffer,
      mimeType: "image/jpeg",
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
