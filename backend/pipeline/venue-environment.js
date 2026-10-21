import { createHash } from "node:crypto";
import { approvedAsset, fail } from "./contracts.js";
import {
  venueReadiness,
  venueCaptureHash,
  requireCurrentEnvironment,
} from "./venue-capture.js";
import { encodeEnvironmentGlb } from "./environment.js";
import { zipStore } from "./archive.js";

export const MAX_ENVIRONMENT_PACKAGE_BYTES = 48 * 1024 * 1024;
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const json = (value) => Buffer.from(JSON.stringify(value, null, 2));

export function environmentSummary(project) {
  const currentHash = venueCaptureHash(project);
  const readiness = venueReadiness(project);
  return {
    formatVersion: 1,
    projectId: String(project._id),
    revision: project.revision,
    readiness,
    environments: project.assets
      .filter((a) => a.kind === "environment_glb")
      .map((a) => {
        const panorama = project.assets.find(
          (p) => p.id === a.referenceAssetIds?.[0] && p.kind === "panorama",
        );
        const gltf = project.assets.find(
          (p) =>
            p.kind === "environment" &&
            p.jobId === a.jobId &&
            p.referenceAssetIds?.[0] === panorama?.id,
        );
        const current =
          a.sourceCaptureHash === currentHash &&
          panorama?.sourceCaptureHash === currentHash &&
          gltf?.sourceCaptureHash === currentHash;
        const approved = [a, panorama, gltf].every(
          (p) => p?.status === "approved",
        );
        return {
          assetId: a.id,
          panoramaAssetId: panorama?.id ?? null,
          gltfAssetId: gltf?.id ?? null,
          sourceRevision: a.sourceRevision,
          sourceCaptureHash: a.sourceCaptureHash,
          status: a.status,
          current,
          approved,
          exportable: current && approved && readiness.canEnqueuePanorama,
          pendingApprovalAssetIds: [panorama, gltf, a]
            .filter((p) => p && p.status !== "approved")
            .map((p) => p.id),
          trueHdri: false,
          reconstructedGeometry: false,
          navigable: false,
          manifest: a.manifest,
          download: `/api/wedding-pipeline/projects/${project._id}/assets/${a.id}`,
          packageEndpoint: `/api/wedding-pipeline/projects/${project._id}/environments/${a.id}/package`,
        };
      }),
  };
}

export async function buildEnvironmentPackage(project, assetId, assets) {
  const glb = approvedAsset(project, assetId, ["environment_glb"]);
  requireCurrentEnvironment(project, glb);
  const panorama = approvedAsset(project, glb.referenceAssetIds?.[0], [
    "panorama",
  ]);
  requireCurrentEnvironment(project, panorama);
  const gltf = project.assets.find(
    (a) =>
      a.kind === "environment" &&
      a.jobId === glb.jobId &&
      a.referenceAssetIds?.[0] === panorama.id,
  );
  if (!gltf)
    fail(
      "ENVIRONMENT_INCOMPLETE",
      "The matching glTF backdrop is missing",
      409,
    );
  approvedAsset(project, gltf.id, ["environment"]);
  requireCurrentEnvironment(project, gltf);
  const selected = [panorama, gltf, glb];
  if (
    selected.some(
      (a) =>
        !Number.isSafeInteger(a.bytes) ||
        a.bytes < 1 ||
        a.bytes > 24 * 1024 * 1024,
    ) ||
    selected.reduce((sum, a) => sum + a.bytes, 0) + 128 * 1024 >
      MAX_ENVIRONMENT_PACKAGE_BYTES
  )
    fail(
      "ENVIRONMENT_PACKAGE_LIMIT",
      "Environment package exceeds its 48 MiB budget",
    );
  const buffers = await Promise.all(selected.map((a) => assets.read(a.id)));
  for (let i = 0; i < selected.length; i++) {
    if (
      buffers[i].length !== selected[i].bytes ||
      !selected[i].sha256 ||
      sha(buffers[i]) !== selected[i].sha256
    )
      fail(
        "ENVIRONMENT_INTEGRITY",
        "Environment file bytes differ from their stored checksum",
        409,
      );
  }
  if (buffers[1].length > 128 * 1024)
    fail("ENVIRONMENT_INTEGRITY", "Unexpected backdrop metadata size", 409);
  let document;
  try {
    document = JSON.parse(buffers[1].toString("utf8"));
  } catch {
    fail("ENVIRONMENT_INTEGRITY", "Stored backdrop metadata is invalid", 409);
  }
  if (
    document.extras?.formatVersion !== 2 ||
    document.extras?.provenance?.sourceCaptureHash !== glb.sourceCaptureHash ||
    document.images?.[0]?.uri !== `./${panorama.id}`
  )
    fail(
      "ENVIRONMENT_INTEGRITY",
      "Backdrop provenance or texture does not match this capture",
      409,
    );
  const expectedGlb = encodeEnvironmentGlb({
    gltf: document,
    texture: buffers[0],
    mimeType: panorama.mimeType,
  });
  if (!expectedGlb.equals(buffers[2]))
    fail(
      "ENVIRONMENT_INTEGRITY",
      "Embedded GLB geometry or texture differs from the approved source",
      409,
    );
  document.images[0].uri = "./venue-panorama.jpg";
  const entries = [
    { name: "venue-panorama.jpg", buffer: buffers[0] },
    { name: "venue-backdrop.gltf", buffer: json(document) },
    { name: "venue-backdrop.glb", buffer: buffers[2] },
    {
      name: "README.txt",
      buffer: Buffer.from(
        "Open venue-backdrop.glb in a glTF 2.0 viewer. Geometry and the approved JPEG texture are embedded. The glTF alternative uses venue-panorama.jpg beside it. This is an LDR curved image backdrop, with an illustrative camera and arbitrary units. It is not radiometric HDR, a navigable or measured venue mesh, a complete 360 capture, or a production construction plan. Check manifest.json for provenance, capture diagnostics, approvals and checksums. No missing venue coverage has been generated.\n",
      ),
    },
  ];
  const manifest = {
    formatVersion: 1,
    projectId: String(project._id),
    sourceRevision: glb.sourceRevision,
    exportedProjectRevision: project.revision,
    environmentAssetId: glb.id,
    sourceCaptureHash: glb.sourceCaptureHash,
    capture: project.venueCapture ?? null,
    environment: glb.manifest,
    approvals: selected.map((a) => ({
      assetId: a.id,
      kind: a.kind,
      approval: a.approval,
    })),
    files: entries.map((e) => ({
      name: e.name,
      bytes: e.buffer.length,
      sha256: sha(e.buffer),
    })),
  };
  entries.push({ name: "manifest.json", buffer: json(manifest) });
  if (
    entries.reduce((sum, e) => sum + e.buffer.length + 512, 0) >
    MAX_ENVIRONMENT_PACKAGE_BYTES
  )
    fail(
      "ENVIRONMENT_PACKAGE_LIMIT",
      "Environment package exceeds its 48 MiB budget",
    );
  return {
    filename: `venue-environment-${glb.id}.zip`,
    buffer: zipStore(entries),
    manifest,
  };
}
