import { approvedAsset, fail, id } from "./contracts.js";
import { fingerprint, componentHash } from "./fingerprints.js";
import { physicalHash, requireCurrentPhysical } from "./physical-capture.js";

const vec = (v, limit = 1000) =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((n) => Number.isFinite(n) && Math.abs(n) <= limit);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (v) => Math.hypot(...v);
function unit(v) {
  const n = length(v);
  if (n < 1e-8)
    fail(
      "DEGENERATE_SCENE_FRAME",
      "Measured frame/reference points must be distinct and noncollinear",
    );
  return v.map((x) => x / n);
}
function shape(value, fields) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !fields.includes(k))
  )
    fail("INVALID_SCENE", "Unexpected 3D scene fields");
}

export function validateScene3d(value, project) {
  shape(value, [
    "geometryAssetId",
    "frame",
    "scale",
    "placements",
    "keepClear",
    "camera",
    "hdrAssetId",
    "clearanceMetres",
  ]);
  const asset = approvedAsset(project, value.geometryAssetId, [
    "geometry_data",
  ]);
  requireCurrentPhysical(project, asset);
  shape(value.frame, ["originVertex", "xAxisVertex", "planeVertex"]);
  shape(value.scale, ["vertexA", "vertexB", "metres", "method"]);
  const indices = [
    ...Object.values(value.frame),
    value.scale.vertexA,
    value.scale.vertexB,
  ];
  if (
    Object.keys(value.frame).length !== 3 ||
    indices.length !== 5 ||
    indices.some((n) => !Number.isSafeInteger(n) || n < 0 || n >= 75000) ||
    !Number.isFinite(value.scale.metres) ||
    value.scale.metres <= 0 ||
    value.scale.metres > 1000 ||
    !["tape", "laser", "survey"].includes(value.scale.method)
  )
    fail(
      "INVALID_SCENE",
      "Provide valid reconstruction vertex indices, a measured distance and measurement method",
    );
  if (
    !Array.isArray(value.placements) ||
    value.placements.length > 40 ||
    !Array.isArray(value.keepClear ?? []) ||
    (value.keepClear ?? []).length > 20
  )
    fail(
      "INVALID_SCENE",
      "Use at most forty proxies and twenty clearance zones",
    );
  const seen = new Set();
  const placements = value.placements.map((p) => {
    shape(p, ["id", "componentId", "position", "rotationYDeg"]);
    const component = project.components.find((c) => c.id === p.componentId);
    if (
      !id(p.id) ||
      seen.has(p.id) ||
      !component?.dimensions ||
      !vec(p.position) ||
      Math.abs(p.position[1]) > 0.1 ||
      !Number.isFinite(p.rotationYDeg) ||
      Math.abs(p.rotationYDeg) > 180
    )
      fail(
        "INVALID_SCENE",
        "Proxies need unique IDs, measured components, ground-level positions and bounded yaw",
      );
    approvedAsset(project, component.masterAssetId, ["component_sheet"]);
    seen.add(p.id);
    return {
      id: p.id,
      componentId: p.componentId,
      position: [...p.position],
      rotationYDeg: p.rotationYDeg,
    };
  });
  const keepClear = (value.keepClear ?? []).map((z) => {
    shape(z, ["id", "min", "max"]);
    if (
      !id(z.id) ||
      seen.has(z.id) ||
      ![z.min, z.max].every(
        (v) =>
          Array.isArray(v) &&
          v.length === 2 &&
          v.every((n) => Number.isFinite(n) && Math.abs(n) <= 1000),
      ) ||
      z.min.some((n, i) => n >= z.max[i])
    )
      fail(
        "INVALID_SCENE",
        "Clearance zones need unique IDs and positive X/Z bounds in metres",
      );
    seen.add(z.id);
    return { id: z.id, min: [...z.min], max: [...z.max] };
  });
  shape(value.camera, ["position", "target", "verticalFovDeg"]);
  if (
    !vec(value.camera.position) ||
    value.camera.position[1] < 0.1 ||
    !vec(value.camera.target) ||
    length(sub(value.camera.position, value.camera.target)) < 0.1 ||
    !Number.isFinite(value.camera.verticalFovDeg) ||
    value.camera.verticalFovDeg < 15 ||
    value.camera.verticalFovDeg > 100
  )
    fail(
      "INVALID_SCENE",
      "Provide a finite metre-based camera and target with 15–100 degree vertical field of view",
    );
  const clearanceMetres = value.clearanceMetres ?? 0.5;
  if (
    !Number.isFinite(clearanceMetres) ||
    clearanceMetres < 0 ||
    clearanceMetres > 10
  )
    fail("INVALID_SCENE", "Clearance must be between zero and ten metres");
  if (value.hdrAssetId != null)
    requireCurrentPhysical(
      project,
      approvedAsset(project, value.hdrAssetId, ["hdr_radiance"]),
    );
  return {
    geometryAssetId: value.geometryAssetId,
    frame: { ...value.frame },
    scale: { ...value.scale },
    placements,
    keepClear,
    camera: {
      position: [...value.camera.position],
      target: [...value.camera.target],
      verticalFovDeg: value.camera.verticalFovDeg,
    },
    hdrAssetId: value.hdrAssetId ?? null,
    clearanceMetres,
  };
}

