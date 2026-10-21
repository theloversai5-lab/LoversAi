# Wedding visualization pipeline (backend v1)

This is an isolated developer-preview API. It does not change the existing UI, image tools, customer wallets or payment flows. It is **disabled by default**. Do not expose it to customers until operator access, paid usage budgets, real-photo evaluations, durable storage and commercial settlement have been established.

Phase 2 persistent local accounts, model doctor and resumable venue acceptance commands are documented in `pipeline/PHASE2.md`. The selected image model is Nano Banana 2.1; credentials stay in the ignored backend environment.

Phase 3 capture readiness, source selection, panorama diagnostics and approved portable GLB/ZIP delivery are documented in `pipeline/PHASE3.md`. This implementation has not been exercised: the user explicitly deferred testing and live runs for this phase.

The next physical-venue implementation adds checkerboard calibration, timed-bracket HDR merging, a native COLMAP photogrammetry adapter, measured 3D decoration proxies, geometric viewpoint previews and richer Flow shot/delivery plans. See `pipeline/PHASE4_5.md` for capture requirements, APIs, limitations and deferred verification. It does not claim a tested spherical HDRI, photoreal scene renderer or automated Flow integration.

## Implemented flow

```text
Brief + private uploads
  -> decode / normalize / exact-duplicate filtering
  -> Gemini relevance/safety review
  -> approved venue sources
       +-> 4-5 overlapping ground views -> OpenCV panorama
       |      -> textured curved glTF backdrop
       +-> component specs -> front/side/top/material sheet
              -> owner approval -> stable master references
  -> normalized canvas paths + placement/keep-clear polygons
  -> clean base + actual rasterized annotations + all references
  -> Gemini composition -> structured QA -> owner approval
  -> revision-aware iterations
  -> Google Flow prompt/reference ZIP (awaiting_flow)
  -> manual generation in Flow -> private MP4 sanitization/contact sheet
  -> owner continuity review -> approved/rejected video
```

### Deliberate boundaries

- The panorama is **LDR**, with partial/unknown coverage. It is not radiometric HDR, a complete 360 capture, photogrammetry, or a measured venue model. The glTF is a real textured curved image backdrop with arbitrary units and explicitly inferred display field of view. It does not provide walk-through parallax or reconstructed decor meshes.
- A panorama cannot show a physically accurate new overhead view from incomplete ground photos. Conceptual isometric visualization may infer unseen surfaces; approve it as illustrative, not surveyed geometry. True HDR/3D needs a capture/calibration pipeline beyond this first slice.
- There is no canvas UI in this change. The API accepts the drawing data and creates the annotated image consumed by Gemini.
- Flow is the only video destination. The backend creates a private handoff JSON with approved frame, component references and shot prompt. It does **not** submit to a supported Flow API, automate browser sessions, substitute another video API, or report a fake completed video. A person executes the handoff in Flow.
- Image screening and semantic QA are probabilistic. Venue fidelity, cultural fit, structural preservation and component consistency still need real-photo evaluation and human review. No dimensions are inferred from arbitrary photographs.
- Exact duplicate normalized images are rejected. Near-duplicate/blur/occlusion tuning needs representative venue capture sets; low-detail images are already flagged for review.

## Setup

Use Node >=20.19 (tested with Node 24), a persistent MongoDB, and Python with OpenCV/NumPy. From `backend`:

```powershell
npm ci --ignore-scripts
python -m pip install -r pipeline/requirements.txt
```

Add the settings documented in `pipeline/.env.example` to the backend environment. Required for live work:

```dotenv
WEDDING_PIPELINE_ENABLED=true
MONGO_URI=<persistent database connection>
GEMINI_API_KEY=<operator-managed secret>
WEDDING_GEMINI_IMAGE_MODEL=<image model available to your account>
WEDDING_GEMINI_VISION_MODEL=<multimodal model supporting JSON assessments>
WEDDING_PIPELINE_PYTHON=python
```

