"""Owned local calibration/HDR jobs. Inputs are normalized project assets, never URLs."""
import json
import math
import sys
from pathlib import Path
import cv2
import numpy as np

cv2.setNumThreads(2)


def image(filename):
    file = Path(filename)
    if not file.is_file() or file.stat().st_size > 24 * 1024 * 1024:
        raise ValueError("PHYSICAL_IMAGE_LIMIT")
    value = cv2.imdecode(np.frombuffer(file.read_bytes(), dtype=np.uint8), cv2.IMREAD_COLOR)
    if value is None or value.shape[0] * value.shape[1] > 16_777_216:
        raise ValueError("PHYSICAL_IMAGE_INVALID")
    return value


def write_json(file, value):
    Path(file).write_text(json.dumps(value, allow_nan=False), encoding="utf8")


def calibrate(request, root):
    c = request["recipe"]
    pattern = (int(c["columns"]), int(c["rows"]))
    obj = np.zeros((pattern[0] * pattern[1], 3), np.float32)
    obj[:, :2] = np.mgrid[0:pattern[0], 0:pattern[1]].T.reshape(-1, 2) * c["squareSizeMetres"]
    objects, corners, footprints = [], [], []
    size = None
    for filename in request["files"]:
        gray = cv2.cvtColor(image(filename), cv2.COLOR_BGR2GRAY)
        current = (gray.shape[1], gray.shape[0])
        if size is not None and size != current:
            raise ValueError("CALIBRATION_DIMENSIONS_MISMATCH")
        size = current
        ok, points = cv2.findChessboardCornersSB(gray, pattern, flags=cv2.CALIB_CB_NORMALIZE_IMAGE)
        if not ok:
            raise ValueError("CHECKERBOARD_NOT_DETECTED: Every selected calibration view must contain the full board")
        objects.append(obj.copy())
        corners.append(points.astype(np.float32))
        xy = points.reshape(-1, 2)
        footprints.append({"centre": (xy.mean(axis=0) / np.array(size)).tolist(), "areaFraction": float(np.prod(xy.max(axis=0) - xy.min(axis=0)) / np.prod(size))})
    centres = np.array([r["centre"] for r in footprints])
    if len(corners) < 8 or np.max(np.ptp(centres, axis=0)) < 0.15:
        raise ValueError("CALIBRATION_COVERAGE_REQUIRED: Move and tilt the checkerboard across the image field")
    rms, matrix, distortion, rotations, translations = cv2.calibrateCamera(objects, corners, size, None, None)
    errors = []
    for i in range(len(corners)):
        projected, _ = cv2.projectPoints(objects[i], rotations[i], translations[i], matrix, distortion)
        errors.append(float(np.sqrt(np.mean(np.sum((projected - corners[i]) ** 2, axis=2)))))
    if (not np.isfinite(matrix).all() or not np.isfinite(distortion).all() or not math.isfinite(rms)
            or rms > 1.5 or max(errors) > 2.5 or not 0.2 * size[0] < matrix[0, 0] < 10 * size[0]
            or not 0.2 * size[1] < matrix[1, 1] < 10 * size[1]
            or not 0 <= matrix[0, 2] <= size[0] or not 0 <= matrix[1, 2] <= size[1]):
        raise ValueError("CALIBRATION_ERROR_TOO_HIGH: Recapture sharper, varied board poses")
    report = {"formatVersion": 1, "kind": "camera_calibration", "cameraId": c["cameraId"], "width": size[0], "height": size[1],
              "cameraMatrix": matrix.tolist(), "distortion": distortion.ravel().tolist(), "rmsPixels": float(rms),
              "perViewRmsPixels": errors, "boardFootprints": footprints, "squareSizeMetres": c["squareSizeMetres"],
              "absoluteSiteScaleEstablished": False, "operatorCameraIdentityVerified": False}
    write_json(root / "calibration.json", report)
    return {"width": size[0], "height": size[1], "cameraId": c["cameraId"], "rmsPixels": float(rms)}


