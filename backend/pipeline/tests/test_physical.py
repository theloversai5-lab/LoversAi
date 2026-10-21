import json
from pathlib import Path
import sys
import tempfile
import unittest
import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from physical import calibrate, hdr
from render_scene import render
from physical_fixtures import make_fixtures


class PhysicalTests(unittest.TestCase):
    def test_calibration_recovers_known_synthetic_intrinsics(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture = make_fixtures(root)
            meta = calibrate({"files": fixture["calibration"], "recipe": {
                "columns": 9, "rows": 6, "squareSizeMetres": .04, "cameraId": "synthetic-fixed-camera"}}, root)
            actual = json.loads((root / "calibration.json").read_text())
            self.assertLess(meta["rmsPixels"], .5)
            self.assertTrue(np.allclose(np.array(actual["cameraMatrix"])[[0, 1], [0, 1]], [1100, 1100], rtol=.05))
            self.assertFalse(actual["absoluteSiteScaleEstablished"])

    def test_hdr_decodes_float_radiance_and_rejects_reversed_shutter_times(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixture = make_fixtures(root)
            request = {"files": fixture["exposures"], "recipe": {"exposureSeconds": fixture["exposureSeconds"]}}
            meta = hdr(request, root)
            decoded = cv2.imread(str(root / "radiance.hdr"), cv2.IMREAD_UNCHANGED)
            self.assertEqual(decoded.dtype, np.float32)
            self.assertTrue(np.isfinite(decoded).all())
            self.assertGreater(float(decoded.max()), float(np.median(decoded)))
            self.assertTrue(meta["trueHdr"])
            self.assertFalse(meta["trueHdri"])
            request["recipe"]["exposureSeconds"] = list(reversed(fixture["exposureSeconds"]))
            with self.assertRaisesRegex(ValueError, "HDR_EXPOSURE_MISMATCH"):
                hdr(request, root)

    def test_integer_camera_and_overhead_view_render_actual_geometry(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            scene = {"camera": {"position": [0, 8, 0], "target": [0, 0, 0], "verticalFovDeg": 60},
                     "groups": [{"vertices": [[-5, 0, -5], [5, 0, -5], [5, 0, 5], [-5, 0, 5]],
                                 "faces": [[0, 1, 2], [0, 2, 3]], "colors": [[.2, .5, .2]]*4}]}
            source = root / "scene.json"
            source.write_text(json.dumps(scene), encoding="utf8")
            meta = render({"root": str(root), "sceneFile": str(source)})
            decoded = cv2.imread(str(root / "scene-preview.jpg"))
            self.assertEqual(decoded.shape[:2], (720, 1280))
            self.assertGreater(meta["trianglesRasterized"], 0)
            self.assertFalse(meta["accuracyVerified"])


if __name__ == "__main__":
    unittest.main()
