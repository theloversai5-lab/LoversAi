# Physical venue capture, 3D scenes and Flow delivery

Backend implementation on `nevil-dev`; UI, billing and legacy auth are unchanged. Testing/live runs remain deferred by the user. No calibration, HDR merge, reconstruction, new scene render or actual Flow video has been executed to verify this implementation.

## What the paths produce

| Path | Implemented output | Accuracy boundary |
|---|---|---|
| Existing panorama | Aligned LDR JPEG and textured curved backdrop | Partial/unknown coverage; not radiance or measured geometry |
| Lens calibration | OpenCV checkerboard intrinsics, distortion and per-view errors | Operator camera identity and held-out lens accuracy not certified |
| HDR bracket | Debevec response estimate, timed floating-point radiance, RGBE `.hdr`, separate JPEG preview/report | Single view, relative radiance; not a certified spherical HDRI or absolute light measurement |
| Photogrammetry | Actual COLMAP sparse points/poses or dense simplified surface, report and GLB | Arbitrary units until a measured reference; surfaces may have holes, vertex colours may be approximate, no texture atlas |
| Measured scene | Metre-based geometry with box proxies tied to approved component masters, GLB, camera preview and manifest | Proxy shapes, not scanned decoration; preview is geometric, not photoreal or proof of site safety |
| Flow delivery | Approved reference ZIP, shot plan/checklist, optional scene GLB for planning; existing MP4 sanitation/contact-sheet/owner review | Manual Google Flow submission; actual Flow origin/execution/continuity still require live evidence |

