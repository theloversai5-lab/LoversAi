import test from "node:test";
import assert from "node:assert/strict";
import { buildEnvironment } from "../environment.js";
test("3D backdrop has real geometry/texture and truthful coverage metadata", () => {
  const result = buildEnvironment({
    textureUri: "./approved-panorama.jpg",
    width: 2400,
    height: 900,
  });
  assert.equal(result.manifest.trueHdri, false);
  assert.equal(result.manifest.reconstructedGeometry, false);
  assert.equal(result.manifest.angularCoverageSource, "inferred");
  assert.equal(result.gltf.images[0].uri, "./approved-panorama.jpg");
  assert.ok(result.gltf.meshes[0].primitives[0].attributes.POSITION >= 0);
  const raw = Buffer.from(result.gltf.buffers[0].uri.split(",")[1], "base64");
  assert.ok(raw.length > 200);
});
