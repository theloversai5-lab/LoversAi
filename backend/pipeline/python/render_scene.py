"""Deterministic geometric preview; no generative fill, textures or HDR lighting claims."""
import json
import math
import sys
from pathlib import Path
import cv2
import numpy as np

cv2.setNumThreads(2)


def render(request):
    root = Path(request["root"])
    scene = json.loads(Path(request["sceneFile"]).read_text(encoding="utf8"))
    camera = scene["camera"]
    position, target = np.array(camera["position"], dtype=np.float64), np.array(camera["target"], dtype=np.float64)
    forward = target - position
    forward /= np.linalg.norm(forward)
    right = np.cross(forward, [0, 0, -1] if abs(forward[1]) > 0.999 else [0, 1, 0])
    if np.linalg.norm(right) < 1e-8:
        raise ValueError("CAMERA_UP_AXIS_SINGULAR")
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    width, height = 1280, 720
    focal = height / (2 * math.tan(math.radians(camera["verticalFovDeg"]) / 2))
    image = np.full((height, width, 3), [230, 225, 220], np.uint8)
    depth = np.full((height, width), np.inf)
    triangles = 0
    for group in scene["groups"]:
        vertices = np.array(group["vertices"], dtype=np.float64) - position
        camera_vertices = np.stack([vertices @ right, -vertices @ up, vertices @ forward], axis=1)
        colors = np.array(group.get("colors") or [[0.65, 0.68, 0.7]] * len(vertices), dtype=float)
        for face in group["faces"]:
            v = camera_vertices[face]
            if np.any(v[:, 2] < 0.05) or np.any(v[:, 2] > 10000):
                continue  # Near-plane intersections need another viewpoint; do not invent hidden pixels.
            screen = v[:, :2] * (focal / v[:, 2, None]) + [width / 2, height / 2]
            x0, y0 = np.maximum(np.floor(screen.min(axis=0)).astype(int), [0, 0])
            x1, y1 = np.minimum(np.ceil(screen.max(axis=0)).astype(int), [width-1, height-1])
            if x0 > x1 or y0 > y1:
                continue
            a, b, c = screen
            denominator = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
            if abs(denominator) < 1e-6:
                continue
            yy, xx = np.mgrid[y0:y1+1, x0:x1+1]
            xx, yy = xx + 0.5, yy + 0.5
            w0 = ((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/denominator
            w1 = ((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/denominator
            w2 = 1-w0-w1
            inverse_depth = w0/v[0,2]+w1/v[1,2]+w2/v[2,2]
            valid = (w0 >= 0) & (w1 >= 0) & (w2 >= 0) & (inverse_depth > 0)
            z = np.full_like(inverse_depth, np.inf)
            np.divide(1, inverse_depth, out=z, where=inverse_depth > 0)
            region = depth[y0:y1+1,x0:x1+1]
            valid &= z < region
            if not np.any(valid):
                continue
            color = (w0[...,None]*colors[face[0]]/v[0,2]+w1[...,None]*colors[face[1]]/v[1,2]+w2[...,None]*colors[face[2]]/v[2,2])
            np.divide(color, inverse_depth[...,None], out=color, where=inverse_depth[...,None] > 0)
            region[valid] = z[valid]
            image[y0:y1+1,x0:x1+1][valid] = (np.clip(color[valid],0,1)*255).astype(np.uint8)[:,::-1]
            triangles += 1
    if triangles == 0:
        raise ValueError("EMPTY_SCENE_VIEW: No reconstructed surfaces are visible from this camera")
    cv2.putText(image, "Venue geometry and decoration proxies", (20, height-24), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (45,45,45), 2, cv2.LINE_AA)
    if not cv2.imwrite(str(root / "scene-preview.jpg"), image, [cv2.IMWRITE_JPEG_QUALITY, 92]):
        raise ValueError("SCENE_PREVIEW_WRITE_FAILED")
    return {"width": width, "height": height, "trianglesRasterized": triangles, "textured": False,
            "hdrLightingApplied": False, "coverageCertified": False, "accuracyVerified": False}


if __name__ == "__main__":
    try:
        print(json.dumps({"metadata": render(json.loads(sys.stdin.read(131072)))}, allow_nan=False))
    except Exception:
        print(json.dumps({"error": "SCENE_RENDER_FAILED"}))
        sys.exit(1)
