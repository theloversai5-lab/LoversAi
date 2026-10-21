"""Local-only LDR stitching; no downloads, generative fill or HDR claims."""
import json
import sys
from pathlib import Path
import cv2
import numpy as np

cv2.setNumThreads(2)

class CaptureFailure(ValueError):
    def __init__(self, message, diagnostics=None):
        super().__init__(message)
        self.diagnostics = diagnostics


def overlap_diagnostics(images):
    orb = cv2.ORB_create(nfeatures=3500)
    features = [orb.detectAndCompute(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), None) for im in images]
    edges, pairs = [set() for _ in images], []
    for i, (ki, di) in enumerate(features):
        for j in range(i + 1, len(images)):
            kj, dj = features[j]
            row = {"from": i, "to": j, "matches": 0, "inliers": 0, "inlierRatio": 0, "connected": False}
            if di is not None and dj is not None:
                matches = cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(di, dj, k=2)
                good = [p[0] for p in matches if len(p) == 2 and p[0].distance < 0.7 * p[1].distance]
                row["matches"] = len(good)
                if len(good) >= 12:
                    h, mask = cv2.findHomography(np.float32([ki[m.queryIdx].pt for m in good]), np.float32([kj[m.trainIdx].pt for m in good]), cv2.RANSAC, 3.0)
                    if h is not None and mask is not None:
                        row["inliers"], row["inlierRatio"] = int(mask.sum()), round(float(mask.mean()), 4)
                        row["connected"] = row["inliers"] >= 12 and float(mask.mean()) >= 0.4
                        if row["connected"]:
                            edges[i].add(j)
                            edges[j].add(i)
            pairs.append(row)
    seen, pending = {0}, [0]
    while pending:
        for j in edges[pending.pop()] - seen:
            seen.add(j)
            pending.append(j)
    return {"connected": len(seen) == len(images), "featureCounts": [len(k) for k, _ in features], "pairs": pairs}


def connected(images):
    return overlap_diagnostics(images)["connected"]

def stitch(files, output):
    if not isinstance(files, list) or not 4 <= len(files) <= 5:
        raise ValueError("VENUE_VIEW_COUNT: Supply four or five approved venue views")
    images, inputs = [], []
    for index, filename in enumerate(files):
        p = Path(filename)
        if not p.is_file() or p.stat().st_size > 10 * 1024 * 1024:
            raise ValueError("INVALID_IMAGE: Missing or oversized image")
        # Server callers have already applied Sharp's decoded-pixel limit.
        image = cv2.imdecode(np.frombuffer(p.read_bytes(), dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None or image.size > 40_000_000 * 3:
            raise ValueError("INVALID_IMAGE: Cannot decode image within limits")
        original_height, original_width = image.shape[:2]
        if min(original_width, original_height) < 512:
            raise ValueError("IMAGE_TOO_SMALL: Ground captures must be at least 512 pixels on each side")
        scale = min(1.0, 1600 / max(image.shape[:2]))
        if scale < 1:
            image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        inputs.append({
            "index": index, "originalWidth": original_width, "originalHeight": original_height,
            "processingWidth": int(image.shape[1]), "processingHeight": int(image.shape[0]),
            "processingScale": round(scale, 6), "upsampled": False,
            "laplacianVariance": round(float(cv2.Laplacian(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()), 3),
        })
        images.append(image)
    diagnostics = {"inputs": inputs, "overlap": overlap_diagnostics(images), "alignmentAttempts": []}
    if not diagnostics["overlap"]["connected"]:
        raise CaptureFailure("OVERLAP_REQUIRED: Photos do not form a connected overlapping set; recapture from one position with adjacent overlap", diagnostics)
    result, projection, used = None, None, None
    for mode, name in [(cv2.Stitcher_PANORAMA, "spherical_panorama_crop"), (cv2.Stitcher_SCANS, "planar_mosaic")]:
        worker = cv2.Stitcher_create(mode)
        worker.setPanoConfidenceThresh(0.4)
        status = worker.estimateTransform(images)
        attempt = {"projection": name, "estimateStatus": int(status)}
        diagnostics["alignmentAttempts"].append(attempt)
        if status != cv2.Stitcher_OK:
            continue
        indices = list(map(int, worker.component()))
        attempt["usedInputIndices"] = indices
        if len(indices) != len(images) or set(indices) != set(range(len(images))):
            continue
        status, pano = worker.composePanorama()
        attempt["composeStatus"] = int(status)
        if status == cv2.Stitcher_OK and pano is not None:
            result, projection, used = pano, name, indices
            break
    if result is None:
        raise CaptureFailure("STITCH_FAILED: Alignment failed or excluded a view; capture more overlapping photos without moving the camera position", diagnostics)
    if result.shape[0] * result.shape[1] > 24_000_000:
        raise ValueError("OUTPUT_TOO_LARGE: Panorama exceeds 24 MP")
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output), result, [cv2.IMWRITE_JPEG_QUALITY, 94]):
        raise ValueError("STITCH_WRITE_FAILED")
    # Real shadows/night scenery can be dark: this statistic is not a coverage mask.
    diagnostics["output"] = {
        "width": int(result.shape[1]), "height": int(result.shape[0]),
        "nearBlackPixelFraction": round(float(np.mean(np.max(result, axis=2) < 8)), 4),
        "nearBlackIsCoverageEstimate": False, "seamsRequireHumanReview": True,
    }
    return {
        "width": int(result.shape[1]), "height": int(result.shape[0]), "projection": projection,
        "trueHdri": False, "coverage": "partial_or_unknown", "usedInputIndices": used,
        "diagnostics": diagnostics,
        "warnings": [
            "LDR photographs; no radiometric HDR or reconstructed geometry",
            "Missing coverage is not synthesized",
            "Stitched image may retain seams, parallax or uncovered pixels; review before approval",
            "Feature inliers and sharpness statistics are diagnostics, not proof of fidelity or measured coverage",
        ],
    }


if __name__ == "__main__":
    try:
        request = json.loads(sys.stdin.read(32768))
        print(json.dumps(stitch(request["files"], request["output"])))
    except Exception as exc:
        print(json.dumps({"error": str(exc)[:1000], "diagnostics": getattr(exc, "diagnostics", None)}))
        sys.exit(1)