Source implementations follow [OpenCV HDR](https://docs.opencv.org/4.12.0/d2/df0/tutorial_py_hdr.html), [COLMAP CLI](https://colmap.github.io/cli.html), [COLMAP output formats](https://colmap.github.io/format.html) and [Google Flow's supported creative workflow](https://support.google.com/flow/answer/16353334?hl=en). These references do not establish that a local executable, GPU, model/account access or an API integration has been tested here.

## Capture protocol

Keep panorama, calibration, HDR and reconstruction captures separate. Four/five rotating panorama photographs are not a sufficient photogrammetry/calibration/HDR dataset.

1. **Panorama:** a fixed camera origin and adjacent overlapping ground views, consistent lens/exposure and minimal scene movement. Keep aerial/satellite/detail views as context. Existing Phase 3 rules apply.
2. **Lens calibration:** 8–20 photographs of a printed measured checkerboard, full inner-corner pattern visible each time. Move/tilt it across the image field and change distance. Lock the camera, focal length, focus, stabilization/crop and working aperture. Capture with the same processed orientation/resolution used for reconstruction. Record inner columns/rows and actual square size in metres. Every selected view must detect; centre coverage and fitted error gates must pass. Inspect distortion and use independent validation images before production.
3. **HDR:** 3–7 aligned tripod photographs of the same static view at different known shutter times, spanning at least two stops. Lock ISO, aperture, white balance, camera/lens/focus and image processing. Record shutter times in seconds in the same order as asset IDs. Avoid moving people/lights/wind-blown objects. Do not use auto-HDR exports, differently styled images, duplicated/re-exposed copies or AI-generated exposure variants as brackets. Inspect clipping, translation alignment and ghosting. Input declarations are operator-supplied; normalization strips EXIF, so the server does not independently authenticate ISO/shutter metadata.
4. **Photogrammetry:** 12–60 well-overlapping photographs taken while moving around the venue, with useful translational parallax, varied elevations and visible stable landmarks. Keep lens/focus/crop/resolution consistent with calibration. Avoid only rotating from the centre, large moving crowds, reflective surfaces and textureless regions. Include independently measurable stable site features. Capture held-out photographs for later viewpoint/scale validation. Dense reconstruction needs a compatible native COLMAP build and stereo hardware/resources.
5. **Measured scene:** identify three noncollinear ground vertices to define the origin/X axis/ground plane and two reconstruction vertices with a tape/laser/survey distance. Record units and method. The frame/scale is operator evidence, not an independently surveyed result. Verify orientation, known dimensions and held-out site views. Component dimensions must be measured and entered before generating/approving their master sheets; changing the specification invalidates its old master.

JPEG/PNG/WebP inputs use existing real decoding, 512-pixel minimum side and private normalization (maximum 4096 edge); calibration must match the resulting image dimensions exactly. RAW/TIFF ingestion is not added. This HDR implementation estimates the response from processed brackets; it does not provide a RAW sensor or absolute radiometric calibration workflow. Source PDF illustrations are not suitable replacement capture/calibration sets.

## Input roles and access

Use the existing protected multipart upload route with `kind`, matching `views`, `revision` and batches of at most five files:

- `calibration_input`: local pattern-detection input, enters explicit owner `review` without semantic generation screening; cannot be used as a generic venue/decor reference.
- `exposure`: venue bracket photograph, enters semantic screening/review.
- `reconstruction_input`: photogrammetry venue photograph, enters semantic screening/review.

Use `detail` view labels for these non-panorama sets. They do not enter ground panorama selection or ordinary image-generation references. Owners must approve all selected inputs. Calibration-pattern review does not bypass the local calibration worker's detection/error gates. Existing byte/pixel/project limits and owner/member authentication remain active. Screening still processes at most five pending images per explicit job, and can invoke paid Gemini; it has not been run here.

## Physical capture API

`PATCH /api/wedding-pipeline/projects/PROJECT_ID/physical-capture` is owner-only and uses the current revision. Omitted sections are retained; explicit null clears a section. Example calibration/HDR declarations (replace sample IDs with actual project asset IDs):

```json
{
  "revision": 12,
  "capture": {
    "calibration": {"assetIds":["C1","C2","C3","C4","C5","C6","C7","C8"],"columns":9,"rows":6,"squareSizeMetres":0.025,"cameraId":"same-camera-35mm-locked-focus"},
    "hdr": {"assetIds":["E1","E2","E3"],"exposureSeconds":[0.004,0.016,0.064],"iso":100,"fNumber":8,"cameraId":"same-camera-35mm-locked-focus","whiteBalance":"locked","cameraPosition":"fixed","sceneMotion":"static"}
  }
}
```

`GET /projects/PROJECT_ID/physical-readiness` reports prerequisites without launching a native process. `ready_for_processing` does not verify Python/COLMAP installation, hardware, site accuracy or image alignment. No API key is passed to local compute processes.

Use the existing durable `POST /projects/PROJECT_ID/jobs` with empty options:

```json
{"revision":13,"requestKey":"calibration-capture-1","operation":"lens_calibration","options":{}}
```

Operations: `lens_calibration`, `hdr_merge`, `venue_reconstruction`, `scene_showcase`. They use immutable project snapshots, existing idempotency/leases and private assets. No automatic paid retry/fallback is added. Native processing checks worker ownership while running and terminates the owned process tree on ownership loss/timeout. Camera/HDR/render jobs have a five-minute wall limit; reconstruction has thirty minutes. COLMAP phases have bounded subprocess timeouts and a six-GiB workspace check between commands; production OS/container memory/disk limits remain necessary.

Calibration publishes `camera_calibration`. HDR publishes `hdr_radiance`, `hdr_preview`, `hdr_report`. HDR processing may downsample to at most 2048 edge/3 MP, records this scale, verifies float output and decodes the saved RGBE file; the JPEG is explicitly tone-mapped LDR. It does not rename ordinary JPEG pixels as HDR.

Approve the calibration result through the existing owner asset endpoint. Then patch reconstruction:

```json
{"revision":20,"capture":{"reconstruction":{"assetIds":["R1","R2","R3","R4","R5","R6","R7","R8","R9","R10","R11","R12"],"calibrationAssetId":"CALIBRATION_ID","quality":"dense","cameraId":"same-camera-35mm-locked-focus"}}}
```

Set `WEDDING_PIPELINE_COLMAP` to a native compatible executable (`colmap.exe` or native `colmap`), never a shell command, `.bat`/`.cmd` wrapper or download URL. CPU feature extraction/matching and pinned undistorted intrinsics precede mapper registration. Sparse mode exports actual triangulated points and poses; it cannot support a surface scene. Dense mode runs image undistortion, PatchMatch, fusion, Poisson meshing and simplification. The adapter targets the documented current CLI; incompatible flags, unavailable stereo hardware, disconnected models, omitted images or oversized output fail explicitly. No mesh is synthesized as a substitute. No COLMAP package/build has been installed or certified in this phase.

Reconstruction publishes `geometry_data` JSON, `geometry_report`, `venue_geometry` GLB. All selected photos must register. Sparse points use reprojection/track filters; these statistics are not held-out accuracy. Geometry is capped at 75,000 vertices/150,000 triangles; dense simplification is explicit and can lose detail. No UV texture atlas is generated. Approve the selected `geometry_data` before configuring a scene. Keep the project-wide 80-asset budget in mind across capture sets and output histories.

## Measured scene and viewpoints

Owner-only `PUT /projects/PROJECT_ID/scene3d`, with `revision` and `scene`:

```json
{
  "revision": 30,
  "scene": {
    "geometryAssetId":"GEOMETRY_DATA_ID",
    "frame":{"originVertex":0,"xAxisVertex":1,"planeVertex":2},
    "scale":{"vertexA":0,"vertexB":1,"metres":2.0,"method":"laser"},
    "placements":[{"id":"stage-main","componentId":"stage","position":[3,0,2],"rotationYDeg":0}],
    "keepClear":[{"id":"exit-route","min":[-2,-2],"max":[0,2]}],
    "camera":{"position":[0,8,12],"target":[0,0,0],"verticalFovDeg":45},
    "hdrAssetId":null,
    "clearanceMetres":0.5
  }
}
```

Vertex indices refer to the exact approved source geometry JSON; choose them from measured site evidence, not these example numbers. The frame uses the origin-to-X vector and a normal from `cross(plane-origin, X)`; select vertex order giving Y up. The derived system is right-handed Y-up in metres. Proxy position Y must be near the selected ground plane. Dimensions come from each approved component definition and boxes are anchored at their bases. The setter reads the actual geometry and rejects absent/degenerate references, out-of-bounds footprints, proxy/proxy clearance overlaps and protected-zone overlaps using oriented rectangle separation tests. It does not certify collisions with arbitrary venue triangles, load bearing, accessibility regulations or production safety.

`scene_showcase` creates `scene_glb`, `scene_preview` (1280×720 geometric JPEG) and `scene_manifest`. The CPU preview projects/rasterizes actual mesh triangles and proxy geometry with depth handling from the configured camera. Unknown/occluded/near-plane regions may remain absent; no AI fill is used. GLB embeds geometry, vertex colours, component/master identity and a viewing camera. It is untextured and does not apply the optional HDR as physical lighting. An HDR reference is retained/exported for a later lighting renderer. Accurate/photoreal viewpoint claims require later held-out measurements and visual verification.

`GET /projects/PROJECT_ID/scene3d` returns current configuration, bounds and preview freshness. Approve the scene GLB, preview and manifest individually after inspection. `POST /projects/PROJECT_ID/scene3d/SCENE_GLB_ID/package` with `{"revision":35}` exports the approved current scene, preview, scene metadata, source geometry, referenced component master images and optional approved radiance file with checksums, bounded to 64 MiB. A project revision is checked again after reading files. Source/capture/calibration/scale/placement/component changes invalidate dependent approval/export; history remains private and inspectable.

## Flow shot and delivery

Owner-only `PUT /projects/PROJECT_ID/flow-shot`:

```json
{"revision":36,"shot":{"motion":"gentle_orbit","durationSeconds":8,"angleDegrees":15,"travelMetres":1}}
```

Motions: static, gentle orbit, push-in, lateral dolly. Plans use eight seconds, up to 45° orbit/10 m travel and bounded eased speed. When a measured scene exists, the planner derives metre-based camera waypoints and targets from its viewpoint. With only an image, the plan remains explicitly illustrative. It is planning data; Flow is not claimed to accept exact waypoints, geometry uploads or physically guaranteed camera control.

Generate the existing `flow_handoff` from an approved current AI `showcase` or geometric `scene_preview`. Format 2 includes shot/scene hashes, shot plan and a continuity checklist. Changing motion invalidates the handoff/video while preserving the already approved start image. The ZIP includes approved reference images/prompts and, where applicable, `shot-plan.json`, `continuity-checklist.json` and an approved matching scene GLB for operator planning. The existing legacy handoff remains supported when no new shot/scene configuration applies.

Use only Google Flow's supported account/UI controls for the actual creative step. Export a real MP4, then use the existing import/attestation endpoint, FFmpeg sanitation/contact sheet and owner review. All four checks must pass: venue preservation, component identity, placement/clearance, motion continuity. Inspect first/middle/last frames for identity drift, disappearing objects, camera jumps and invented geometry. `GET /projects/PROJECT_ID/flow-delivery` summarizes current/stale/review/delivery state without certifying provider origin. No automated submission adapter was added: a supported integration has not been configured or exercised.

## Deferred verification and remaining work

No tests, native executable probes, calibration/HDR/reconstruction jobs, scene renders or paid/Flow requests were run in this implementation. Still required: unit/integration/regression checks, native CLI/GPU compatibility, real capture calibration and bracket ghosting checks, reconstruction metric/held-out viewpoint checks, proxy placement validation, actual Flow wedding clips/motion tuning and full delivery acceptance. Fully spherical calibrated HDRI, RAW radiometry, photoreal texture/lighting renders, detailed scanned decor meshes and production resource limits remain additional work. Do not mark Phase 4/5 production/live acceptance complete from implementation alone.
