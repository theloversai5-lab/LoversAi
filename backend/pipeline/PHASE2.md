# Phase 2 operator workbench

Current status: the user has added a Gemini API key and selected `gemini-nano-banana-2.1`. A single metadata request verified image-model account access; generation has not run. The later PDF-demo preparation set QA/vision to `gemini-3.6-flash`; its access check and demo execution were not completed after an approval-service usage-limit failure. See `docs/PIPELINE_SINGLE_RUN.md` for the earlier single verification pass. Phase 3 venue-environment implementation is documented in `pipeline/PHASE3.md`, with testing deferred by the user. Earlier keyless setup instructions below describe the initial environment; never overwrite an existing private key with the blank example.

## Start the persistent authenticated workbench

From `backend`, Windows PowerShell:

```powershell
$env:WEDDING_PIPELINE_ENABLED="true"
npm.cmd run pipeline:dev -- --local-db --test-accounts --worker
```

`--local-db` starts an owned loopback Mongo instance using persistent WiredTiger data at `.pipeline-data/local-dev/database`. Projects, uploaded assets, fixture identities and password hashes survive shutdown/restart; writes request journal acknowledgement and shutdown attempts an explicit owned-database flush. A failed flush is reported after all remaining cleanup stages run and the previous signing environment is restored; persistent files are retained. This is a local development runtime, not a production Mongo deployment or backup solution. Do not delete its files to restart.

`--test-accounts` explicitly provisions a planner owner and vendor in that owned database, using the existing User password hashing and JWT middleware. It does not create an administrator, add customer credits, change legacy auth, or touch an external database. Changed/blocked fixture users are not reset. The mode is rejected with `MONGO_URI`, `--temporary-db` or production NODE_ENV.

`workspace.json` holds the generated development signing secret and fixture credentials; `session.json` holds eight-hour bearer sessions bound to the loopback origin. Both are private/gitignored and never served or printed. Restart with `--test-accounts` to refresh expired sessions. Keep the entire directory private. Health exposes only database/worker/configuration flags. The legacy server and default admin seeding are not invoked.

The ignored `backend/.env` has been created with Gemini key and model IDs empty and the feature flag off by default. The explicit local command above enables the isolated workbench for that process. The owned local runtime uses its own signing secret, independently of legacy environment secrets.

## Provider doctor

```powershell
npm.cmd run pipeline:doctor
```

Expected now: nonzero exit and `GEMINI_KEY_MISSING`, `IMAGE_MODEL_INVALID`, `VISION_MODEL_INVALID`. No network request is attempted without the key and explicit model names.

When a key is available, put `GEMINI_API_KEY`, `WEDDING_GEMINI_IMAGE_MODEL` and `WEDDING_GEMINI_VISION_MODEL` in the private backend environment, restart the workbench, then optionally run:

```powershell
npm.cmd run pipeline:doctor -- --online
```