Models are explicit configuration: no guessed model fallback and no FLUX/Replicate fallback. Check the official Gemini API for the selected account before live use. The implementation uses `generateContent`, labeled inline image parts, and structured vision responses. No real Gemini request was executed during implementation.

For isolated local development, from `backend`, enable the feature flag and run:

```powershell
$env:WEDDING_PIPELINE_ENABLED="true"
npm.cmd run pipeline:dev -- --temporary-db
```

Open `http://localhost:5000/` for these docs and `/health` for live readiness. The command binds only to `127.0.0.1`. It does not start the legacy app, seed users or run a worker by default. `--temporary-db` creates an empty database and private asset directory which are discarded on graceful shutdown. There are no users to log in as in that mode; it is an infrastructure preview, not an authenticated image-generation demo.

For authenticated manual development, configure a **development** `MONGO_URI` containing existing users, its matching `JWT_SECRET`, provider settings and a private data directory. Then run:

```powershell
npm.cmd run pipeline:dev -- --worker
```

These examples use `npm.cmd` on Windows PowerShell because the installed `npm.ps1` can consume the `--` separator. On other platforms use `npm`. Direct `node pipeline/dev-server.js --temporary-db` also works after enabling the flag.

`--worker` explicitly polls the existing pipeline processor against the same database and asset store. Shutdown stops taking new jobs, waits for an in-flight job and disconnects. Do not also start a separate worker unless you intend another worker process. The runtime rejects `--temporary-db` together with `MONGO_URI` to prevent selecting the wrong database. Use `--port=5001` for another local port. Temporary-mode crashes can leave local temporary files; graceful shutdown cleans them.

For integration with the existing API, run that API and the dedicated worker as **separate processes**, from `backend`:

```powershell
npm run dev
npm run pipeline:worker
```

The existing server still has the legacy issues documented by the earlier project audit. This work does not fix or invoke them in tests. The new worker connects directly to the specified database and does not import the application server or seed administrator accounts.

Both API and worker must share the private `WEDDING_PIPELINE_DATA_DIR` volume. Default is `backend/.pipeline-data`, outside `/uploads` and `/public`. The store rejects those static roots. Mount and back up this volume with the new Mongo collections. Credentials and private files are gitignored. Configure Python/OpenCV in the deployment separately; existing Docker images have not been changed.

## API

Base: `/api/wedding-pipeline`. Every endpoint requires the existing `Authorization: Bearer <JWT>`. Owner and explicitly added collaborators can access a project. Only its owner can manage collaborators or approve assets. Unauthorized project/asset lookups return 404. There is no public URL importer or public asset listing.

| Method | Path | Purpose |
|---|---|---|
| GET | `/capabilities` | Active limits, configured model names and honest capability flags |
| POST | `/projects` | Create project with `{brief}` |
| GET | `/projects/:id` | Read latest revision, assets, components and canvas |
| POST | `/projects/:id/preview` | Nonbillable prompt, reference manifest, request budget and readiness inspection |
| PATCH | `/projects/:id` | `{revision, changes: {brief?, components?, canvas?}}` |
| PUT | `/projects/:id/collaborators` | Owner sets `{revision, userIds: [...]}` using real active user IDs |
| POST | `/projects/:id/assets` | Multipart upload with `images`, `kind`, `views`, `revision` |
| GET | `/projects/:id/assets/:assetId` | Authorized bytes, private/no-store |
| POST | `/projects/:id/assets/:assetId/approve` | Owner records `{revision, reason}` |
| POST | `/projects/:id/jobs` | Enqueue an operation; returns 202 |
| GET | `/projects/:id/jobs/:jobId` | Poll lifecycle/result; no worker lease/internal snapshot in response |
| GET | `/projects/:id/jobs` | Latest 20 jobs for the project (same access control, sanitized) |
| POST | `/projects/:id/references/import` | Owner/collaborator imports a trusted preset `{revision, presetPath, label?}` as an approved `reference` |
| POST | `/projects/:id/suggest` | Synchronous, unbilled placement ideas for one circled area `{baseAssetId, region, elementHint?}` |
| POST | `/projects/:id/flow/:handoffAssetId/package` | Download complete private reference ZIP with `{revision}` |
| POST | `/projects/:id/flow/:handoffAssetId/videos` | Import one manually exported Flow MP4 for review |
| POST | `/projects/:id/flow/videos/:assetId/review` | Owner continuity checklist and approve/reject decision |