def hdr(request, root):
    c = request["recipe"]
    exposures = np.array(c["exposureSeconds"], dtype=np.float32)
    frames, medians, clipping = [], [], []
    original_size = None
    scale = None
    for filename in request["files"]:
        im = image(filename)
        size = (im.shape[1], im.shape[0])
        if original_size is not None and size != original_size:
            raise ValueError("HDR_DIMENSIONS_MISMATCH")
        original_size = size
        scale = min(1.0, 2048 / max(size), math.sqrt(3_000_000 / (size[0] * size[1])))
        if scale < 1:
            im = cv2.resize(im, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        medians.append(float(np.median(gray)))
        clipping.append({"blackFraction": float(np.mean(gray < 3)), "whiteFraction": float(np.mean(gray > 252))})
        frames.append(im)
    correlation = float(np.corrcoef(np.log(exposures), medians)[0, 1])
    if not math.isfinite(correlation) or correlation < 0.7:
        raise ValueError("HDR_EXPOSURE_MISMATCH: Image brightness does not follow the declared shutter times")
    aligned = [im.copy() for im in frames]
    cv2.createAlignMTB(6, 4, False).process(frames, aligned)
    response = cv2.createCalibrateDebevec().process(aligned, times=exposures)
    radiance = cv2.createMergeDebevec().process(aligned, times=exposures, response=response)
    if not np.isfinite(radiance).all() or np.min(radiance) < 0 or np.max(radiance) <= 0:
        raise ValueError("HDR_NONFINITE_RADIANCE")
    if not cv2.imwrite(str(root / "radiance.hdr"), radiance):
        raise ValueError("HDR_WRITE_FAILED")
    decoded = cv2.imread(str(root / "radiance.hdr"), cv2.IMREAD_UNCHANGED)
    if decoded is None or decoded.dtype != np.float32 or decoded.shape != radiance.shape or not np.isfinite(decoded).all():
        raise ValueError("HDR_ROUNDTRIP_FAILED")
    preview = cv2.createTonemapReinhard(1.0, 0, 1, 0).process(radiance.copy())
    preview = (np.clip(np.nan_to_num(preview), 0, 1) * 255).astype(np.uint8)
    if not cv2.imwrite(str(root / "preview.jpg"), preview, [cv2.IMWRITE_JPEG_QUALITY, 92]):
        raise ValueError("HDR_PREVIEW_WRITE_FAILED")
    luminance = cv2.cvtColor(radiance, cv2.COLOR_BGR2GRAY)
    positive = luminance[luminance > 0]
    p01, p99 = np.percentile(positive, [1, 99]).tolist()
    report = {"formatVersion": 1, "trueHdr": True, "trueHdri": False, "coverage": "single_view",
              "radianceUnits": "relative", "absoluteLuminanceCalibrated": False,
              "method": "Debevec camera response calibration and timed exposure merge", "storage": "Radiance RGBE",
              "width": int(radiance.shape[1]), "height": int(radiance.shape[0]), "sourceWidth": original_size[0], "sourceHeight": original_size[1],
              "processingScale": scale, "exposureSeconds": exposures.tolist(), "medianBrightness": medians, "clipping": clipping,
              "exposureBrightnessCorrelation": correlation, "luminancePercentiles": {"p01": p01, "p99": p99},
              "relativeDynamicRangeStopsP01P99": math.log2(p99 / max(p01, 1e-12)), "responseCurve": response.reshape(256, 3).tolist(),
              "ghostingAutomaticallyCertified": False, "full360CoverageVerified": False,
              "warnings": ["Relative radiance from processed photographs; no absolute light calibration", "Inspect alignment, ghosting and clipping", "This bracket does not establish a full spherical HDR lighting environment"]}
    write_json(root / "hdr-report.json", report)
    return {k: report[k] for k in ["width", "height", "trueHdr", "trueHdri", "coverage", "radianceUnits"]}


if __name__ == "__main__":
    try:
        request = json.loads(sys.stdin.read(131072))
        root = Path(request["root"])
        if request["operation"] == "lens_calibration":
            metadata = calibrate(request, root)
        elif request["operation"] == "hdr_merge":
            metadata = hdr(request, root)
        elif request["operation"] == "venue_reconstruction":
            from reconstruction import reconstruct
            metadata = reconstruct(request, root)
        else:
            raise ValueError("UNKNOWN_PHYSICAL_OPERATION")
        print(json.dumps({"metadata": metadata}, allow_nan=False))
    except Exception as exc:
        code = str(exc).split(":")[0]
        if not code.replace("_", "").isalnum() or len(code) > 80:
            code = "PHYSICAL_PROCESSING_FAILED"
        print(json.dumps({"error": code}))
        sys.exit(1)
