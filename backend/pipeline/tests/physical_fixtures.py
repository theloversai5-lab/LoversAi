"""Controlled mathematical fixtures; never evidence of a captured real venue."""
import json
from pathlib import Path
import cv2
import numpy as np


def make_fixtures(root):
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    matrix = np.array([[1100., 0., 640.], [0., 1100., 480.], [0., 0., 1.]])
    square = .04
    board = np.zeros((700, 1000), np.uint8)
    for row in range(7):
        for column in range(10):
            board[row*100:(row+1)*100, column*100:(column+1)*100] = 255 if (row+column) % 2 else 0
    corners = np.array([[-square, -square, 0], [9*square, -square, 0],
                        [9*square, 6*square, 0], [-square, 6*square, 0]], np.float32)
    calibration = []
    poses = [(-.28, -.16, 1., .1, -.15), (-.08, -.16, 1.05, -.18, .1),
             (-.26, .01, 1.15, .2, .12), (-.02, -.04, 1.1, -.12, -.2),
             (-.14, -.1, .9, .25, -.1), (-.3, -.02, 1.2, -.2, .2),
             (-.04, -.2, 1.2, .15, .25), (-.22, -.2, .95, -.15, -.18)]
    for i, (tx, ty, tz, rx, ry) in enumerate(poses):
        projected, _ = cv2.projectPoints(corners, np.array([rx, ry, .03*i]), np.array([tx, ty, tz]), matrix, np.zeros(5))
        homography = cv2.getPerspectiveTransform(np.array([[0, 0], [1000, 0], [1000, 700], [0, 700]], np.float32), projected.reshape(4, 2).astype(np.float32))
        image = cv2.warpPerspective(board, homography, (1280, 960), borderValue=210)
        image = cv2.GaussianBlur(image, (3, 3), .5)
        filename = root / f"calibration-{i}.jpg"
        if not cv2.imwrite(str(filename), image, [cv2.IMWRITE_JPEG_QUALITY, 96]):
            raise RuntimeError("Fixture write failed")
        calibration.append(str(filename.resolve()))
    yy, xx = np.mgrid[0:512, 0:640]
    light = .04 + 24*(xx/639)**2 + 3*(yy/511)
    light[120:270, 90:240] *= .05
    light[300:430, 440:570] *= 1.8
    radiance = np.stack([light*.7, light, light*.85], axis=2)
    exposures = [.01, .04, .16]
    brackets = []
    for i, shutter in enumerate(exposures):
        encoded = (255*np.power(np.clip(radiance*shutter, 0, 1), 1/2.2)).astype(np.uint8)
        filename = root / f"exposure-{i}.jpg"
        if not cv2.imwrite(str(filename), encoded, [cv2.IMWRITE_JPEG_QUALITY, 96]):
            raise RuntimeError("Fixture write failed")
        brackets.append(str(filename.resolve()))
    fixture = {"provenance": "synthetic_fixture", "realVenue": False,
               "calibration": calibration, "cameraMatrix": matrix.tolist(),
               "exposures": brackets, "exposureSeconds": exposures}
    (root / "fixture.json").write_text(json.dumps(fixture, indent=2), encoding="utf8")
    return fixture