Every mutation requires the latest integer `revision`. Upload, job reservation and result publication also advance it. Fetch the project after a job finishes before making the next edit. A 409 is a stale edit or conflicting idempotency key, not an instruction to blindly repeat a paid request.

### Billing

Operations that invoke the image-generation model deduct planner credits at enqueue time:

| Operation | Cost |
|---|---|
| `venue_isometric` | 3 credits |
| `component_sheet` | 1 credit |
| `placement` | 2 credits |
| `showcase` | 2 credits |
| `region_edit` | 2 credits |
| `element_view` | 1 credit |
| `screen_assets`, `panorama`, `flow_handoff` | 0 credits |

Insufficient balance returns HTTP 402 `INSUFFICIENT_CREDITS`. Idempotent re-submission of an existing request key does not charge again. If a billed job fails without producing any output, the credits are automatically refunded. Uncertain outcomes (`needs_review`) and lease-lost jobs are not auto-refunded.

### 1. Create a project

```json
{
  "brief": {
    "description": "An evening garden wedding. Keep the venue building and existing trees unchanged.",
    "ceremony": "Wedding ceremony",
    "style": "Contemporary floral",
    "palette": ["ivory", "sage", "warm gold"],
    "constraints": ["Keep the eastern exit clear", "Preserve the permanent stage footprint"]
  }
}
```

### 2. Upload and screen

Multipart fields:

- `images`: one to five files; JPEG/PNG/WebP only, max 10 MiB each and 40 MP decoded. Minimum 512 pixels per side. Actual bytes are decoded, EXIF orientation applied, metadata stripped and stored JPEG MIME is accurate.
- `kind`: `venue` or `decor`.
- `views`: JSON array matching file count. Labels: `front`, `right`, `back`, `left`, `satellite`, `detail`, `unspecified`.
- `revision`: latest project revision.

Result contains accepted and rejected file indices. Locally accepted uploads remain `pending_screen` and cannot yet feed generation. Enqueue:

```json
{"revision":1,"requestKey":"screen-batch-1","operation":"screen_assets","options":{}}
```

Screening processes at most five pending assets per job. If `pendingRemaining > 0`, fetch the new project revision and submit another explicit screening job with a new key. Accept/reject/review decisions and reasons are retained. Low-detail or uncertain inputs require owner review. Unsafe/irrelevant or rejected inputs cannot be promoted through the approval endpoint.

Capture guidance: use adjacent overlapping photographs from a consistent camera position, stable exposure and lens, no large foreground movement. Four non-overlapping compass photos are not enough for reliable stitching. Satellite/detail images are retained for Gemini context but excluded from ground-level stitching. For HDR lighting, capture calibrated exposure brackets or an actual HDR panorama; re-encoding a JPEG as `.hdr` does not recover radiance.

After four/five suitable ground views are approved:

```json
{"revision":3,"requestKey":"venue-panorama-1","operation":"panorama","options":{}}
```

The result includes panorama, glTF backdrop and standalone embedded GLB candidates with warnings, provenance and capture diagnostics. Phase 3 adds explicit ground-capture selection, readiness checks and approved portable export; see `pipeline/PHASE3.md`. Stitching rejects disconnected views or any solution that silently omits an input. The primary spherical stitcher may use an explicitly labeled planar-mosaic mode if that is the alignment that succeeds. It never invents missing coverage. Output resolution is bounded by source data and a 24 MP panorama limit.

### 3. Describe and generate components

PATCH the editable specifications only. Approval/master fields are server-owned and must not be sent back as editable fields.

