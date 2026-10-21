import React, { useEffect, useState } from "react";
import { pipelineAPI } from "../../../api/pipelineApi";

// Assets are immutable by id, so object URLs are cached until the project changes.
const cache = new Map();

export function clearAssetCache() {
  cache.forEach((entry) => entry.then((url) => url && URL.revokeObjectURL(url)).catch(() => {}));
  cache.clear();
}

export function loadAssetUrl(projectId, assetId) {
  const key = `${projectId}:${assetId}`;
  if (!cache.has(key)) {
    const p = pipelineAPI
      .assetBlob(projectId, assetId)
      .then((blob) => URL.createObjectURL(blob))
      .catch((e) => {
        cache.delete(key);
        throw e;
      });
    cache.set(key, p);
  }
  return cache.get(key);
}

export function useAssetUrl(projectId, assetId) {
  const [state, setState] = useState({ url: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ url: null, error: null });
    if (!projectId || !assetId) return undefined;
    loadAssetUrl(projectId, assetId)
      .then((url) => alive && setState({ url, error: null }))
      .catch((error) => alive && setState({ url: null, error }));
    return () => {
      alive = false;
    };
  }, [projectId, assetId]);
  return state;
}

export default function AssetImage({ projectId, assetId, alt = "", className = "" }) {
  const { url, error } = useAssetUrl(projectId, assetId);
  if (error)
    return (
      <div className={`flex items-center justify-center bg-[#0a0a0a] text-[11px] text-white/40 ${className}`}>
        Image unavailable
      </div>
    );
  if (!url) return <div className={`animate-pulse bg-[#111] ${className}`} />;
  return <img src={url} alt={alt} className={`object-contain ${className}`} />;
}

export async function downloadAsset(projectId, asset) {
  const url = await loadAssetUrl(projectId, asset.id);
  const ext = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" }[asset.mimeType] || "";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${asset.kind}-${asset.id}${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
