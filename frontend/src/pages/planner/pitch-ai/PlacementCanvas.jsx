import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAssetUrl } from "./AssetImage";

// Draws the base image with polygons; click adds a normalized [x,y] point to the active layer.
export default function PlacementCanvas({ projectId, assetId, layers, activeLayer, onAddPoint, disabled }) {
  const { url, error } = useAssetUrl(projectId, assetId);
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setImg(null);
    if (!url) return undefined;
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => {
      image.onload = null;
    };
  }, [url]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img || !width) return;
    const dpr = window.devicePixelRatio || 1;
    const height = Math.round((width * img.naturalHeight) / img.naturalWidth);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(img, 0, 0, width, height);
    for (const layer of layers) {
      const pts = layer.points.map(([x, y]) => [x * width, y * height]);
      if (!pts.length) continue;
      const keepClear = layer.action === "keep_clear";
      const active = layer.key === activeLayer;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (pts.length >= 3) ctx.closePath();
      ctx.setLineDash(keepClear ? [6, 4] : []);
      ctx.lineWidth = active ? 2 : 1.5;
      ctx.strokeStyle = keepClear ? "rgba(255,255,255,0.85)" : "#ffffff";
      ctx.fillStyle = keepClear ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.22)";
      if (pts.length >= 3) ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      pts.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, active ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = keepClear ? "#000" : "#fff";
        ctx.fill();
        ctx.strokeStyle = keepClear ? "#fff" : "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      if (layer.label && pts.length) {
        const [lx, ly] = pts[0];
        ctx.font = "11px system-ui, sans-serif";
        const w = ctx.measureText(layer.label).width + 8;
        ctx.fillStyle = "#000";
        ctx.fillRect(lx + 6, ly - 18, w, 16);
        ctx.fillStyle = "#fff";
        ctx.fillText(layer.label, lx + 10, ly - 6);
      }
    }
  }, [img, width, layers, activeLayer]);

  useEffect(draw, [draw]);

  const onClick = (e) => {
    if (disabled || !img) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const x = clamp((e.clientX - rect.left) / rect.width);
    const y = clamp((e.clientY - rect.top) / rect.height);
    onAddPoint([Number(x.toFixed(4)), Number(y.toFixed(4))]);
  };

  return (
    <div ref={wrapRef} className="w-full">
      {error ? (
        <div className="flex aspect-[4/3] items-center justify-center bg-[#0a0a0a] text-xs text-white/40">
          Base image unavailable
        </div>
      ) : !img ? (
        <div className="aspect-[4/3] animate-pulse bg-[#111]" />
      ) : (
        <canvas
          ref={canvasRef}
          onClick={onClick}
          className={`block touch-manipulation ${disabled ? "cursor-not-allowed" : "cursor-crosshair"}`}
        />
      )}
    </div>
  );
}
