import { createHash } from "node:crypto";
import { approvedAsset, fail, id } from "./contracts.js";
import { designHash } from "./fingerprints.js";
import { buildFlowHandoff } from "./flow.js";
import { zipStore, MAX_FLOW_BUNDLE_BYTES } from "./archive.js";
import { buildShotPlan } from "./flow-shot.js";
import { sceneHash } from "./scene3d.js";

export async function loadCurrentHandoff(project, assetId, assets) {
  const asset = approvedAsset(project, assetId, ["flow_handoff"]);
  const bytes = await assets.read(asset.id);
  if (bytes.length > 128 * 1024)
    fail("INVALID_FLOW_HANDOFF", "Handoff exceeds metadata limit");
  if (
    asset.sha256 &&
    createHash("sha256").update(bytes).digest("hex") !== asset.sha256
  )
    fail("REFERENCE_INTEGRITY", "Stored Flow handoff checksum changed", 409);
  let handoff;
  try {
    handoff = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("INVALID_FLOW_HANDOFF", "Handoff metadata is invalid");
  }
  if (
    ![1, 2].includes(handoff?.formatVersion) ||
    handoff.provider !== "google_flow" ||
    handoff.automatedSubmission !== false ||
    handoff.projectId !== String(project._id)
  )
    fail("INVALID_FLOW_HANDOFF", "Expected a Flow handoff from this project");
  if (
    handoff.sourceDesignHash !== designHash(project) ||
    asset.sourceDesignHash !== handoff.sourceDesignHash
  )
    fail(
      "STALE_FLOW_HANDOFF",
      "Design changed or handoff predates delivery support; prepare a new Flow handoff",
      409,
    );
  const current = buildFlowHandoff(project, {
    showcaseAssetId: handoff.startFrameAssetId,
  });
  if (
    handoff.formatVersion !== current.formatVersion ||
    (handoff.formatVersion === 2 &&
      (handoff.sourceShotHash !== current.sourceShotHash ||
        asset.sourceShotHash !== current.sourceShotHash ||
        JSON.stringify(handoff.shotPlan) !== JSON.stringify(current.shotPlan) ||
        handoff.sourceSceneHash !== current.sourceSceneHash))
  )
    fail(
      "STALE_FLOW_HANDOFF",
      "Scene or camera shot plan changed; prepare a fresh Flow handoff",
      409,
    );
  if (
    JSON.stringify(handoff.componentReferences) !==
      JSON.stringify(current.componentReferences) ||
    typeof handoff.prompt !== "string"
  )
    fail(
      "INVALID_FLOW_HANDOFF",
      "Handoff reference manifest does not match this design",
    );
  return { asset, handoff };
}

