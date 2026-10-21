import importlib.util
from pathlib import Path
import tempfile
import unittest
import cv2
import numpy as np

script=Path(__file__).resolve().parents[1]/'python'/'stitch.py'
spec=importlib.util.spec_from_file_location('stitch',script)
stitch=importlib.util.module_from_spec(spec)
spec.loader.exec_module(stitch)

class StitchTests(unittest.TestCase):
    def test_overlapping_venue_views_produce_real_ldr_pixels(self):
        rng=np.random.default_rng(17)
        scene=rng.integers(0,256,(700,2400,3),dtype=np.uint8)
        scene=cv2.GaussianBlur(scene,(3,3),0)
        for i in range(180):
            x,y=map(int,rng.integers([20,20],[2380,680]))
            cv2.circle(scene,(x,y),int(rng.integers(4,20)),(255,40,20),-1)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            files=[]
            for i in range(5):
                p=root/f'{i}.jpg';cv2.imwrite(str(p),scene[:,i*350:i*350+900]);files.append(str(p))
            result=stitch.stitch(files,str(root/'pano.jpg'))
            self.assertFalse(result['trueHdri'])
            self.assertEqual(len(result['usedInputIndices']),5)
            self.assertGreater(result['width'],1200)
            self.assertTrue((root/'pano.jpg').is_file())

    def test_unrelated_or_blank_images_require_recapture(self):
        with tempfile.TemporaryDirectory() as tmp:
            files=[]
            for i in range(4):
                p=Path(tmp)/f'{i}.jpg';cv2.imwrite(str(p),np.full((600,900,3),i*50,np.uint8));files.append(str(p))
            with self.assertRaisesRegex(ValueError,'OVERLAP_REQUIRED'):
                stitch.stitch(files,str(Path(tmp)/'out.jpg'))

if __name__=='__main__': unittest.main()
