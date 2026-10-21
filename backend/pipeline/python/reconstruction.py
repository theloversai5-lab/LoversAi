"""Explicit COLMAP photogrammetry adapter. No network, shell or generated mesh fallback."""
import json
import os
import re
import struct
import subprocess
from pathlib import Path
import cv2
import numpy as np


def rotation(q):
    w, x, y, z = q
    return np.array([[1-2*y*y-2*z*z, 2*x*y-2*w*z, 2*x*z+2*w*y],
                     [2*x*y+2*w*z, 1-2*x*x-2*z*z, 2*y*z-2*w*x],
                     [2*x*z-2*w*y, 2*y*z+2*w*x, 1-2*x*x-2*y*y]], dtype=float)


def ply(file):
    if file.stat().st_size > 128 * 1024 * 1024:
        raise ValueError("RECONSTRUCTION_MESH_LIMIT")
    types = {"char": "b", "uchar": "B", "short": "h", "ushort": "H", "int": "i", "uint": "I", "float": "f", "double": "d",
             "int8": "b", "uint8": "B", "int16": "h", "uint16": "H", "int32": "i", "uint32": "I", "float32": "f", "float64": "d"}
    with file.open("rb") as f:
        if f.readline().strip() != b"ply":
            raise ValueError("INVALID_RECONSTRUCTION_PLY")
        elements, current, fmt = [], None, None
        for _ in range(256):
            line = f.readline().decode("ascii").strip().split()
            if not line:
                continue
            if line[0] == "format":
                fmt = line[1]
            elif line[0] == "element":
                current = {"name": line[1], "count": int(line[2]), "properties": []}
                if current["count"] < 0 or current["count"] > 500000:
                    raise ValueError("RECONSTRUCTION_MESH_LIMIT")
                elements.append(current)
            elif line[0] == "property":
                current["properties"].append(line[1:])
            elif line[0] == "end_header":
                break
        else:
            raise ValueError("INVALID_RECONSTRUCTION_PLY")
        if fmt not in ["ascii", "binary_little_endian", "binary_big_endian"]:
            raise ValueError("INVALID_RECONSTRUCTION_PLY")
        endian = "<" if fmt == "binary_little_endian" else ">"
        vertices, colors, faces = [], [], []
        for element in elements:
            for _ in range(element["count"]):
                values, tokens = {}, iter(f.readline().decode("ascii").split()) if fmt == "ascii" else None
                def scalar(kind):
                    if fmt == "ascii":
                        return float(next(tokens)) if types[kind] in ["f", "d"] else int(next(tokens))
                    code = types[kind]
                    return struct.unpack(endian + code, f.read(struct.calcsize(code)))[0]
                for prop in element["properties"]:
                    if prop[0] == "list":
                        count = scalar(prop[1])
                        if count < 0 or count > 64:
                            raise ValueError("INVALID_RECONSTRUCTION_FACE")
                        values[prop[3]] = [scalar(prop[2]) for _ in range(count)]
                    else:
                        values[prop[1]] = scalar(prop[0])
                if element["name"] == "vertex":
                    vertices.append([values[k] for k in ["x", "y", "z"]])
                    colors.append([values.get(k, 170) / 255.0 for k in ["red", "green", "blue"]])
                elif element["name"] == "face":
                    face = values.get("vertex_indices", values.get("vertex_index", []))
                    for i in range(1, len(face) - 1):
                        faces.append([face[0], face[i], face[i + 1]])
        if len(vertices) > 75000 or len(faces) > 150000 or not vertices or not faces:
            raise ValueError("RECONSTRUCTION_MESH_LIMIT")
        if any(any(i < 0 or i >= len(vertices) for i in face) for face in faces) or not np.isfinite(vertices).all():
            raise ValueError("INVALID_RECONSTRUCTION_MESH")
        return vertices, colors, faces


