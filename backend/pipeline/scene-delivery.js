import { createHash } from "node:crypto";
import { approvedAsset, fail } from "./contracts.js";
import { sceneHash } from "./scene3d.js";
import { requireCurrentPhysical } from "./physical-capture.js";
import { prepareOwnedScene } from "./scene-stage.js";
import { zipStore, MAX_FLOW_BUNDLE_BYTES } from "./archive.js";

export async function buildScenePackage(project, assetId, assets) {
  const glb = approvedAsset(project, assetId, ["scene_glb"]);
  if (glb.sourceSceneHash !== sceneHash(project))
    fail("STALE_SCENE", "Measured scene or source reconstruction changed", 409);
  await prepareOwnedScene(project, assets);
  const preview = project.assets.find(
    (a) =>
      a.kind === "scene_preview" &&
      a.jobId === glb.jobId &&
      a.sourceSceneHash === glb.sourceSceneHash,
  );
  const manifestAsset = project.assets.find(
    (a) =>
      a.kind === "scene_manifest" &&
      a.jobId === glb.jobId &&
      a.sourceSceneHash === glb.sourceSceneHash,
  );
  if (!preview || !manifestAsset)
    fail("SCENE_INCOMPLETE", "Scene preview/manifest is missing", 409);
  approvedAsset(project, preview.id, ["scene_preview"]);
  approvedAsset(project, manifestAsset.id, ["scene_manifest"]);
  const geometry = approvedAsset(project, project.scene3d.geometryAssetId, [
    "geometry_data",
  ]);
  requireCurrentPhysical(project, geometry);
  const selected = [
    { asset: glb, name: "venue-and-proxies.glb" },
    { asset: preview, name: "viewpoint-preview.jpg" },
    { asset: manifestAsset, name: "scene.json" },
    { asset: geometry, name: "source-geometry.json" },
  ];
  const masterIds = new Set(
    project.scene3d.placements.map(
      (p) =>
        project.components.find((c) => c.id === p.componentId).masterAssetId,
    ),
  );
  for (const masterId of masterIds) {
    const master = approvedAsset(project, masterId, ["component_sheet"]);
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[master.mimeType];
    if (!extension)
      fail(
        "SCENE_INTEGRITY",
        "Component master must be an approved image",
        409,
      );
    selected.push({
      asset: master,
      name: `components/${master.id}.${extension}`,
    });
  }
  if (project.scene3d.hdrAssetId) {
    const hdr = approvedAsset(project, project.scene3d.hdrAssetId, [
      "hdr_radiance",
    ]);
    requireCurrentPhysical(project, hdr);
    selected.push({ asset: hdr, name: "lighting/relative-radiance.hdr" });
  }
  if (
    selected.some(
      ({ asset }) =>
        !Number.isSafeInteger(asset.bytes) ||
        asset.bytes < 1 ||
        asset.bytes > 24 * 1024 * 1024,
    ) ||
    selected.reduce((s, { asset }) => s + asset.bytes, 0) >
      MAX_FLOW_BUNDLE_BYTES - 131072
  )
    fail(
      "SCENE_PACKAGE_LIMIT",
      "Physical scene package exceeds the 64 MiB budget",
    );
  const entries = [],
    files = [];
  for (const { asset, name } of selected) {
    const buffer = await assets.read(asset.id),
      hash = createHash("sha256").update(buffer).digest("hex");
    if (buffer.length !== asset.bytes || hash !== (asset.sha256 ?? asset.hash))
      fail("SCENE_INTEGRITY", "A scene artifact checksum changed", 409);
    entries.push({ name, buffer });
    files.push({
      name,
      assetId: asset.id,
      bytes: buffer.length,
      sha256: hash,
      approval: asset.approval,
    });
  }
  entries.push(
    {
      name: "manifest.json",
      buffer: Buffer.from(
        JSON.stringify(
          {
            formatVersion: 1,
            projectId: project._id,
            exportedRevision: project.revision,
            sourceSceneHash: glb.sourceSceneHash,
            scene: project.scene3d,
            files,
            accuracyVerified: false,
            measurementIndependentlyVerified: false,
          },
          null,
          2,
        ),
      ),
    },
    {
      name: "README.txt",
      buffer: Buffer.from(
        "Open venue-and-proxies.glb in a glTF 2.0 viewer. Coordinates are metres using an operator-measured reference and ground frame. Decoration is represented by dimensioned boxes tied to approved component masters. viewpoint-preview.jpg is a geometric flat-colour render, not photoreal imagery. Inspect scale, holes, camera coverage and placement against site photographs. Optional relative-radiance.hdr is a genuine timed-bracket HDR merge, not a certified spherical HDRI or absolute light measurement; the preview does not apply it as lighting. This package is not a production/construction/safety certificate.\n",
      ),
    },
  );
  return {
    filename: `physical-scene-${glb.id}.zip`,
    buffer: zipStore(entries),
  };
}
