import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { PipelineError, fail } from "./contracts.js";
import { physicalInputs } from "./physical-capture.js";
import { geometryGlb } from "./scene3d.js";

const runFile = promisify(execFile);
const json = (value) => Buffer.from(JSON.stringify(value));
export async function readOwnedJson(
  assets,
  asset,
  maxBytes = 24 * 1024 * 1024,
) {
  const bytes = await assets.read(asset.id);
  if (
    bytes.length > maxBytes ||
    !asset.sha256 ||
    createHash("sha256").update(bytes).digest("hex") !== asset.sha256
  )
    fail(
      "PHYSICAL_ASSET_INTEGRITY",
      "Owned processing metadata checksum or size is invalid",
      409,
    );
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(
      "PHYSICAL_ASSET_INTEGRITY",
      "Owned processing metadata is invalid JSON",
      409,
    );
  }
}

function safeEnvironment() {
  const keys = [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "PYTHONHOME",
    "PYTHONPATH",
    "CUDA_PATH",
    "CUDA_VISIBLE_DEVICES",
    "NVIDIA_VISIBLE_DEVICES",
    "LD_LIBRARY_PATH",
  ];
  return {
    ...Object.fromEntries(
      keys
        .filter((k) => process.env[k] !== undefined)
        .map((k) => [k, process.env[k]]),
    ),
    OMP_NUM_THREADS: "2",
    OPENBLAS_NUM_THREADS: "2",
    PYTHONIOENCODING: "utf-8",
    PYTHONUTF8: "1",
  };
}

async function killTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    await runFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 8192,
    }).catch(() => {
      child.kill();
    });
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill();
    }
  }
}

export async function withLocalCompute(operation, prepare, assertOwnership) {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-physical-"));
  try {
    const request = await prepare(root);
    await assertOwnership();
    const script =
      operation === "scene_showcase" ? "render_scene.py" : "physical.py";
    const metadata = await new Promise((resolve, reject) => {
      const child = spawn(
        process.env.WEDDING_PIPELINE_PYTHON || "python",
        [fileURLToPath(new URL(`./python/${script}`, import.meta.url))],
        {
          windowsHide: true,
          detached: process.platform !== "win32",
          shell: false,
          env: safeEnvironment(),
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let stdout = "",
        settled = false,
        terminating = null,
        terminationError;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(ownershipTimer);
        error ? reject(error) : resolve(value);
      };
      const terminate = (error) => {
        if (terminating || settled) return;
        terminationError = error;
        terminating = killTree(child);
      };
      const timer = setTimeout(
        () =>
          terminate(
            new PipelineError(
              "PHYSICAL_TIMEOUT",
              "Local processing timed out; review capture quality and runtime resources",
              504,
            ),
          ),
        operation === "venue_reconstruction" ? 1800000 : 300000,
      );
      const ownershipTimer = setInterval(() => {
        assertOwnership().catch((error) => terminate(error));
      }, 20000);
      ownershipTimer.unref();
      child.on("error", () =>
        finish(
          new PipelineError(
            "PHYSICAL_RUNTIME_UNAVAILABLE",
            "Configure the local Python and required native processing runtime",
            503,
          ),
        ),
      );
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.length > 65536)
          terminate(
            new PipelineError(
              "PHYSICAL_OUTPUT_INVALID",
              "Processing metadata exceeds its limit",
              502,
            ),
          );
      });
      child.stderr.on("data", () => {}); // Raw local tool logs are never exposed through API errors.
      child.stdin.on("error", () => {});
      child.on("close", async (code) => {
        if (terminating) {
          await terminating;
          finish(terminationError);
          return;
        }
        try {
          const result = JSON.parse(stdout);
          if (code !== 0 || result.error) {
            const safeCode = /^[A-Z0-9_]{1,80}$/.test(result.error)
              ? result.error
              : "PHYSICAL_PROCESSING_FAILED";
            return finish(
              new PipelineError(
                safeCode,
                "Local physical processing failed; inspect capture, calibration and native runtime prerequisites",
                422,
              ),
            );
          }
          if (
            !result.metadata ||
            typeof result.metadata !== "object" ||
            Array.isArray(result.metadata)
          )
            throw new Error("metadata");
          finish(null, result.metadata);
        } catch {
          finish(
            new PipelineError(
              "PHYSICAL_OUTPUT_INVALID",
              "Local processing returned invalid metadata",
              502,
            ),
          );
        }
      });
      child.stdin.end(json({ ...request, root, operation }));
    });
    await assertOwnership();
    const read = async (name, limit = 24 * 1024 * 1024) => {
      const file = path.join(root, name);
      const info = await stat(file);
      if (!info.isFile() || info.size < 1 || info.size > limit)
        fail(
          "PHYSICAL_OUTPUT_LIMIT",
          "Local processing output exceeds its asset budget",
        );
      return readFile(file);
    };
    return await request.collect(read, metadata);
  } finally {
    if (
      path.dirname(path.resolve(root)) !== path.resolve(tmpdir()) ||
      !path.basename(root).startsWith("wedding-physical-")
    )
      throw new Error("Unexpected physical processing workspace");
    await rm(root, { recursive: true, force: true });
  }
}

