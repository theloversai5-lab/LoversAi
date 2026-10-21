import { fail } from "./contracts.js";
import { fingerprint } from "./fingerprints.js";

export function validateFlowShot(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (k) =>
        !["motion", "durationSeconds", "angleDegrees", "travelMetres"].includes(
          k,
        ),
    ) ||
    !["gentle_orbit", "push_in", "lateral_dolly", "static"].includes(
      value.motion,
    ) ||
    value.durationSeconds !== 8 ||
    !Number.isFinite(value.angleDegrees ?? 15) ||
    (value.angleDegrees ?? 15) < 0 ||
    (value.angleDegrees ?? 15) > 45 ||
    !Number.isFinite(value.travelMetres ?? 1) ||
    (value.travelMetres ?? 1) < 0 ||
    (value.travelMetres ?? 1) > 10
  )
    fail(
      "INVALID_FLOW_SHOT",
      "Choose an eight-second bounded static/orbit/push/dolly shot",
    );
  return {
    motion: value.motion,
    durationSeconds: 8,
    angleDegrees: value.angleDegrees ?? 15,
    travelMetres: value.travelMetres ?? 1,
  };
}

export function buildShotPlan(project) {
  const settings = project.flowShot
    ? validateFlowShot(project.flowShot)
    : {
        motion: "gentle_orbit",
        durationSeconds: 8,
        angleDegrees: 15,
        travelMetres: 1,
      };
  const camera = project.scene3d?.camera;
  let path = [],
    distance = null;
  if (camera) {
    const delta = camera.position.map((n, i) => n - camera.target[i]);
    const norm = Math.hypot(...delta),
      rightNorm = Math.hypot(delta[0], delta[2]);
    if (norm < 0.1 || (rightNorm < 0.1 && settings.motion !== "static"))
      fail(
        "INVALID_FLOW_SHOT",
        "Moving shots need a nonvertical measured viewpoint; choose static for a directly overhead view",
      );
    for (let i = 0; i <= 8; i++) {
      const t = i / 8,
        ease = t * t * (3 - 2 * t),
        position = [...camera.position];
      if (settings.motion === "gentle_orbit") {
        const a = ((settings.angleDegrees * Math.PI) / 180) * ease;
        position[0] =
          camera.target[0] + Math.cos(a) * delta[0] + Math.sin(a) * delta[2];
        position[2] =
          camera.target[2] - Math.sin(a) * delta[0] + Math.cos(a) * delta[2];
      } else if (settings.motion === "push_in") {
        if (settings.travelMetres > norm - 1)
          fail(
            "INVALID_FLOW_SHOT",
            "Push-in stops at least one metre before the scene target",
          );
        for (let k = 0; k < 3; k++)
          position[k] -= (delta[k] / norm) * settings.travelMetres * ease;
      } else if (settings.motion === "lateral_dolly") {
        position[0] += (delta[2] / rightNorm) * settings.travelMetres * ease;
        position[2] -= (delta[0] / rightNorm) * settings.travelMetres * ease;
      }
      path.push({
        seconds: i,
        positionMetres: position,
        targetMetres: [...camera.target],
      });
    }
    distance = path
      .slice(1)
      .reduce(
        (sum, p, i) =>
          sum +
          Math.hypot(
            ...p.positionMetres.map((n, k) => n - path[i].positionMetres[k]),
          ),
        0,
      );
    if ((1.5 * distance) / 8 > 2)
      fail(
        "FLOW_SHOT_TOO_FAST",
        "Reduce orbit angle/travel: eased camera speed must remain below two metres per second",
      );
  }
  const plan = {
    formatVersion: 1,
    ...settings,
    coordinateSystem: camera
      ? "right_handed_Y_up_metres"
      : "illustrative_image_space",
    cameraPath: path,
    approximateTravelMetres: distance,
    providerExecutionVerified: false,
    instruction:
      "Keep venue boundaries, facade, entrances, approved component count, positions, materials and colours stable. Use a continuous slow camera move without cuts, new objects or layout changes. Geometry behind unseen surfaces is not established by this plan.",
    continuityChecklist: [
      "Venue facade/boundary/entrances retain their identity",
      "Every approved component retains position, dimensions, colour and count",
      "Keep-clear zones and circulation routes remain unobstructed",
      "Camera movement is smooth, slow and follows the intended shot",
      "Inspect first/middle/last frames for morphing, object popping, clipping and invented geometry",
      "Compare against the approved frame and component masters before delivery",
    ],
    automation: {
      supportedIntegrationConfigured: false,
      submission: "manual_google_flow",
      pathIsPlanningDataNotProviderControl: true,
    },
  };
  return { ...plan, shotPlanHash: fingerprint(plan) };
}