```json
{
  "revision":4,
  "changes":{
    "components":[
      {"id":"florals","category":"flowers","description":"Ivory jasmine with light green foliage","palette":["ivory","sage"],"materials":["fresh jasmine","foliage"],"referenceAssetIds":[]},
      {"id":"main-stage","category":"stage","description":"A low timber stage with ivory floral columns","materials":["timber","ivory fabric"],"dimensions":{"width":8,"depth":4,"height":0.6,"unit":"m"},"referenceAssetIds":[]},
      {"id":"dance","category":"dance_floor","description":"Square parquet dance floor","referenceAssetIds":[]},
      {"id":"bar","category":"bar","description":"Sage curved bar with brass trim","referenceAssetIds":[]},
      {"id":"dining","category":"dining","description":"Round dining tables with ivory linens","referenceAssetIds":[]},
      {"id":"photo","category":"photo_booth","description":"Freestanding floral portrait arch","referenceAssetIds":[]}
    ]
  }
}
```

Supported categories additionally include `decoration`, `entry`, `mandap`, `lounge`. Dimensions are optional *supplied measurements*, not estimates from images. Do not send invented measurements to obtain an apparently measured result.

Generate each component as a full 2×2 grid sheet (default `viewType: full_sheet`), or a single-view rendering:

```json
{"revision":5,"requestKey":"stage-sheet-v1","operation":"component_sheet","options":{"componentId":"main-stage"}}
{"revision":5,"requestKey":"stage-front-v1","operation":"component_sheet","options":{"componentId":"main-stage","viewType":"front"}}
```

Valid `viewType` values: `full_sheet` (default), `front`, `top`, `side`, `detail`. Single-view modes omit the 2×2 grid and render one dedicated view. Each output is a `component_sheet` asset regardless of `viewType`. Review it and approve through the asset endpoint with a reason of at least ten characters. This sets its stable `masterAssetId`. Changing the specification invalidates promotion of older sheets; changing the catalog/master clears its old canvas interpretation. Unapproved sheets cannot be used in a showcase or placement.

**Cost**: 1 planner credit per `component_sheet` job.

### 3a. Generate an isometric venue view

Once four or five approved ground-level venue photos (and optionally one satellite/aerial view) are available:

```json
{"revision":6,"requestKey":"isometric-v1","operation":"venue_isometric","options":{"venueAssetIds":["<front>","<right>","<back>","<left>","<satellite>"]}}
```

`options.venueAssetIds` must contain 4–5 distinct approved `venue` assets: at least four ground views (any of `front`, `right`, `back`, `left`, `unspecified`) and at most one satellite/aerial view. The satellite/aerial view is included as a Gemini reference (unlike the panorama operation, which excludes it from stitching). Produces one `venue_isometric` candidate at `status: candidate`, awaiting owner approval. QA criteria: all four sides identifiable, no invented structures, consistent proportions, no people or overlays.

**Cost**: 3 planner credits per `venue_isometric` job.

### 3b. Place a component into the isometric view

With an approved `venue_isometric` (or prior approved `placement`) as the canvas base and a component with an approved master sheet, draw a `place` region on the canvas, then enqueue:

```json
{"revision":8,"requestKey":"place-mandap-v1","operation":"placement","options":{"baseAssetId":"<approved venue_isometric or placement>","componentId":"mandap"}}
```

The canvas `baseAssetId` must match `options.baseAssetId` and contain exactly one `place` region for `options.componentId`. An approved `placement` asset can itself become the next base for iterative chaining. Produces one `placement` candidate, status `candidate`. QA criteria: component only inside the region, venue structure outside preserved, scale and isometric lighting consistent, no annotation lines in output.

**Cost**: 2 planner credits per `placement` job.

### 3c. Region edits, element angles, references and suggestions

`region_edit` edits an approved base (`venue_isometric`, `region_edit`, `showcase`, `placement`, `venue`) only inside 1–8 numbered ellipses:

```json
{"revision":9,"requestKey":"edit-v1","operation":"region_edit","options":{"baseAssetId":"<base>","regions":[{"id":"gate","cx":0.5,"cy":0.7,"rx":0.12,"ry":0.08,"rotation":0,"comment":"Marigold entrance arch","referenceAssetIds":["<reference>"]}]}}
```

