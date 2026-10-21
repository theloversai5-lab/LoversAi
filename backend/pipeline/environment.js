import { fail } from "./contracts.js";

// A curved image backdrop, deliberately not labeled a reconstructed venue mesh.
export function buildEnvironment({
  textureUri,
  width,
  height,
  displayHorizontalFovDeg = 120,
  provenance = {},
}) {
  if (
    typeof textureUri !== "string" ||
    (!/^\.\/[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9]+)?$/.test(textureUri) &&
      !/^\/api\/wedding-pipeline\/projects\/[a-zA-Z0-9_-]+\/assets\/[a-zA-Z0-9_-]+$/.test(
        textureUri,
      )) ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 24_000_000 ||
    !Number.isFinite(displayHorizontalFovDeg) ||
    displayHorizontalFovDeg < 30 ||
    displayHorizontalFovDeg > 180
  )
    fail(
      "INVALID_ENVIRONMENT",
      "Texture must reference an owned pipeline asset",
    );
  const segments = 48,
    radius = 6,
    hfov = (displayHorizontalFovDeg * Math.PI) / 180,
    positions = [],
    uv = [],
    indices = [];
  const physicalHeight = (radius * hfov * height) / width;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      angle = (t - 0.5) * hfov;
    for (const y of [-physicalHeight / 2, physicalHeight / 2])
      positions.push(radius * Math.sin(angle), y, -radius * Math.cos(angle));
    uv.push(t, 1, t, 0);
    if (i < segments) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const pos = Buffer.from(new Float32Array(positions).buffer),
    tex = Buffer.from(new Float32Array(uv).buffer),
    idx = Buffer.from(new Uint16Array(indices).buffer),
    buffer = Buffer.concat([pos, tex, idx]);
  const xs = positions.filter((_, i) => i % 3 === 0),
    ys = positions.filter((_, i) => i % 3 === 1),
    zs = positions.filter((_, i) => i % 3 === 2);
  const manifest = {
    formatVersion: 2,
    kind: "panoramic_backdrop",
    trueHdri: false,
    reconstructedGeometry: false,
    navigable: false,
    angularCoverageSource: "inferred",
    displayHorizontalFovDeg,
    texture: { width, height, dynamicRange: "ldr" },
    provenance,
    camera: {
      position: [0, 0, 0],
      looksAlong: "-Z",
      physicalPositionMeasured: false,
    },
    units: "arbitrary",
    warning:
      "Curved LDR image backdrop. Display field of view is inferred, not measured capture coverage. No geometry, physical scale or complete 360 coverage is claimed.",
  };
  return {
    manifest,
    gltf: {
      asset: { version: "2.0", generator: "LoversAI wedding pipeline" },
      extensionsUsed: ["KHR_materials_unlit"],
      scene: 0,
      scenes: [{ nodes: [0, 1] }],
      nodes: [
        { mesh: 0, name: "LDR venue backdrop" },
        { camera: 0, name: "Illustrative viewing camera" },
      ],
      cameras: [
        {
          type: "perspective",
          perspective: {
            aspectRatio: width / height,
            yfov: 2 * Math.atan(physicalHeight / (2 * radius)),
            znear: 0.01,
            zfar: 100,
          },
        },
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: { POSITION: 0, TEXCOORD_0: 1 },
              indices: 2,
              material: 0,
            },
          ],
        },
      ],
      materials: [
        {
          doubleSided: true,
          extensions: { KHR_materials_unlit: {} },
          pbrMetallicRoughness: {
            baseColorTexture: { index: 0 },
            metallicFactor: 0,
            roughnessFactor: 1,
          },
        },
      ],
      textures: [{ source: 0 }],
      images: [{ uri: textureUri }],
      buffers: [
        {
          byteLength: buffer.length,
          uri: `data:application/octet-stream;base64,${buffer.toString("base64")}`,
        },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: pos.length, target: 34962 },
        {
          buffer: 0,
          byteOffset: pos.length,
          byteLength: tex.length,
          target: 34962,
        },
        {
          buffer: 0,
          byteOffset: pos.length + tex.length,
          byteLength: idx.length,
          target: 34963,
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: positions.length / 3,
          type: "VEC3",
          min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
          max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)],
        },
        {
          bufferView: 1,
          componentType: 5126,
          count: uv.length / 2,
          type: "VEC2",
        },
        {
          bufferView: 2,
          componentType: 5123,
          count: indices.length,
          type: "SCALAR",
        },
      ],
      extras: manifest,
    },
  };
}

// Single-file glTF 2.0: JSON/BIN chunks and texture bufferViews are 4-byte aligned.
// This accepts only our generated, single-buffer backdrop, never arbitrary remote glTF.
export function encodeEnvironmentGlb({
  gltf,
  texture,
  mimeType = "image/jpeg",
}) {
  if (
    !Buffer.isBuffer(texture) ||
    !texture.length ||
    texture.length > 24 * 1024 * 1024 ||
    !["image/jpeg", "image/png"].includes(mimeType) ||
    gltf?.asset?.version !== "2.0" ||
    gltf.buffers?.length !== 1 ||
    gltf.images?.length !== 1 ||
    !/^data:application\/octet-stream;base64,[A-Za-z0-9+/]+={0,2}$/.test(
      gltf.buffers[0].uri ?? "",
    )
  )
    fail(
      "INVALID_ENVIRONMENT",
      "GLB requires a generated backdrop and bounded owned JPEG/PNG texture",
    );
  const geometry = Buffer.from(gltf.buffers[0].uri.split(",")[1], "base64");
  if (
    geometry.length !== gltf.buffers[0].byteLength ||
    geometry.length > 1024 * 1024
  )
    fail("INVALID_ENVIRONMENT", "Backdrop geometry size is invalid");
  const textureOffset = Math.ceil(geometry.length / 4) * 4;
  const binaryLength = textureOffset + texture.length;
  const binary = Buffer.alloc(Math.ceil(binaryLength / 4) * 4);
  geometry.copy(binary);
  texture.copy(binary, textureOffset);
  const document = structuredClone(gltf);
  document.buffers = [{ byteLength: binaryLength }];
  const view = document.bufferViews.length;
  document.bufferViews.push({
    buffer: 0,
    byteOffset: textureOffset,
    byteLength: texture.length,
  });
  document.images = [{ bufferView: view, mimeType }];
  const json = Buffer.from(JSON.stringify(document));
  const jsonChunk = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(jsonChunk);
  const length = 12 + 8 + jsonChunk.length + 8 + binary.length;
  if (length > 24 * 1024 * 1024)
    fail(
      "ASSET_SIZE",
      "Embedded environment exceeds the 24 MiB private asset limit",
    );
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(length, 8);
  const jsonHeader = Buffer.alloc(8),
    binHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binary]);
}