export function sceneHash(project) {
  const s = project.scene3d;
  return fingerprint({
    scene: s ?? null,
    reconstructionInputHash: physicalHash(project, "venue_reconstruction"),
    references: [s?.geometryAssetId, s?.hdrAssetId]
      .filter(Boolean)
      .map((assetId) => {
        const a = project.assets.find((x) => x.id === assetId);
        return a
          ? {
              id: a.id,
              sha256: a.sha256,
              status: a.status,
              sourcePhysicalHash: a.sourcePhysicalHash,
            }
          : null;
      }),
    hdrInputHash: s?.hdrAssetId ? physicalHash(project, "hdr_merge") : null,
    components: (s?.placements ?? []).map((p) => {
      const c = project.components.find((x) => x.id === p.componentId);
      const a = project.assets.find((x) => x.id === c?.masterAssetId);
      return c
        ? {
            id: c.id,
            hash: componentHash(c),
            master: c.masterAssetId,
            masterHash: a?.hash,
            masterStatus: a?.status,
          }
        : null;
    }),
  });
}

export function validateGeometry(data, requireSurface = false) {
  if (
    data?.formatVersion !== 1 ||
    !Array.isArray(data.vertices) ||
    data.vertices.length < 3 ||
    data.vertices.length > 75000 ||
    data.vertices.some((v) => !vec(v, 1e9)) ||
    !Array.isArray(data.faces) ||
    data.faces.length > 150000 ||
    data.faces.some(
      (f) =>
        !Array.isArray(f) ||
        f.length !== 3 ||
        f.some(
          (i) => !Number.isSafeInteger(i) || i < 0 || i >= data.vertices.length,
        ),
    ) ||
    (requireSurface && data.faces.length === 0) ||
    (data.cameraPoses !== undefined &&
      (!Array.isArray(data.cameraPoses) ||
        data.cameraPoses.length > 60 ||
        data.cameraPoses.some(
          (p) =>
            !p ||
            typeof p.name !== "string" ||
            p.name.length > 100 ||
            !vec(p.centre, 1e9),
        ))) ||
    (data.colors &&
      (!Array.isArray(data.colors) ||
        data.colors.length !== data.vertices.length ||
        data.colors.some((v) => !vec(v, 1) || v.some((n) => n < 0))))
  )
    fail(
      "INVALID_GEOMETRY",
      "A bounded finite reconstruction is required; scene viewpoints require dense surface triangles",
    );
  return data;
}

function footprint(p, d, margin) {
  const a = (p.rotationYDeg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, z]) => {
    const dx = x * (d.width / 2 + margin),
      dz = z * (d.depth / 2 + margin);
    return [p.position[0] + c * dx + s * dz, p.position[2] - s * dx + c * dz];
  });
}
function overlaps(a, b) {
  for (const polygon of [a, b])
    for (let i = 0; i < polygon.length; i++) {
      const edge = [
          polygon[(i + 1) % polygon.length][0] - polygon[i][0],
          polygon[(i + 1) % polygon.length][1] - polygon[i][1],
        ],
        axis = [-edge[1], edge[0]];
      const pa = a.map((p) => p[0] * axis[0] + p[1] * axis[1]),
        pb = b.map((p) => p[0] * axis[0] + p[1] * axis[1]);
      if (
        Math.max(...pa) <= Math.min(...pb) ||
        Math.max(...pb) <= Math.min(...pa)
      )
        return false;
    }
  return true;
}

