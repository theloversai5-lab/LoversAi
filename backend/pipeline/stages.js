import { normalizeImage, regionEditMask, compositeRegions, pasteCutout } from "./media.js";
import { createHash } from "node:crypto";
import { TEMPLATE_VERSION, SHEET_LAYOUT } from "./prompts.js";
import { fail } from "./contracts.js";
import { prepareGeneration, GENERATIVE_OPERATIONS } from "./preparation.js";
import { generationRequest } from "./gemini.js";
import { componentHash, designHash } from "./fingerprints.js";
import { stitchVenue } from "./panorama.js";
import { buildEnvironment, encodeEnvironmentGlb } from "./environment.js";
import { requireReadyCapture } from "./venue-capture.js";
import { buildFlowHandoff } from "./flow.js";
import { runPhysicalOperation } from "./local-compute.js";
import { runSceneShowcase } from "./scene-stage.js";
import { ANALYSIS_OPERATIONS, runAnalysis } from "./analysis.js";
import { FalClient } from "./fal.js";
import { angleLabel } from "./element-view.js";

export async function runStage(
  job,
  {
    assets,
    gemini,
    fal = null,
    stitch = stitchVenue,
    assertOwnership = async () => {},
  },
) {
  const p = structuredClone(job.snapshot),
    created = [];
  const save = async (buffer, mimeType, meta) => {
    const file = await assets.write(buffer, mimeType);
    created.push(file.id);
    return {
      ...file,
      ...meta,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      sourceRevision: p.revision,
      jobId: job.id,
      createdAt: new Date().toISOString(),
    };
  };
  try {
    if (
      [
        "lens_calibration",
        "hdr_merge",
        "venue_reconstruction",
        "scene_showcase",
      ].includes(job.operation)
    ) {
      const outputs =
        job.operation === "scene_showcase"
          ? await runSceneShowcase(p, assets, assertOwnership)
          : await runPhysicalOperation(
              p,
              job.operation,
              assets,
              assertOwnership,
            );
      const saved = [];
      for (const output of outputs) {
        await assertOwnership();
        saved.push(await save(output.buffer, output.mimeType, output.meta));
      }
      return { status: "needs_review", assets: saved };
    }
    if (job.operation === "screen_assets") {
      const updates = [];
      const pending = p.assets.filter((a) => a.status === "pending_screen");
      for (const a of pending.slice(0, 5)) {
        await assertOwnership();
        const verdict = await gemini.screen({
          ...a,
          buffer: await assets.read(a.id),
        });
        const status =
          verdict.decision === "reject"
            ? "rejected"
            : verdict.decision === "accept" && !a.qualityFlags?.length
              ? "approved"
              : "review";
        updates.push({ id: a.id, status, screening: verdict });
      }
      return {
        status: updates.some((a) => a.status === "review")
          ? "needs_review"
          : "succeeded",
        assets: [],
        assetUpdates: updates,
        pendingRemaining: pending.length - updates.length,
      };
    }
    if (job.operation === "panorama") {
      const { report, views: venue } = requireReadyCapture(p);
      await assertOwnership();
      const { buffer, ...metadata } = await stitch({
        buffers: await Promise.all(venue.map((a) => assets.read(a.id))),
      });
      await assertOwnership();
      const image = await save(buffer, "image/jpeg", {
        kind: "panorama",
        status: "candidate",
        ...metadata,
        sourceCaptureHash: report.sourceCaptureHash,
        referenceAssetIds: venue.map((a) => a.id),
      });
      const { gltf, manifest } = buildEnvironment({
        textureUri: `./${image.id}`,
        width: metadata.width,
        height: metadata.height,
        displayHorizontalFovDeg: p.venueCapture?.displayHorizontalFovDeg ?? 120,
        provenance: {
          sourceCaptureHash: report.sourceCaptureHash,
          sourceRevision: p.revision,
          sourceType: p.venueCapture?.sourceType ?? "unknown",
          sourceLabel: p.venueCapture?.sourceLabel ?? "",
          sourceAssetIds: venue.map((a) => a.id),
          sources: venue.map((a) => ({
            assetId: a.id,
            hash: a.hash ?? null,
            view: a.view,
            width: a.width ?? null,
            height: a.height ?? null,
          })),
          projection: metadata.projection,
          coverage: metadata.coverage,
          diagnostics: metadata.diagnostics ?? null,
          warnings: [
            ...report.warnings.filter((w) => w !== "OVERLAP_NOT_YET_VERIFIED"),
            ...(metadata.warnings ?? []),
          ],
        },
      });
      const environment = await save(
        Buffer.from(JSON.stringify(gltf)),
        "model/gltf+json",
        {
          kind: "environment",
          status: "candidate",
          sourceCaptureHash: report.sourceCaptureHash,
          referenceAssetIds: [image.id],
          manifest,
        },
      );
      const binary = await save(
        encodeEnvironmentGlb({
          gltf,
          texture: buffer,
          mimeType: image.mimeType,
        }),
        "model/gltf-binary",
        {
          kind: "environment_glb",
          status: "candidate",
          sourceCaptureHash: report.sourceCaptureHash,
          referenceAssetIds: [image.id],
          manifest,
        },
      );
      return {
        status: "needs_review",
        assets: [image, environment, binary],
        manifest,
      };
    }
    if (ANALYSIS_OPERATIONS.includes(job.operation))
      return await runAnalysis(job, p, { assets, gemini, save, assertOwnership });
    if (job.operation === "flow_handoff") {
      await assertOwnership();
      const handoff = buildFlowHandoff(p, job.options);
      const output = await save(
        Buffer.from(JSON.stringify(handoff, null, 2)),
        "application/json",
        {
          kind: "flow_handoff",
          status: "approved",
          sourceDesignHash: handoff.sourceDesignHash,
          ...(handoff.sourceShotHash
            ? { sourceShotHash: handoff.sourceShotHash }
            : {}),
          referenceAssetIds: [
            handoff.startFrameAssetId,
            ...handoff.componentReferences.map((r) => r.assetId),
          ],
        },
      );
      return { status: "awaiting_flow", assets: [output], handoff };
    }
    if (
      !GENERATIVE_OPERATIONS.includes(job.operation)
    )
      fail("INVALID_TASK", "Unknown pipeline operation");
    const { prompt, references, overlay, aspectRatio, placedBuffer } = await prepareGeneration(job, {
      assets,
      saveOverlay: save,
    });
    const viaFal = job.operation === "element_view" && job.options.provider === "fal";
    const place = job.operation === "region_edit" ? job.options.place : null;
    let generated;
    if (place && !place.harmonize) {
      // Exact paste, no AI call: the composite is the result.
      generated = { buffer: placedBuffer, mimeType: "image/png", provider: "local", model: "paste", telemetry: null };
    } else if (viaFal) {
      // fal renders the angle; Gemini still performs QA below. No silent provider fallback.
      generated = await (fal || new FalClient()).angles({
        buffer: references[0].buffer,
        mimeType: references[0].mimeType,
        horizontalAngle: job.options.azimuth,
        verticalAngle: job.options.elevation,
        zoom: job.options.zoom,
        note: job.options.note,
        assertOwnership,
      });
    } else {
      generationRequest({ text: prompt.text, references, aspectRatio });
      await assertOwnership();
      // Region edits: OpenAI gets an inpainting mask for the clean base (first reference); other providers ignore it.
      const mask =
        job.operation === "region_edit"
          ? await regionEditMask(references[0].buffer, job.options.regions)
          : undefined;
      // Presentation boards carry dense labels and tables; request the provider's top quality tier.
      const quality = job.operation === "component_sheet" && job.options?.viewType === "board" ? "high" : undefined;
      const fidelity = ["component_sheet", "element_view", "region_edit"].includes(job.operation) ? "high" : undefined;
      generated = await gemini.generate({ text: prompt.text, references, aspectRatio, mask, quality, fidelity });
    }
    let image = await normalizeImage(generated.buffer, {
      maxBytes: 24 * 1024 * 1024,
    });
    if (job.operation === "region_edit" && !(place && !place.harmonize)) {
      // Guarantee everything outside the pins stays exactly as the base.
      const base = placedBuffer || (await assets.read(job.options.baseAssetId));
      let merged = await compositeRegions(base, image.buffer, job.options.regions);
      // A placed object keeps its own pixels: the AI may only have added shadow and light around it.
      if (place?.mode === "shadows") merged = await pasteCutout(merged, await assets.read(place.cutoutAssetId), place);
      image = await normalizeImage(merged, { maxBytes: 24 * 1024 * 1024 });
    }
    await assertOwnership();
    let qa;
    try {
      qa =
        place && !place.harmonize
          ? { decision: "pass", reason: "Exact paste of the approved decor cut-out; no AI changes", issues: [] }
          : await gemini.assess({ prompt, references, image });
    } catch (error) {
      if (error.code === "WORKER_LEASE_LOST") throw error;
      qa = {
        decision: "review",
        reason:
          "Automated assessment incomplete; explicit human review required",
        issues: ["QA_INCOMPLETE"],
        errorCode: error.status ? error.code : "QA_UNAVAILABLE",
      };
    }
    await assertOwnership();
    const component = p.components?.find(
      (c) => c.id === job.options?.componentId,
    );
    let operationMeta = {};
    if (job.operation === "region_edit")
      operationMeta = {
        baseAssetId: job.options.baseAssetId,
        regions: job.options.regions.map((r) => ({
          ...r,
          referenceAssetIds: [...r.referenceAssetIds],
        })),
        ...(job.options.place ? { place: { ...job.options.place } } : {}),
      };
    else if (job.operation === "element_view") {
      const source = p.assets.find((a) => a.id === job.options.sourceAssetId);
      operationMeta = {
        sourceAssetId: job.options.sourceAssetId,
        azimuth: job.options.azimuth,
        elevation: job.options.elevation,
        zoom: job.options.zoom,
        angleLabel: angleLabel(job.options),
        ...(source?.componentId ? { componentId: source.componentId } : {}),
      };
    }
    const output = await save(image.buffer, image.mimeType, {
      kind: job.operation,
      status:
        qa.decision === "reject"
          ? "rejected"
          : qa.decision === "review"
            ? "review"
            : "candidate",
      width: image.width,
      height: image.height,
      hash: image.hash,
      qa,
      templateVersion: TEMPLATE_VERSION,
      provider: generated.provider,
      model: generated.model,
      generationTelemetry: generated.telemetry || null,
      referenceAssetIds: prompt.references.map((r) => r.assetId),
      ...(job.options?.viewType ? { viewType: job.options.viewType } : {}),
      ...(job.operation === "component_sheet" && job.options?.viewType === "placed" ? { azimuth: job.options.azimuth, elevation: job.options.elevation } : {}),
      ...(job.operation === "component_sheet" && (job.options?.viewType ?? "full_sheet") === "full_sheet" ? { sheetLayout: SHEET_LAYOUT } : {}),
      ...operationMeta,
      ...(component
        ? {
            componentId: component.id,
            sourceComponentHash: componentHash(component),
          }
        : { sourceDesignHash: designHash(job.snapshot) }),
      prompt: prompt.text,
    });
    return {
      status: "needs_review",
      assets: [...(overlay ? [overlay] : []), output],
    };
  } catch (error) {
    await Promise.all(created.map((id) => assets.remove(id)));
    throw error;
  }
}
