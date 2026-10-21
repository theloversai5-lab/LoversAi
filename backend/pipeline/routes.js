import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { fail } from "./contracts.js";
import { TEMPLATE_VERSION } from "./prompts.js";
import { MAX_VIDEO_BYTES } from "./video.js";

export function createPipelineRouter({ service, authenticate }) {
  if (typeof authenticate !== "function")
    throw new Error("Pipeline authentication middleware is required");
  const router = express.Router(),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5,
        fields: 5,
        fieldSize: 16384,
      },
    });
  router.use(authenticate);
  const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_VIDEO_BYTES,
      files: 1,
      fields: 2,
      fieldSize: 1024,
      parts: 4,
    },
  });
  // Reads (job polling, asset images) are cheap and frequent; writes stay tightly limited.
  const limiter = (limit, skip) =>
    rateLimit({
      windowMs: 60000,
      limit,
      skip,
      keyGenerator: (req) => String(req.user._id),
      standardHeaders: "draft-7",
      legacyHeaders: false,
    });
  router.use(limiter(300, (req) => req.method !== "GET"));
  router.use(limiter(30, (req) => req.method === "GET"));
  router.use((req, res, next) => {
    if (
      req.is("application/json") &&
      JSON.stringify(req.body || {}).length > 128 * 1024
    )
      return res.status(413).json({
        success: false,
        error: "Pipeline JSON requests are limited to 128 KiB",
      });
    next();
  });
  router.get("/capabilities", (_req, res) =>
    res.json({
      success: true,
      templateVersion: TEMPLATE_VERSION,
      videoProvider: "google_flow",
      videoMode: "handoff",
      flowDelivery: {
        referencePackage: true,
        manualVideoImport: true,
        ownerContinuityReview: true,
        providerOriginVerified: false,
      },
      trueHdri: false,
      reconstructedGeometry: false,
      venueEnvironments: {
        readiness: true,
        captureSelection: true,
        embeddedGlb: true,
        approvedPackage: true,
        measuredGeometry: false,
      },
      billingIntegrated: true,
      operations: {
        venue_isometric: { creditCost: 3 },
        component_sheet: { creditCost: 1 },
        component_board: { creditCost: 3 },
        placement: { creditCost: 2 },
        showcase: { creditCost: 2 },
        venue_360: { creditCost: 3 },
        layout_plan: { creditCost: 1 },
        component_specs: { creditCost: 1 },
        region_edit: { creditCost: 2 },
        element_view: { creditCost: 1 },
      },
      angleProviders: { gemini: true, fal: Boolean(process.env.FAL_KEY) },
      referenceImport: true,
      regionSuggestions: true,
      physicalVenues: {
        cameraCalibration: true,
        timedBracketHdr: true,
        fullSphericalHdriVerified: false,
        colmapReconstruction: true,
        measuredProxyScenes: true,
        geometricViewpoints: true,
        photorealViewpointsVerified: false,
      },
      limits: {
        imageBytes: 10 * 1024 * 1024,
        imagePixels: 40_000_000,
        sourceReferences: 13,
        qaTotalImages: 14,
        activeJobsPerProject: 2,
        flowBundleBytes: 64 * 1024 * 1024,
        videoBytes: MAX_VIDEO_BYTES,
      },
      imageModel: service.gemini?.imageModel || null,
      visionModel: service.gemini?.visionModel || null,
    }),
  );
  router.post("/projects", async (req, res) =>
    res.status(201).json({
      success: true,
      project: await service.create(req.user, req.body.brief),
    }),
  );
  router.param("projectId", async (req, res, next, projectId) => {
    try {
      await service.get(projectId, req.user);
      next();
    } catch (e) {
      next(e);
    }
  });
  router.get("/projects/:projectId", async (req, res) =>
    res.json({
      success: true,
      project: await service.get(req.params.projectId, req.user),
    }),
  );
  router.post("/projects/:projectId/preview", async (req, res) =>
    res.set("Cache-Control", "private, no-store").json({
      success: true,
      preview: await service.preview(req.params.projectId, req.user, req.body),
    }),
  );
  router.post("/projects/:projectId/references/import", async (req, res) => {
    const output = await service.importReference(
      req.params.projectId,
      req.user,
      req.body,
    );
    res.status(output.duplicate ? 200 : 201).json({ success: true, ...output });
  });
  router.post("/projects/:projectId/suggest", async (req, res) =>
    res.set("Cache-Control", "private, no-store").json({
      success: true,
      ...(await service.suggest(req.params.projectId, req.user, req.body)),
    }),
  );
  router.get("/projects/:projectId/costs", async (req, res) =>
    res.set("Cache-Control", "private, no-store").json({
      success: true,
      ...(await service.costs(req.params.projectId, req.user)),
    }),
  );
  router.get("/projects/:projectId/venue-readiness", async (req, res) =>
    res.set("Cache-Control", "private, no-store").json({
      success: true,
      readiness: await service.venueReadiness(req.params.projectId, req.user),
    }),
  );
  router.patch("/projects/:projectId/physical-capture", async (req, res) => {
    if (
      !req.body ||
      Object.keys(req.body).some((k) => !["revision", "capture"].includes(k))
    )
      fail("INVALID_REQUEST", "Provide revision and capture patch");
    res.json({
      success: true,
      project: await service.setPhysicalCapture(
        req.params.projectId,
        req.user,
        req.body.revision,
        req.body.capture,
      ),
    });
  });
  router.get("/projects/:projectId/physical-readiness", async (req, res) =>
    res
      .set("Cache-Control", "private, no-store")
      .json({
        success: true,
        ...(await service.physicalReadiness(req.params.projectId, req.user)),
      }),
  );
  router.put("/projects/:projectId/scene3d", async (req, res) => {
    if (
      !req.body ||
      Object.keys(req.body).some((k) => !["revision", "scene"].includes(k))
    )
      fail("INVALID_REQUEST", "Provide revision and scene");
    res.json({
      success: true,
      project: await service.setScene3d(
        req.params.projectId,
        req.user,
        req.body.revision,
        req.body.scene,
      ),
    });
  });
  router.get("/projects/:projectId/scene3d", async (req, res) =>
    res
      .set("Cache-Control", "private, no-store")
      .json({
        success: true,
        ...(await service.scene3d(req.params.projectId, req.user)),
      }),
  );
  router.post(
    "/projects/:projectId/scene3d/:assetId/package",
    async (req, res) => {
      const output = await service.scenePackage(
        req.params.projectId,
        req.user,
        req.params.assetId,
        req.body,
      );
      res
        .set({
          "Content-Type": "application/zip",
          "Content-Length": String(output.buffer.length),
          "Content-Disposition": `attachment; filename="${output.filename}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .send(output.buffer);
    },
  );
  router.put("/projects/:projectId/flow-shot", async (req, res) => {
    if (
      !req.body ||
      Object.keys(req.body).some((k) => !["revision", "shot"].includes(k))
    )
      fail("INVALID_REQUEST", "Provide revision and shot");
    res.json({
      success: true,
      project: await service.setFlowShot(
        req.params.projectId,
        req.user,
        req.body.revision,
        req.body.shot,
      ),
    });
  });
  router.get("/projects/:projectId/flow-delivery", async (req, res) =>
    res
      .set("Cache-Control", "private, no-store")
      .json({
        success: true,
        ...(await service.flowDeliveryStatus(req.params.projectId, req.user)),
      }),
  );
  router.put("/projects/:projectId/venue-capture", async (req, res) => {
    if (
      !req.body ||
      Object.keys(req.body).some((k) => !["revision", "capture"].includes(k))
    )
      fail("INVALID_REQUEST", "Provide revision and capture settings");
    res.json({
      success: true,
      project: await service.setVenueCapture(
        req.params.projectId,
        req.user,
        req.body.revision,
        req.body.capture,
      ),
    });
  });
  router.get("/projects/:projectId/environments", async (req, res) =>
    res.set("Cache-Control", "private, no-store").json({
      success: true,
      ...(await service.environments(req.params.projectId, req.user)),
    }),
  );
  router.post(
    "/projects/:projectId/environments/:assetId/package",
    async (req, res) => {
      const output = await service.environmentPackage(
        req.params.projectId,
        req.user,
        req.params.assetId,
        req.body,
      );
      res
        .set({
          "Content-Type": "application/zip",
          "Content-Length": String(output.buffer.length),
          "Content-Disposition": `attachment; filename="${output.filename}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .send(output.buffer);
    },
  );
  router.post(
    "/projects/:projectId/flow/:handoffAssetId/package",
    async (req, res) => {
      const output = await service.flowPackage(
        req.params.projectId,
        req.user,
        req.params.handoffAssetId,
        req.body,
      );
      res
        .set({
          "Content-Type": "application/zip",
          "Content-Length": String(output.buffer.length),
          "Content-Disposition": `attachment; filename="${output.filename}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .send(output.buffer);
    },
  );
  router.post(
    "/projects/:projectId/flow/:handoffAssetId/videos",
    videoUpload.single("video"),
    async (req, res) => {
      if (
        !req.file ||
        !req.body.revision ||
        Object.keys(req.body).some(
          (k) => !["revision", "attestation"].includes(k),
        )
      )
        fail("INVALID_REQUEST", "Provide video, revision and Flow attestation");
      res.status(201).json({
        success: true,
        ...(await service.importFlowVideo(
          req.params.projectId,
          req.user,
          Number(req.body.revision),
          req.params.handoffAssetId,
          req.file.buffer,
          req.body.attestation,
        )),
      });
    },
  );
  router.post(
    "/projects/:projectId/flow/videos/:assetId/review",
    async (req, res) =>
      res.json({
        success: true,
        project: await service.reviewFlowVideo(
          req.params.projectId,
          req.user,
          req.params.assetId,
          req.body,
        ),
      }),
  );
  router.patch("/projects/:projectId", async (req, res) =>
    res.json({
      success: true,
      project: await service.update(
        req.params.projectId,
        req.user,
        req.body.revision,
        req.body.changes,
      ),
    }),
  );
  router.put("/projects/:projectId/collaborators", async (req, res) =>
    res.json({
      success: true,
      project: await service.collaborators(
        req.params.projectId,
        req.user,
        req.body.revision,
        req.body.userIds,
      ),
    }),
  );
  router.post(
    "/projects/:projectId/assets",
    upload.array("images", 5),
    async (req, res) => {
      let views;
      try {
        views = JSON.parse(req.body.views || "[]");
      } catch {
        fail(
          "INVALID_VIEW",
          "views must be a JSON array matching the uploaded files",
        );
      }
      const revision = Number(req.body.revision);
      if (req.body.revision === undefined)
        fail("REVISION_CONFLICT", "A project revision is required", 409);
      res.status(201).json({
        success: true,
        ...(await service.upload(
          req.params.projectId,
          req.user,
          revision,
          req.files,
          { kind: req.body.kind, views },
        )),
      });
    },
  );
  router.post("/projects/:projectId/assets/:assetId/split", async (req, res) =>
    res.status(201).json({
      success: true,
      ...(await service.splitSheet(req.params.projectId, req.user, req.body.revision, req.params.assetId)),
    }),
  );
  router.post(
    "/projects/:projectId/assets/:assetId/approve",
    async (req, res) =>
      res.json({
        success: true,
        project: await service.approve(
          req.params.projectId,
          req.user,
          req.body.revision,
          req.params.assetId,
          req.body.reason,
          req.body.override === true,
        ),
      }),
  );
  router.get("/projects/:projectId/assets/:assetId", async (req, res) => {
    const { asset, buffer } = await service.asset(
      req.params.projectId,
      req.user,
      req.params.assetId,
    );
    const extension =
      {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/vnd.radiance": ".hdr",
        "model/gltf+json": ".gltf",
        "model/gltf-binary": ".glb",
        "application/json": ".json",
        "video/mp4": ".mp4",
      }[asset.mimeType] ?? "";
    res
      .set({
        "Content-Type": asset.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType) ? "inline" : "attachment"}; filename="${asset.id}${extension}"`,
      })
      .send(buffer);
  });
  router.post("/projects/:projectId/jobs", async (req, res) => {
    const job = await service.enqueue(req.params.projectId, req.user, req.body);
    res.status(202).json({
      success: true,
      job: await service.job(req.params.projectId, req.user, job.id),
    });
  });
  router.get("/projects/:projectId/jobs/:jobId", async (req, res) =>
    res.json({
      success: true,
      job: await service.job(req.params.projectId, req.user, req.params.jobId),
    }),
  );
  router.get("/projects/:projectId/jobs", async (req, res) =>
    res.json({
      success: true,
      jobs: await service.jobs(req.params.projectId, req.user),
    }),
  );
  router.use((error, req, res, _next) => {
    const multipart = error instanceof multer.MulterError;
    // Map INSUFFICIENT_CREDITS to 402
    const status =
      error.code === "INSUFFICIENT_CREDITS"
        ? 402
        : error.status || (multipart ? 413 : 500);
    if (status >= 500)
      console.error(
        "Wedding pipeline request failed:",
        error.code || error.name,
      );
    res.status(status).json({
      success: false,
      code: multipart
        ? "UPLOAD_LIMIT"
        : error.status || error.code === "INSUFFICIENT_CREDITS"
          ? error.code
          : "PIPELINE_ERROR",
      error: multipart
        ? "Upload exceeds file/count/field limits"
        : error.status || error.code === "INSUFFICIENT_CREDITS"
          ? error.message
          : "Pipeline request failed",
    });
  });
  return router;
}