export function prepareMeasuredScene(project, geometry) {
  validateGeometry(geometry, true);
  const scene = validateScene3d(project.scene3d, project);
  const at = (i) => {
    if (!geometry.vertices[i])
      fail(
        "INVALID_SCENE_REFERENCE",
        "A selected measurement/frame vertex is absent from this reconstruction",
      );
    return geometry.vertices[i];
  };
  const origin = at(scene.frame.originVertex),
    x = unit(sub(at(scene.frame.xAxisVertex), origin));
  const y = unit(cross(sub(at(scene.frame.planeVertex), origin), x)),
    z = unit(cross(x, y));
  const sourceDistance = length(
    sub(at(scene.scale.vertexA), at(scene.scale.vertexB)),
  );
  if (sourceDistance < 1e-8)
    fail("INVALID_SCENE_SCALE", "Scale reference vertices must be distinct");
  const factor = scene.scale.metres / sourceDistance;
  const transform = (v) => {
    const p = sub(v, origin);
    return [dot(p, x) * factor, dot(p, y) * factor, dot(p, z) * factor];
  };
  const vertices = geometry.vertices.map(transform);
  if (vertices.some((v) => !vec(v, 10000)))
    fail(
      "INVALID_SCENE_SCALE",
      "Scaled venue exceeds the ten-kilometre coordinate budget",
    );
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const v of vertices)
    for (let i = 0; i < 3; i++) {
      bounds.min[i] = Math.min(bounds.min[i], v[i]);
      bounds.max[i] = Math.max(bounds.max[i], v[i]);
    }
  const placements = scene.placements.map((p) => ({
    ...p,
    dimensions: project.components.find((c) => c.id === p.componentId)
      .dimensions,
    masterAssetId: project.components.find((c) => c.id === p.componentId)
      .masterAssetId,
    representation: "dimensioned_box_proxy",
  }));
  const footprints = placements.map((p) =>
    footprint(p, p.dimensions, scene.clearanceMetres / 2),
  );
  for (let i = 0; i < placements.length; i++) {
    if (
      footprints[i].some(
        ([x, z]) =>
          x < bounds.min[0] ||
          x > bounds.max[0] ||
          z < bounds.min[2] ||
          z > bounds.max[2],
      )
    )
      fail(
        "PLACEMENT_OUTSIDE_RECONSTRUCTION",
        "A component footprint exceeds reconstructed X/Z bounds",
      );
    for (let j = 0; j < i; j++)
      if (overlaps(footprints[i], footprints[j]))
        fail("SCENE_COMPONENT_COLLISION", "Component proxy clearances overlap");
    for (const zone of scene.keepClear)
      if (
        overlaps(footprints[i], [
          [zone.min[0], zone.min[1]],
          [zone.max[0], zone.min[1]],
          [zone.max[0], zone.max[1]],
          [zone.min[0], zone.max[1]],
        ])
      )
        fail(
          "SCENE_KEEP_CLEAR_CONFLICT",
          "A proxy overlaps a protected clearance zone",
        );
  }
  return {
    formatVersion: 1,
    kind: "measured_scene",
    vertices,
    colors: geometry.colors,
    faces: geometry.faces,
    units: "metres",
    bounds,
    placements,
    camera: scene.camera,
    cameraPoses: (geometry.cameraPoses ?? []).map((p) => ({
      name: p.name,
      centre: transform(p.centre),
    })),
    manifest: {
      sourceSceneHash: sceneHash(project),
      geometryAssetId: scene.geometryAssetId,
      frame: scene.frame,
      scale: scene.scale,
      measurementIndependentlyVerified: false,
      reconstructedGeometry: true,
      accuracyVerified: false,
      textured: false,
      decorationRepresentation: "dimensioned_box_proxies",
      geometryCollisionCertified: false,
      lighting: "flat_colour_preview",
      hdrReferenceAssetId: scene.hdrAssetId,
      hdrUsedForPreviewLighting: false,
      warning:
        "Geometric preview of a reconstruction and measured proxies; inspect holes, scale, floor alignment and viewpoints against held-out site images. It is not a photoreal render or a construction/safety certificate.",
    },
  };
}

export function proxyGeometry(p) {
  const d = p.dimensions,
    a = (p.rotationYDeg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const vertices = [
    [-1, 0, -1],
    [1, 0, -1],
    [1, 0, 1],
    [-1, 0, 1],
    [-1, 1, -1],
    [1, 1, -1],
    [1, 1, 1],
    [-1, 1, 1],
  ].map(([x, y, z]) => [
    p.position[0] + (c * x * d.width) / 2 + (s * z * d.depth) / 2,
    p.position[1] + y * d.height,
    p.position[2] - (s * x * d.width) / 2 + (c * z * d.depth) / 2,
  ]);
  return {
    vertices,
    colors: vertices.map(() => [0.76, 0.55, 0.23]),
    faces: [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [1, 2, 6],
      [1, 6, 5],
      [2, 3, 7],
      [2, 7, 6],
      [3, 0, 4],
      [3, 4, 7],
    ],
  };
}

function cameraRotation(camera) {
  const back = unit(sub(camera.position, camera.target)),
    hint = Math.abs(back[1]) > 0.999 ? [0, 0, -1] : [0, 1, 0],
    right = unit(cross(hint, back)),
    up = cross(back, right);
  const m = [
    right[0],
    up[0],
    back[0],
    right[1],
    up[1],
    back[1],
    right[2],
    up[2],
    back[2],
  ];
  const trace = m[0] + m[4] + m[8];
  let q;
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    q = [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4];
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]);
    q = [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s];
  } else if (m[4] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]);
    q = [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]);
    q = [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s];
  }
  return q;
}