export async function runPhysicalOperation(
  project,
  operation,
  assets,
  assertOwnership,
) {
  const { recipe, inputs, sourcePhysicalHash } = physicalInputs(
    project,
    operation,
  );
  return withLocalCompute(
    operation,
    async (root) => {
      const files = [];
      for (let i = 0; i < inputs.length; i++) {
        await assertOwnership();
        const bytes = await assets.read(inputs[i].id);
        if (
          bytes.length > 24 * 1024 * 1024 ||
          createHash("sha256").update(bytes).digest("hex") !== inputs[i].hash
        )
          fail(
            "PHYSICAL_ASSET_INTEGRITY",
            "Capture bytes no longer match the normalized image",
            409,
          );
        const file = path.join(root, `${i}.jpg`);
        await writeFile(file, bytes);
        files.push(file);
      }
      let calibrationFile;
      if (operation === "venue_reconstruction") {
        const calibration = project.assets.find(
          (a) => a.id === recipe.calibrationAssetId,
        );
        calibrationFile = path.join(root, "approved-calibration.json");
        await writeFile(
          calibrationFile,
          json(await readOwnedJson(assets, calibration, 131072)),
        );
      }
      const common = {
        physicalOperation: operation,
        sourcePhysicalHash,
        referenceAssetIds: [
          ...recipe.assetIds,
          ...(recipe.calibrationAssetId ? [recipe.calibrationAssetId] : []),
        ],
      };
      const collect = async (read, metadata) => {
        const output = (buffer, mimeType, kind, extra = {}) => ({
          buffer,
          mimeType,
          meta: { ...metadata, ...extra, ...common, kind, status: "candidate" },
        });
        if (operation === "lens_calibration") {
          if (
            metadata.cameraId !== recipe.cameraId ||
            metadata.width !== inputs[0].width ||
            metadata.height !== inputs[0].height ||
            !Number.isFinite(metadata.rmsPixels) ||
            metadata.rmsPixels > 1.5
          )
            fail(
              "CALIBRATION_OUTPUT_INVALID",
              "Calibration metadata does not match the selected captures",
            );
          return [
            output(
              await read("calibration.json", 131072),
              "application/json",
              "camera_calibration",
            ),
          ];
        }
        if (operation === "hdr_merge") {
          if (
            metadata.trueHdr !== true ||
            metadata.trueHdri !== false ||
            metadata.coverage !== "single_view"
          )
            fail(
              "HDR_OUTPUT_INVALID",
              "HDR processing did not produce the required radiance metadata",
            );
          return [
            output(
              await read("radiance.hdr"),
              "image/vnd.radiance",
              "hdr_radiance",
            ),
            output(await read("preview.jpg"), "image/jpeg", "hdr_preview", {
              trueHdr: false,
              previewOfHdr: true,
            }),
            output(
              await read("hdr-report.json", 131072),
              "application/json",
              "hdr_report",
              { trueHdr: false },
            ),
          ];
        }
        const geometryBuffer = await read("geometry.json");
        let geometry;
        try {
          geometry = JSON.parse(geometryBuffer.toString("utf8"));
        } catch {
          fail(
            "RECONSTRUCTION_OUTPUT_INVALID",
            "Invalid reconstruction geometry",
          );
        }
        return [
          output(geometryBuffer, "application/json", "geometry_data"),
          output(
            await read("reconstruction-report.json", 131072),
            "application/json",
            "geometry_report",
          ),
          output(geometryGlb(geometry), "model/gltf-binary", "venue_geometry"),
        ];
      };
      return {
        recipe,
        files,
        calibrationFile,
        colmap: process.env.WEDDING_PIPELINE_COLMAP?.trim(),
        collect,
      };
    },
    assertOwnership,
  );
}
