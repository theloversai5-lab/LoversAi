# Phase 3: venue environments

Implementation added on `nevil-dev`. The user requested postponing tests: this phase has not been exercised by tests, syntax checks, stitching jobs, HTTP requests or paid generation. Restart API/worker and complete the deferred checks before treating it as verified.

The artifact is an **LDR curved backdrop** with an illustrative camera and arbitrary units. It is not radiometric HDR, a complete 360 capture, measured venue geometry, a walk-through mesh or a construction drawing. No hidden regions or decor meshes are synthesized by this phase.

## Capture and readiness

Upload venue images with the existing protected upload endpoint. Ground labels: `front`, `right`, `back`, `left`, `unspecified`. Context labels: `aerial`, `satellite`, `detail`; these remain available for image-generation context but never count toward ground stitching. Inputs still require real decoding, minimum 512 pixels per side and existing byte/pixel limits. PDF sample images are not enlarged to bypass that requirement.

An owner can explicitly select up to five uploaded ground assets and declare provenance:

```http
PUT /api/wedding-pipeline/projects/PROJECT_ID/venue-capture
Authorization: Bearer OWNER_TOKEN
Content-Type: application/json
```

```json
{
  "revision": 5,
  "capture": {
    "assetIds": ["FRONT_ID", "RIGHT_ID", "BACK_ID", "LEFT_ID"],
    "sourceType": "photographs",
    "sourceLabel": "Venue capture set, October 2026",
    "cameraPosition": "fixed",
    "overlap": "declared",
    "displayHorizontalFovDeg": 120
  }
}
```

`sourceType` is `photographs`, `pdf_demo`, `synthetic_fixture` or `unknown`; it is an operator declaration, not independent authentication of the source. `cameraPosition` is `fixed`, `moving` or `unknown`. `overlap` is `declared` or `unknown`; declaring it does not establish geometric overlap. Display horizontal field of view is 30–180 degrees and controls the backdrop presentation only, never a measured capture angle. Omitting `assetIds`, or using an empty list, selects all current ground venue assets. Existing projects can use this implicit selection without a migration; explicit selection allows excluding old/rejected capture attempts without deleting their history.

```http
GET /api/wedding-pipeline/projects/PROJECT_ID/venue-readiness
Authorization: Bearer PROJECT_MEMBER_TOKEN
```

Readiness is nonbillable and returns selected ground views, excluded context IDs, blocker codes, warnings, a source fingerprint and recapture guidance. Exactly four or five distinct approved ground images are required. Duplicate hashes, duplicate named compass views, known undersized images, missing/invalid selections and declared moving-camera captures block enqueue. Unknown camera/provenance/metadata produces warnings. `ready_for_alignment` means only that local prerequisites pass; overlap is still unverified until OpenCV executes. No AI request is used by this endpoint.

## Create panorama and environment candidates

Use the existing durable job endpoint after screening and any required owner input review:

```json
{"revision": 8, "requestKey": "venue-capture-1", "operation": "panorama", "options": {}}
```

Both enqueue and the worker use the same capture selection/validation. OpenCV computes a feature overlap graph and reports pair matches, RANSAC inliers, processing dimensions/scales, sharpness statistics, alignment attempts and used input indices. It refuses disconnected sets and solutions that silently omit an input. The existing spherical-first/planar-second alignment behavior remains local geometric processing; it does not use Gemini or retry a billable request. Processing may downsample to 1600 pixels on the longest side; source images are never upsampled. Output remains bounded to 24 MP and 24 MiB and is decoded again before publication.

Failure diagnostics for overlap/alignment are retained in the durable job's `error.captureDiagnostics`; use them with recapture guidance. Near-black pixel fraction is a diagnostic only: shadows/night scenery prevent treating it as a coverage percentage. Seams, parallax and fidelity still need human inspection.

One successful job publishes three candidates:

1. `panorama`: the actual aligned JPEG.
2. `environment`: a glTF 2.0 curved backdrop with inline geometry and a private relative texture reference.
3. `environment_glb`: a single GLB containing JSON, geometry, camera and the actual JPEG texture. It requires no asset URL, session or external texture request after authorized download.

Each asset stores a byte checksum, source capture fingerprint, source revision and parent references. The glTF/GLB metadata includes provenance and diagnostics. Candidates remain unapproved. Existing active-job and asset capacity limits already reserve space for all three artifacts.

## Approval and current state

Use the existing owner-only asset approval endpoint with current revision and a meaningful inspection reason. Approve the panorama first, then its matching glTF and GLB. Approval checks that the selected input IDs/hashes, view labels, dimensions, approval state and capture settings still match the artifact's fingerprint. Old artifacts lacking Phase 3 provenance cannot be exported as current; regenerate them.

Capture settings changes clear a panorama-backed drawing so it can be resubmitted against the current capture. Panorama-backed generation also checks freshness at preflight and execution. Direct drawings on approved original venue photographs retain the existing image-space contract.

```http
GET /api/wedding-pipeline/projects/PROJECT_ID/environments
Authorization: Bearer PROJECT_MEMBER_TOKEN
```

Returns capture readiness, candidate/current/approved/exportable state, associated panorama/glTF IDs, pending approval IDs and protected artifact/package paths. Stale artifacts remain available in project history; they cannot be promoted/exported as current.

## Portable package

```http
POST /api/wedding-pipeline/projects/PROJECT_ID/environments/GLB_ASSET_ID/package
Authorization: Bearer PROJECT_MEMBER_TOKEN
Content-Type: application/json

{"revision": 14}
```

All three linked artifacts must be approved and current. Export verifies file lengths/checksums and rebuilds the embedded GLB from the owned glTF and panorama to verify exact geometry/texture linkage. It checks the project revision again after reading files, protecting against concurrent edits during export. No arbitrary URI or user filesystem path is fetched.

The private, no-store ZIP contains `venue-backdrop.glb`, `venue-backdrop.gltf`, `venue-panorama.jpg`, `manifest.json` and `README.txt`. The glTF texture URI is rewritten to its included JPEG. Manifest records source fingerprint/revisions, capture declarations, diagnostics, approvals and SHA-256 hashes of payload files. The manifest does not claim a self-checksum. Package limit: 48 MiB; individual stored artifact limit: 24 MiB. Candidate artifacts can be downloaded for inspection through existing authorized asset endpoints, with proper `.glb`/`.gltf` extensions; package delivery requires approval.

GLB layout follows the [Khronos glTF 2.0 container specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html): JSON first, BIN second, 4-byte chunk alignment, and embedded texture bufferView/mimeType. A live validator/viewer check is deferred with the rest of testing.

## Deferred verification

- Capture selection, pending/rejected/context/duplicate inputs and unknown metadata.
- Owner-only configuration/approval, collaborator read/export access and cross-project denial.
- Real overlap/alignment successes and failures with persisted diagnostics and no omitted views.
- JPEG output limits, GLB binary layout/texture/camera and archive integrity.
- Stale source approval/export and a concurrent project edit during export.
- Panorama-backed canvas invalidation and the existing pipeline regression suite.

The previously interrupted PDF demo generation remains unexecuted. Its provider check was rejected because automatic approval review hit an account usage limit. That action has not been retried or bypassed as part of this implementation.