`cx`/`rx` are fractions of image width, `cy`/`ry` of height (`cx`,`cy` in [0,1]; `rx`,`ry` in [0.01,0.5]); `rotation` is degrees in [-90,90]. Comments are 1–500 characters and treated as untrusted data. Each region takes 0–3 approved `decor`, `reference`, `component_sheet`, `element_view` or `venue` references. Base + rendered region map + distinct references must fit 13 images or the job fails `REFERENCE_LIMIT`. The numbered map is saved as a `canvas_overlay`; the output `region_edit` candidate stores the sanitized `regions` and keeps the base aspect ratio. Approved region edits chain into the next `region_edit`, `venue_360.designAssetId` and `layout_plan`.

`element_view` re-renders an approved `decor`/`reference`/`component_sheet`/`element_view` from `{sourceAssetId, azimuth 0–359, elevation -30–90, zoom 0–10, provider?, note?}`. Angles map to the Qwen multiple-angles vocabulary (e.g. "front-right quarter view, elevated shot, medium shot"). `provider` defaults to `WEDDING_ANGLES_PROVIDER` or `gemini`; `fal` uses `fal-ai/qwen-image-edit-2511-multiple-angles` via the fal queue with `FAL_KEY` (missing key: 503 at enqueue, never a silent Gemini fallback; result downloads only from HTTPS `fal.media`/`*.fal.media`/`*.fal.run`). Gemini QA runs for both providers.

`POST /projects/:id/references/import` turns a file under `.pipeline-data/demo-presets/references/` (lowercase relative path, `.jpg`/`.png`/`.webp`, no traversal) into an approved `reference` asset without screening. User uploads still use `kind: decor` + `screen_assets`. `POST /projects/:id/suggest` returns 4–6 `{label, prompt, elementType}` ideas for a circled area from the vision model; it is not billed.

### 4. Send a vendor drawing

Canvas coordinates are **image-space normalized [0,1]**, not screen pixels or metres. `baseAssetId` must be an approved venue image, panorama or prior showcase. Regions need at least three points; strokes need at least two. Actions are `place`, `remove`, `recolor`, `keep_clear`. Keep-clear is polygon-only because a line has no defined clearance width. Placement/recolor requires a component with an approved master.

```json
{
  "revision":12,
  "changes":{
    "canvas":{
      "baseAssetId":"<approved venue asset ID>",
      "regions":[
        {"id":"stage-zone","action":"place","componentId":"main-stage","points":[[0.2,0.3],[0.55,0.3],[0.55,0.6],[0.2,0.6]]},
        {"id":"exit-zone","action":"keep_clear","points":[[0.8,0.1],[0.95,0.1],[0.95,0.8],[0.8,0.8]]}
      ],
      "strokes":[]
    }
  }
}
```

Keep-clear/placement intersections are rejected before generation. The server creates an actual tinted annotation image, using fixed action colors. It sends that image, the clean base, the approved venue sources and component masters as labeled independent image parts. It never discards one venue image just because another reference exists.

There is a 13-source-image and 20 MiB serialized-request limit, including base64 expansion; QA reserves image slot 14 for the generated candidate. If a design exceeds that budget, reduce reference sizes or simplify the selected project component set. The API fails explicitly rather than silently dropping references. A later atlas/scene-composition extension can increase supported complexity without misrepresenting fidelity.

### 5. Generate, inspect and approve the venue

Inspect the exact generation preparation before queuing paid work:

```json
{"revision":13,"operation":"showcase","options":{}}
```

Send this to `POST /projects/:id/preview` (use `component_sheet` with `options.componentId` for a sheet). The authenticated response includes the versioned prompt, labeled references with actual byte counts, serialized request size, configuration blockers and QA candidate headroom. A derived drawing reference has `assetId: null` because inspection rasterizes it in memory without persisting a file. Inspection never submits to Gemini, reserves a job or advances the revision. It rejects stale revisions and cross-project access.

