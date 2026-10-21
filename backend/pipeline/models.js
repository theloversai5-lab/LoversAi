import mongoose from "mongoose";
const { Schema } = mongoose;
const project = new Schema(
  {
    _id: String,
    ownerId: { type: String, required: true, index: true },
    collaborators: [String],
    revision: { type: Number, required: true, default: 0 },
    brief: Schema.Types.Mixed,
    components: [Schema.Types.Mixed],
    canvas: Schema.Types.Mixed,
    venueCapture: Schema.Types.Mixed,
    physicalCapture: Schema.Types.Mixed,
    scene3d: Schema.Types.Mixed,
    flowShot: Schema.Types.Mixed,
    assets: [Schema.Types.Mixed],
    activeJobs: [String],
  },
  { timestamps: true },
);
const job = new Schema(
  {
    _id: String,
    id: { type: String, required: true },
    projectId: { type: String, required: true, index: true },
    actorId: String,
    requestKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    operation: {
      type: String,
      enum: [
        "screen_assets",
        "panorama",
        "component_sheet",
        "showcase",
        "flow_handoff",
        "lens_calibration",
        "hdr_merge",
        "venue_reconstruction",
        "scene_showcase",
        "venue_isometric",
        "venue_360",
        "layout_plan",
        "component_specs",
        "placement",
        "region_edit",
        "element_view",
      ],
      required: true,
    },
    snapshot: Schema.Types.Mixed,
    options: Schema.Types.Mixed,
    status: {
      type: String,
      enum: [
        "queued",
        "running",
        "succeeded",
        "needs_review",
        "awaiting_flow",
        "failed",
      ],
      default: "queued",
      index: true,
    },
    leaseOwner: String,
    leaseUntil: Date,
    result: Schema.Types.Mixed,
    error: Schema.Types.Mixed,
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);
job.index({ projectId: 1, requestKey: 1 }, { unique: true });
job.index({ status: 1, createdAt: 1 });
export const PipelineProject =
  mongoose.models.WeddingPipelineProject ||
  mongoose.model("WeddingPipelineProject", project);
export const PipelineJob =
  mongoose.models.WeddingPipelineJob ||
  mongoose.model("WeddingPipelineJob", job);

// Provider usage for synchronous calls that create no asset (e.g. region suggestions).
const usage = new mongoose.Schema(
  {
    projectId: { type: String, required: true, index: true },
    operation: { type: String, required: true },
    kind: { type: String, enum: ["image", "vision"], default: "vision" },
    telemetry: { type: mongoose.Schema.Types.Mixed, default: null },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
export const PipelineUsage =
  mongoose.models.WeddingPipelineUsage ||
  mongoose.model("WeddingPipelineUsage", usage);