def reconstruct(request, root):
    executable = request["colmap"]
    if not executable or str(executable).lower().endswith((".bat", ".cmd", ".ps1")):
        raise ValueError("COLMAP_NATIVE_EXECUTABLE_REQUIRED")
    calibration = json.loads(Path(request["calibrationFile"]).read_text(encoding="utf8"))
    matrix = np.array(calibration["cameraMatrix"], dtype=float)
    distortion = np.array(calibration["distortion"], dtype=float)
    images, sparse, text = root / "images", root / "sparse", root / "sparse-text"
    for folder in [images, sparse, text]:
        folder.mkdir()
    for i, filename in enumerate(request["files"]):
        image = cv2.imread(filename)
        if image is None or (image.shape[1], image.shape[0]) != (calibration["width"], calibration["height"]):
            raise ValueError("CALIBRATION_DIMENSIONS_MISMATCH")
        corrected = cv2.undistort(image, matrix, distortion)
        if not cv2.imwrite(str(images / ("frame-%04d.jpg" % i)), corrected, [cv2.IMWRITE_JPEG_QUALITY, 94]):
            raise ValueError("RECONSTRUCTION_IMAGE_WRITE_FAILED")
    commands = []
    version_result = subprocess.run([executable, "-h"], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    timeout=10, shell=False, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    version_match = re.search(r"COLMAP\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)", version_result.stdout[:32768].decode("utf8", errors="replace"))
    version = version_match.group(1) if version_match else "unverified"
    def run(command, *args):
        with (root / "colmap.log").open("wb") as log:
            result = subprocess.run([executable, command, *map(str, args)], stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                    shell=False, timeout=600, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        commands.append(command)
        if result.returncode != 0:
            raise ValueError("COLMAP_COMMAND_FAILED_" + command.upper())
        if sum(p.stat().st_size for p in root.rglob("*") if p.is_file()) > 6 * 1024 ** 3:
            raise ValueError("RECONSTRUCTION_WORKSPACE_LIMIT")
    db = root / "database.db"
    intrinsics = ",".join(map(str, [matrix[0, 0], matrix[1, 1], matrix[0, 2], matrix[1, 2]]))
    run("feature_extractor", "--database_path", db, "--image_path", images,
        "--ImageReader.camera_model", "PINHOLE", "--ImageReader.single_camera", "1", "--ImageReader.camera_params", intrinsics,
        "--FeatureExtraction.use_gpu", "0", "--FeatureExtraction.num_threads", "2", "--FeatureExtraction.max_image_size", "2000")
    run("exhaustive_matcher", "--database_path", db, "--FeatureMatching.use_gpu", "0", "--FeatureMatching.num_threads", "2")
    run("mapper", "--database_path", db, "--image_path", images, "--output_path", sparse,
        "--Mapper.ba_refine_focal_length", "0", "--Mapper.ba_refine_principal_point", "0", "--Mapper.ba_refine_extra_params", "0")
    models = [p for p in sparse.iterdir() if p.is_dir() and (p / "images.bin").is_file()]
    if len(models) != 1:
        raise ValueError("DISCONNECTED_RECONSTRUCTION: Capture one connected venue set")
    run("model_converter", "--input_path", models[0], "--output_path", text, "--output_type", "TXT")
    poses = []
    with (text / "images.txt").open(encoding="utf8") as f:
        for line in f:
            if not line.strip() or line.startswith("#"):
                continue
            tokens = line.split()
            r = rotation(list(map(float, tokens[1:5])))
            t = np.array(list(map(float, tokens[5:8])))
            poses.append({"name": tokens[9], "worldToCamera": r.tolist(), "translation": t.tolist(), "centre": (-r.T @ t).tolist()})
            next(f, "")  # Consume POINTS2D, including an empty line.
    expected = {"frame-%04d.jpg" % i for i in range(len(request["files"]))}
    if {p["name"] for p in poses} != expected:
        raise ValueError("UNREGISTERED_CAPTURE: Every selected image must register")
    vertices, colors, point_ids, errors = [], [], [], []
    for line in (text / "points3D.txt").read_text(encoding="utf8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        t = line.split()
        error = float(t[7])
        if error <= 2.5 and len(t[8:]) >= 6:
            point_ids.append(int(t[0])); vertices.append(list(map(float, t[1:4])))
            colors.append([int(v) / 255 for v in t[4:7]]); errors.append(error)
    if len(vertices) < 100 or len(vertices) > 75000:
        raise ValueError("RECONSTRUCTION_POINT_LIMIT")
    faces = []
    if request["recipe"]["quality"] == "dense":
        dense = root / "dense"
        dense.mkdir()
        run("image_undistorter", "--image_path", images, "--input_path", models[0], "--output_path", dense, "--output_type", "COLMAP", "--max_image_size", "1600")
        run("patch_match_stereo", "--workspace_path", dense, "--workspace_format", "COLMAP", "--PatchMatchStereo.geom_consistency", "true", "--PatchMatchStereo.cache_size", "2")
        run("stereo_fusion", "--workspace_path", dense, "--workspace_format", "COLMAP", "--input_type", "geometric", "--output_path", dense / "fused.ply", "--StereoFusion.cache_size", "2")
        run("poisson_mesher", "--input_path", dense / "fused.ply", "--output_path", dense / "mesh.ply")
        run("mesh_simplifier", "--input_path", dense / "mesh.ply", "--output_path", dense / "bounded-mesh.ply", "--MeshSimplification.target_face_ratio", "0.1")
        vertices, colors, faces = ply(dense / "bounded-mesh.ply")
        point_ids = None
    geometry = {"formatVersion": 1, "kind": "reconstructed_surface" if faces else "sparse_point_cloud", "vertices": vertices, "colors": colors, "faces": faces,
                "pointIds": point_ids, "cameraPoses": poses, "units": "arbitrary", "metricScaleVerified": False, "textured": False,
                "accuracyVerified": False, "holesMayExist": True, "reconstructedGeometry": True}
    (root / "geometry.json").write_text(json.dumps(geometry, allow_nan=False), encoding="utf8")
    report = {"formatVersion": 1, "engine": "COLMAP", "quality": request["recipe"]["quality"], "commands": commands,
              "engineVersion": version,
              "registeredImages": len(poses), "selectedImages": len(request["files"]), "sparseMeanReprojectionErrorPixels": float(np.mean(errors)),
              "vertices": len(vertices), "triangles": len(faces), "physicalScaleEstablished": False, "heldOutViewAccuracyVerified": False,
              "textured": False, "denseRequiresCompatibleHardware": True}
    (root / "reconstruction-report.json").write_text(json.dumps(report, allow_nan=False), encoding="utf8")
    return report
