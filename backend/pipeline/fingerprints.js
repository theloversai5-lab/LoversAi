import { createHash } from "node:crypto";
export function canonical(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
    .join(",")}}`;
}
export const fingerprint = (value) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export function componentHash(component) {
  const { masterAssetId, ...spec } = component;
  return fingerprint(spec);
}
export function designHash(p) {
  const physicalIds = new Set([
    ...Object.values(p.physicalCapture ?? {}).flatMap((r) => r?.assetIds ?? []),
    p.physicalCapture?.reconstruction?.calibrationAssetId,
    p.scene3d?.geometryAssetId,
    p.scene3d?.hdrAssetId,
  ]);
  return fingerprint({
    brief: p.brief,
    components: p.components,
    canvas: p.canvas,
    ...(p.scene3d
      ? {
          scene3d: p.scene3d,
          physicalCapture: p.physicalCapture,
          physicalReferences: p.assets
            .filter((a) => physicalIds.has(a.id))
            .map((a) => ({
              id: a.id,
              hash: a.hash ?? a.sha256,
              status: a.status,
            })),
        }
      : {}),
    venueAssets: p.assets
      ?.filter((a) => a.kind === "venue" && a.status === "approved")
      .map((a) => ({ id: a.id, hash: a.hash })),
  });
}
