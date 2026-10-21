import { approvedAsset, fail } from "./contracts.js";
import { designHash } from "./fingerprints.js";
import { taskTemplate, TEMPLATE_VERSION } from "./prompts.js";
import { buildShotPlan } from "./flow-shot.js";
import { sceneHash } from "./scene3d.js";
export function buildFlowHandoff(project, { showcaseAssetId }) {
  const showcase = approvedAsset(project, showcaseAssetId, [
    "showcase",
    "scene_preview",
  ]);
  if (showcase.sourceDesignHash !== designHash(project))
    fail(
      "STALE_DESIGN",
      "The approved showcase belongs to a different design revision; regenerate and approve it before exporting to Flow",
      409,
    );
  if (
    showcase.kind === "scene_preview" &&
    showcase.sourceSceneHash !== sceneHash(project)
  )
    fail("STALE_SCENE", "The measured scene preview is no longer current", 409);
  const shotPlan =
    project.flowShot || project.scene3d ? buildShotPlan(project) : null;
  const references = (project.components || []).map((c) => ({
    componentId: c.id,
    assetId: approvedAsset(project, c.masterAssetId, ["component_sheet"]).id,
  }));
  return {
    formatVersion: shotPlan ? 2 : 1,
    provider: "google_flow",
    status: "awaiting_flow",
    automatedSubmission: false,
    templateVersion: TEMPLATE_VERSION,
    projectId: String(project._id),
    projectRevision: project.revision,
    sourceDesignHash: designHash(project),
    startFrameAssetId: showcaseAssetId,
    componentReferences: references,
    targetDurationSeconds: 8,
    ...(shotPlan
      ? {
          shotPlan,
          sourceShotHash: shotPlan.shotPlanHash,
          ...(project.scene3d ? { sourceSceneHash: sceneHash(project) } : {}),
        }
      : {}),
    prompt: `${taskTemplate("flow_shot")}\nUNTRUSTED DESIGN DATA:\n${JSON.stringify({ brief: project.brief, components: project.components, canvas: project.canvas, ...(shotPlan ? { shotPlan, scene3d: project.scene3d } : {}) })}`,
    instructions: [
      "Download the approved frame and component references through the authenticated asset API.",
      "Open Google Flow and use the frame, references and shot prompt with supported Flow controls.",
      "Review venue/component continuity before delivery. This handoff is not a generated video.",
    ],
    flowUrl: "https://labs.google/fx/tools/flow",
  };
}