The same preparation/serialization code is used by enqueue and execution. Requests over the serialized budget fail before a job is reserved. Missing/placeholder keys or absent/invalid explicit model names also block new paid jobs. Existing identical idempotency keys still recover the original job after configuration changes. Configuration readiness is only a local check; it does not verify account access, model capabilities or live output quality. Choose a model supporting the generateContent image API and the number of image references your design needs; no default is guessed. Provider documentation: [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation).

`qaCandidateHeadroomBytes` is the remaining **serialized** QA budget after its complete envelope and source references. `qaMaxCandidateBytes` is the maximum candidate JPEG byte count that can fit after base64 expansion. The generated output size is unknown in advance, so QA may still fall back to `QA_INCOMPLETE` and explicit human review. These are byte limits, not token/cost estimates.

Queue the inspected task with a new explicit request key:

```json
{"revision":13,"requestKey":"showcase-v1","operation":"showcase","options":{}}
```

No-image briefs can generate conceptual scenes/components. They cannot generate a truthful stitched environment. Composition preserves the selected base camera; a new camera/true 3D reconstruction requires a separate task rather than silently overriding the drawing.

Outputs store actual model/provider, template version, parent asset IDs, source design fingerprint, revision and QA verdict. A generation refusal or undecodable output fails. If generation succeeds but automated assessment is unavailable, malformed or exceeds its payload budget, the valid image is retained with `QA_INCOMPLETE` and requires explicit human review. It is never treated as a QA pass. QA `pass` still yields a human-review candidate; QA `review` requires explicit review; QA rejection cannot be promoted. Lost worker ownership prevents publication even if an image was generated.

Approved scenes can become the base for another drawing iteration. Approving an old candidate or exporting an old showcase to Flow after changing the design is rejected by fingerprint checks. Generation and human review do not certify structural safety or measured scale.

### 6. Prepare the Flow shot

```json
{"revision":16,"requestKey":"flow-shot-v1","operation":"flow_handoff","options":{"showcaseAssetId":"<current approved showcase ID>"}}
```

The job becomes `awaiting_flow` and emits a downloadable JSON asset containing the approved frame ID, component sheets, a restrained isometric-style drone prompt, target duration, source design hash and Flow instructions. Flow submission and video generation remain manual. New handoffs use `formatVersion: 1`; older handoffs without delivery provenance must be regenerated before packaging/import.

Download the operator package from `POST /projects/:id/flow/:handoffAssetId/package`:

```json
{"revision":17}
```

It contains `prompt.txt`, `handoff.json`, `manifest.json`, `README.txt` and the actual approved reference images in `references/`. The manifest records every image's role, byte count and SHA-256 checksum. It is a read-only private download, maximum 64 MiB. Stale design, missing/unapproved references or excess size fail explicitly; no source is silently omitted. Open Flow and use its supported frame/reference controls to generate the clip.

### 7. Import the Flow result and review continuity

Configure local **FFmpeg and FFprobe** executables (`WEDDING_PIPELINE_FFMPEG` and `WEDDING_PIPELINE_FFPROBE`, default command names). The runtime needs an FFmpeg build with H.264 decoding, libx264 encoding and JPEG output. These tools are separate system dependencies; no deployment image was changed.

Send multipart to `POST /projects/:id/flow/:handoffAssetId/videos`:

- `video`: one MP4, maximum 24 MiB. Filename and declared MIME are not trusted.
- `revision`: current project revision.
- `attestation`: exact string `generated_with_google_flow`.

This explicitly records **user-attested provenance**, with `verified: false`; the server cannot prove that a file originated in Flow. The input must be an actual MP4 with one H.264 stream, 2–30 seconds, 1–60 fps, at least 256 pixels per side, at most 4096 pixels per side and 8.4 MP. Decode failures, oversized clips and duplicate input hashes are rejected. MOV external track references and absolute alias paths are disabled; executable calls use fixed argv without a shell or network URL input.