export async function buildFlowPackage(project, assetId, assets) {
  const { handoff } = await loadCurrentHandoff(project, assetId, assets);
  const references = [],
    entries = [];
  const selected = [
    { assetId: handoff.startFrameAssetId, role: "approved start frame" },
    ...handoff.componentReferences.map((r) => ({
      ...r,
      role: `component ${r.componentId} master`,
    })),
  ];
  if (selected.length > 13)
    fail(
      "REFERENCE_LIMIT",
      "Flow package supports at most 13 reference images",
    );
  let size = 0;
  for (const ref of selected) {
    const asset = approvedAsset(project, ref.assetId, [
      "showcase",
      "scene_preview",
      "component_sheet",
    ]);
    if (!id(asset.id))
      fail("INVALID_FLOW_HANDOFF", "Invalid reference identifier");
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[asset.mimeType];
    if (!extension)
      fail("INVALID_FLOW_HANDOFF", "Flow references must be image assets");
    const buffer = await assets.read(asset.id),
      hash = createHash("sha256").update(buffer).digest("hex");
    if (
      (asset.hash && asset.hash !== hash) ||
      (asset.sha256 && asset.sha256 !== hash)
    )
      fail(
        "REFERENCE_INTEGRITY",
        "Stored reference bytes do not match their recorded checksum",
        409,
      );
    const file = `references/${asset.id}.${extension}`;
    references.push({
      ...ref,
      file,
      mimeType: asset.mimeType,
      bytes: buffer.length,
      sha256: hash,
    });
    if (!entries.some((e) => e.name === file)) {
      entries.push({ name: file, buffer });
      size += buffer.length;
    }
    if (size > MAX_FLOW_BUNDLE_BYTES)
      fail("FLOW_PACKAGE_LIMIT", "Flow reference package exceeds 64 MiB");
  }
  const manifest = {
    formatVersion: 1,
    provider: "google_flow",
    automatedSubmission: false,
    projectId: handoff.projectId,
    handoffAssetId: assetId,
    sourceDesignHash: handoff.sourceDesignHash,
    targetDurationSeconds: handoff.targetDurationSeconds,
    ...(handoff.sourceShotHash
      ? { sourceShotHash: handoff.sourceShotHash }
      : {}),
    references,
  };
  const json = (value) => Buffer.from(JSON.stringify(value, null, 2));
  if (handoff.shotPlan) {
    entries.push(
      { name: "shot-plan.json", buffer: json(handoff.shotPlan) },
      {
        name: "continuity-checklist.json",
        buffer: json({
          formatVersion: 1,
          checks: handoff.shotPlan.continuityChecklist,
          automatedCertification: false,
        }),
      },
    );
    if (handoff.sourceSceneHash) {
      const scene = project.assets.find(
        (a) =>
          a.kind === "scene_glb" &&
          a.status === "approved" &&
          a.sourceSceneHash === handoff.sourceSceneHash,
      );
      if (!scene || scene.sourceSceneHash !== sceneHash(project))
        fail(
          "SCENE_APPROVAL_REQUIRED",
          "Approve the matching scene GLB before exporting its Flow plan",
          409,
        );
      const buffer = await assets.read(scene.id);
      if (
        !scene.sha256 ||
        createHash("sha256").update(buffer).digest("hex") !== scene.sha256
      )
        fail("SCENE_INTEGRITY", "Scene GLB checksum changed", 409);
      if ((size += buffer.length) > MAX_FLOW_BUNDLE_BYTES)
        fail("FLOW_PACKAGE_LIMIT", "Flow reference package exceeds 64 MiB");
      entries.push({ name: "scene/venue-and-proxies.glb", buffer });
      manifest.sceneReference = {
        assetId: scene.id,
        file: "scene/venue-and-proxies.glb",
        sha256: scene.sha256,
        flowSupportsGeometryUpload: false,
        purpose: "operator planning reference",
      };
    }
  }
  entries.push(
    { name: "manifest.json", buffer: json(manifest) },
    { name: "handoff.json", buffer: json(handoff) },
    { name: "prompt.txt", buffer: Buffer.from(handoff.prompt) },
    {
      name: "README.txt",
      buffer: Buffer.from(
        "Open https://labs.google/fx/tools/flow and use the approved start frame, component references and prompt.txt with supported Flow controls. This archive does not submit or generate a video. When present, shot-plan.json and scene/venue-and-proxies.glb are operator planning references, not a claimed Flow camera-path or geometry-upload API. Import the exported MP4 through the private pipeline video endpoint, attest its origin, then perform the owner continuity review. Capture declarations/scale do not certify site accuracy. Reference checksums are in manifest.json.\n",
      ),
    },
  );
  return {
    buffer: zipStore(entries),
    filename: `flow-${assetId}.zip`,
    manifest,
  };
}

export function flowDeliveryStatus(project) {
  const currentDesign = designHash(project);
  const currentShot =
    project.flowShot || project.scene3d
      ? buildShotPlan(project).shotPlanHash
      : null;
  const videos = project.assets
    .filter((a) => a.kind === "flow_video")
    .map((v) => {
      const handoff = project.assets.find(
        (a) => a.id === v.handoffAssetId && a.kind === "flow_handoff",
      );
      const contact = project.assets.find(
        (a) => a.id === v.contactSheetAssetId && a.parentAssetId === v.id,
      );
      const current =
        v.sourceDesignHash === currentDesign &&
        handoff?.sourceDesignHash === currentDesign &&
        (handoff?.sourceShotHash ?? null) === currentShot;
      const approved =
        current &&
        v.status === "approved" &&
        contact?.status === "approved" &&
        [
          "venuePreserved",
          "componentIdentity",
          "placementAndClearance",
          "motionContinuity",
        ].every((k) => v.review?.checks?.[k] === true);
      return {
        assetId: v.id,
        contactSheetAssetId: contact?.id ?? null,
        status: v.status,
        current,
        readyForDelivery: approved,
        review: v.review ?? null,
      };
    });
  return {
    formatVersion: 1,
    projectId: String(project._id),
    revision: project.revision,
    submissionMode: "manual_google_flow",
    automatedSubmission: false,
    providerOriginVerified: false,
    actualFlowWorkflowVerified: false,
    shotPlan: buildShotPlan(project),
    videos,
    status: videos.some((v) => v.readyForDelivery)
      ? "approved_delivery"
      : videos.length
        ? "review_or_refresh_required"
        : "awaiting_flow_video",
  };
}
