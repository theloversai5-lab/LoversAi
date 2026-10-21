import { writeFile } from "node:fs/promises";
import path from "node:path";
import { approvedAsset, fail } from "./contracts.js";
import { designHash } from "./fingerprints.js";
import { normalizeImage } from "./media.js";
import { readOwnedJson, withLocalCompute } from "./local-compute.js";
import {
  prepareMeasuredScene,
  geometryGlb,
  proxyGeometry,
  sceneHash,
} from "./scene3d.js";

export async function prepareOwnedScene(project, assets) {
  if (!project.scene3d)
    fail("SCENE_REQUIRED", "Configure a measured 3D scene first");
  const source = approvedAsset(project, project.scene3d.geometryAssetId, [
    "geometry_data",
  ]);
  return prepareMeasuredScene(project, await readOwnedJson(assets, source));
}

export async function runSceneShowcase(project, assets, assertOwnership) {
  const scene = await prepareOwnedScene(project, assets);
  const glb = geometryGlb(scene);
  return withLocalCompute(
    "scene_showcase",
    async (root) => {
      const sceneFile = path.join(root, "scene.json");
      await writeFile(
        sceneFile,
        JSON.stringify({
          camera: scene.camera,
          groups: [
            {
              vertices: scene.vertices,
              colors: scene.colors,
              faces: scene.faces,
            },
            ...scene.placements.map(proxyGeometry),
          ],
        }),
      );
      return {
        sceneFile,
        collect: async (read, metadata) => {
          if (
            metadata.width !== 1280 ||
            metadata.height !== 720 ||
            metadata.accuracyVerified !== false
          )
            fail(
              "SCENE_OUTPUT_INVALID",
              "Geometric preview metadata is invalid",
            );
          const common = {
            status: "candidate",
            sourceSceneHash: sceneHash(project),
            sourceDesignHash: designHash(project),
            referenceAssetIds: [
              project.scene3d.geometryAssetId,
              ...new Set(scene.placements.map((p) => p.masterAssetId)),
              ...(project.scene3d.hdrAssetId
                ? [project.scene3d.hdrAssetId]
                : []),
            ],
            manifest: scene.manifest,
          };
          const preview = await normalizeImage(
            await read("scene-preview.jpg"),
            { maxBytes: 24 * 1024 * 1024 },
          );
          if (preview.width !== 1280 || preview.height !== 720)
            fail(
              "SCENE_OUTPUT_INVALID",
              "Decoded scene preview dimensions differ from the rendering contract",
            );
          return [
            {
              buffer: glb,
              mimeType: "model/gltf-binary",
              meta: { ...common, kind: "scene_glb" },
            },
            {
              buffer: preview.buffer,
              mimeType: "image/jpeg",
              meta: {
                ...metadata,
                ...common,
                hash: preview.hash,
                kind: "scene_preview",
              },
            },
            {
              buffer: Buffer.from(
                JSON.stringify({
                  formatVersion: 1,
                  ...scene.manifest,
                  bounds: scene.bounds,
                  camera: scene.camera,
                  placements: scene.placements,
                  cameraPoses: scene.cameraPoses,
                }),
              ),
              mimeType: "application/json",
              meta: { ...common, kind: "scene_manifest" },
            },
          ];
        },
      };
    },
    assertOwnership,
  );
}