Online checking performs bounded `GET models.get` requests with the API key in a header. It does not call generation. It verifies catalog access and `generateContent` method support, not image modality, reference capacity, quota or visual quality. Choose compatible explicit models from the official documentation/account catalog; nothing is guessed. Sources checked 18 October 2026: [Models API](https://ai.google.dev/api/models), [image generation](https://ai.google.dev/gemini-api/docs/image-generation).

## Prepare a venue case

The private `.pipeline-data/phase2/real-venue/case.json` is copied from `pipeline/case.example.json`. Place four/five distinct, overlapping venue captures in that case's `venue/` directory and edit the brief, components and normalized canvas to match. A contact sheet of unrelated photographs is not a capture set. File paths and aliases must stay inside the case folder. Images are actually decoded, and the selected reference set must fit the generation budget before paid steps.

The separately generated `.pipeline-data/phase2/synthetic-smoke/case.json` is explicitly marked `synthetic_fixture`. Its pattern images are for transport/setup checks only, not a real venue or evidence of image fidelity. No real venue photographs were supplied during this implementation.

Prepare using the actual protected API, without Gemini:

```powershell
npm.cmd run pipeline:acceptance -- --step=prepare --case=.pipeline-data/phase2/real-venue/case.json
```

This creates a project, grants its explicit vendor collaborator, uploads/normalizes the images and writes component specifications. Repeating prepare recovers the same private case run rather than creating another project. It does not screen/generate/approve images. For the already prepared synthetic setup check, use the same command with `synthetic-smoke/case.json`.

## Run generation later, with explicit opt-in

These commands are **not runnable with the empty provider configuration**. They require later credentials/models and a ready worker:

```powershell
npm.cmd run pipeline:acceptance -- --step=screen --case=.pipeline-data/phase2/real-venue/case.json --allow-paid --max-paid-calls=20
npm.cmd run pipeline:acceptance -- --step=panorama --case=.pipeline-data/phase2/real-venue/case.json
npm.cmd run pipeline:acceptance -- --step=components --case=.pipeline-data/phase2/real-venue/case.json --allow-paid --max-paid-calls=20
```

The call maximum is a conservative **per-run reservation**, not a billing/credit integration: up to five screen calls, two per component (image + QA) and two for a showcase. It does not limit other API clients or prove dollar spend. Requests are saved atomically before enqueue with exact revision/options/idempotency key. Recovery reuses the saved job/body and does not reserve a new paid attempt. A failed/uncertain job is not automatically retried under a fresh key. Workbench accounts/API rate limits still apply; a timed-out poll or rate limit means inspect and resume, not invent another request key.

Definitive pre-enqueue refusals (`REVISION_CONFLICT`, `PROVIDER_NOT_CONFIGURED`, `ACTIVE_JOB_LIMIT`, `ASSET_LIMIT`, `NO_PENDING_IMAGES`, `VENUE_VIEW_COUNT`) are recorded as `rejected_before_enqueue` and release that unaccepted reservation. Repeating the step refreshes the revision and prerequisites; a paid submission requires explicit opt-in and the call budget again. Transport failures, generic server errors and idempotency conflicts remain uncertain: recovery preserves the exact saved body, even when the accepted response was lost and no job ID was saved. It never changes the request key to escape uncertainty.

The default command polls up to 15 seconds, then preserves queued/running state; repeat the same step to recover, or set `--wait-ms=60000` (maximum 180000). Per-case exclusive lock files prevent concurrent operators. After a crashed CLI, confirm it is stopped before manually removing that run's `run.lock`. Do not edit saved request bodies to bypass conflicts. Changed case content creates a new case identity; existing vendor drawings are not silently overwritten.

## Human approvals and drawing

Inspect each output through authenticated asset download or the private project. For a reviewable venue input or generated sheet, explicitly record:

```powershell
npm.cmd run pipeline:acceptance -- --step=approve --case=.pipeline-data/phase2/real-venue/case.json --asset=ASSET_ID "--reason=Inspected venue preservation and component characteristics"
```

Rejected/unsafe/irrelevant inputs cannot be promoted. Component generation does not autoapprove sheets. After all master sheets are explicitly approved, showcase applies the case's real canvas through the vendor's JWT session and enqueues composition through the owner's session:

```powershell
npm.cmd run pipeline:acceptance -- --step=showcase --case=.pipeline-data/phase2/real-venue/case.json --allow-paid --max-paid-calls=20
```

Approve a showcase only after full visual inspection. Flow package/video delivery remains the separate documented API workflow in README. No canvas UI is added here.

## Evidence and reports

```powershell
npm.cmd run pipeline:acceptance -- --step=report --case=.pipeline-data/phase2/real-venue/case.json
```

State and report files are under `.pipeline-data/acceptance/<caseId>/`. Reports expose project/job/output IDs, declared source provenance, outstanding gates and safe request measurements, never bearer tokens, signing secrets, image bytes or full prompts. Successful Gemini responses record elapsed request milliseconds, serialized request bytes and only whitelisted usageMetadata counters. Failed/uncertain calls may be missing measurements; token sums are not a complete billing ledger. Actual money cost remains null and live acceptance remains false until external live quality/cost evaluation is performed.

Current real localhost check: authenticated synthetic preparation succeeded with four pending-screen inputs and six component specifications; attempted screening stopped at `PROVIDER_NOT_CONFIGURED` with zero reserved provider calls and no generation output. The full mocked-network test exercises screening, component creation, explicit approval, vendor drawing and showcase with real HTTP/JWT/Mongo, but is not a live Gemini fidelity test.