Import decodes and re-encodes a fresh silent H.264 MP4 at up to 1920x1080/30 fps, removes source container metadata/chapters and non-video streams, and checks output duration/size. Fragmented MP4s may omit their source frame count; the fresh decoded output must have a valid count. The source minimum dimensions do not apply after scaling: a valid wide clip can become 1920x120 while retaining its aspect ratio. Audio is deliberately removed for this drone-shot workflow. It creates a first/middle/last **contact sheet**, ordered left to right. Two decoder operations may run concurrently per API process, with a 90-second total budget and 30-second per-tool limit. Imports are bounded synchronous local operations, not Gemini/Flow submissions. Raw inputs and temporary media are discarded; only sanitized private video and contact sheet are retained. Both outputs are removed if project publication conflicts or fails.

The response contains `project` and `video`; the video remains `review`. Fetch its `contactSheetAssetId` and MP4 through the existing authenticated asset endpoint. MP4 downloads have a `.mp4` attachment filename. Review the **full video**, since three frames alone cannot establish motion continuity. Only the owner may submit:

```json
{
  "revision":18,
  "decision":"approve",
  "reason":"Venue landmarks, components and full motion reviewed",
  "checks":{
    "venuePreserved":true,
    "componentIdentity":true,
    "placementAndClearance":true,
    "motionContinuity":true
  }
}
```

Send this to `POST /projects/:id/flow/videos/:assetId/review`. Approval requires all four checks to pass and the current design/handoff to match. Use `decision: "reject"`, explicit check results and a reason for a failed clip. Rejection is permitted for an older design. Approval/rejection updates video and contact sheet together. The generic image-approval endpoint rejects both media kinds. Handoff job history remains `awaiting_flow`; related project video assets hold the current delivery/review state.

## Job lifecycle

```text
queued -> atomic worker claim -> running + renewed lease
          +-> succeeded        (screening without unresolved review)
          +-> needs_review     (generated candidates, panorama, uncertain screen)
          +-> awaiting_flow    (handoff prepared, video not yet generated)
          +-> failed           (configuration/input/provider failure)

expired running lease -> needs_review (uncertain paid outcome)
```

`requestKey` is unique per project and bound to the full request fingerprint. Retry the identical request to recover its existing job; changing the payload with that key is a 409. There are at most two active jobs per project. The worker uses one job at a time and checks ownership before each external call. A lost lease stops new calls but cannot undo one already in flight. No automatic retry of uncertain provider work occurs.

Results are first persisted on the job, then idempotently published to the project; reconciliation can finish publication without another Gemini call. Snapshots are immutable, and outputs do not overwrite later drawings. Private-byte persistence and Mongo publication are not a distributed transaction: crash-time orphan cleanup/retention, object storage and operator reconciliation are follow-up operational work.

## Verification

```powershell
npm run test:pipeline
npm run test:pipeline:stitch
```

Node tests exercise real image normalization/rasterization, preview-to-worker byte parity, private storage, HTTP project isolation, schema/reference/approval constraints, mocked-network Gemini contracts, isolated Mongo claim/idempotency/recovery, local runtime authentication/cleanup, and the durable component-to-showcase-to-Flow lifecycle. The first Mongo test may download a test database binary into its cache. Python tests stitch actual synthetic overlapping views and reject blank/disconnected images.

## Remaining production milestones

1. Evaluate image screening, identity consistency, annotated placement and venue preservation on real authorized photographs; tune prompts with recorded results.
2. Define paid usage budgets and credit reservation/settlement before enabling customer access. Existing commerce was intentionally left unchanged.
3. Validate the implemented calibration, timed HDR, COLMAP reconstruction and measured proxy-scene paths on real captures. Complete spherical HDRI, reconstruction textures/lighting and held-out viewpoint accuracy; see the [Phase 4/5 guide](PHASE4_5.md).
4. Implement canvas/viewer UI only when that work is authorized; add a proper textured component scene if navigable 3D, rather than a backdrop, is required.
5. Establish a supported Google Flow submission integration or continue the explicit manual package/import loop; evaluate continuity on actual Flow exports. Local media validation and owner review do not prove model/provider origin or semantic fidelity.
6. Add durable object storage, private-volume backups, retention/orphan reconciliation, deployment/runtime provisioning and resource monitoring.