export function geometryGlb(data) {
  validateGeometry(data);
  const groups = [
    { ...data, name: "Reconstructed venue" },
    ...(data.placements ?? []).map((p) => ({
      ...proxyGeometry(p),
      name: p.id,
      extras: {
        componentId: p.componentId,
        masterAssetId: p.masterAssetId,
        representation: p.representation,
      },
    })),
  ];
  const binary = [],
    views = [],
    accessors = [],
    meshes = [],
    nodes = [];
  let offset = 0;
  const append = (buffer, type, count, min, max, target) => {
    const index = views.length;
    views.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: buffer.length,
      target,
    });
    binary.push(buffer);
    offset += buffer.length;
    const accessor = accessors.length;
    accessors.push({
      bufferView: index,
      componentType: type === "SCALAR" ? 5125 : 5126,
      count,
      type,
      ...(min ? { min, max } : {}),
    });
    return accessor;
  };
  for (const g of groups) {
    const low = [Infinity, Infinity, Infinity],
      high = [-Infinity, -Infinity, -Infinity];
    for (const v of g.vertices)
      for (let i = 0; i < 3; i++) {
        low[i] = Math.min(low[i], v[i]);
        high[i] = Math.max(high[i], v[i]);
      }
    const positions = append(
      Buffer.from(new Float32Array(g.vertices.flat()).buffer),
      "VEC3",
      g.vertices.length,
      low,
      high,
      34962,
    );
    const colors = append(
      Buffer.from(
        new Float32Array(
          (g.colors ?? g.vertices.map(() => [0.65, 0.68, 0.7])).flat(),
        ).buffer,
      ),
      "VEC3",
      g.vertices.length,
      null,
      null,
      34962,
    );
    const primitive = {
      attributes: { POSITION: positions, COLOR_0: colors },
      mode: g.faces.length ? 4 : 0,
      material: 0,
    };
    if (g.faces.length)
      primitive.indices = append(
        Buffer.from(new Uint32Array(g.faces.flat()).buffer),
        "SCALAR",
        g.faces.length * 3,
        null,
        null,
        34963,
      );
    meshes.push({ primitives: [primitive] });
    nodes.push({
      mesh: meshes.length - 1,
      name: g.name,
      ...(g.extras ? { extras: g.extras } : {}),
    });
  }
  const document = {
    asset: { version: "2.0", generator: "LoversAI physical venue pipeline" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials: [
      {
        doubleSided: true,
        extensions: { KHR_materials_unlit: {} },
        pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 },
      },
    ],
    buffers: [{ byteLength: offset }],
    bufferViews: views,
    accessors,
    extras: data.manifest ?? {
      reconstructedGeometry: true,
      units: "arbitrary",
      metricScaleVerified: false,
      textured: false,
    },
  };
  if (data.camera) {
    document.cameras = [
      {
        type: "perspective",
        perspective: {
          yfov: (data.camera.verticalFovDeg * Math.PI) / 180,
          aspectRatio: 16 / 9,
          znear: 0.05,
          zfar: 10000,
        },
      },
    ];
    document.nodes.push({
      camera: 0,
      translation: data.camera.position,
      rotation: cameraRotation(data.camera),
      name: "Configured scene viewpoint",
    });
    document.scenes[0].nodes.push(document.nodes.length - 1);
  }
  const raw = Buffer.from(JSON.stringify(document)),
    json = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 0x20);
  raw.copy(json);
  const bin = Buffer.concat(binary),
    length = 12 + 8 + json.length + 8 + bin.length;
  if (length > 24 * 1024 * 1024)
    fail("SCENE_ASSET_LIMIT", "Scene GLB exceeds the private asset budget");
  const header = Buffer.alloc(12),
    jh = Buffer.alloc(8),
    bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(length, 8);
  jh.writeUInt32LE(json.length);
  jh.writeUInt32LE(0x4e4f534a, 4);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, bh, bin]);
}
