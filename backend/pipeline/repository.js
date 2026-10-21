import mongoose from "mongoose";
import { PipelineProject, PipelineJob, PipelineUsage } from "./models.js";
import { PipelineError } from "./contracts.js";
import User from "../models/User.js";

export class MongoRepository {
  createProject(p) {
    return PipelineProject.create(p).then((d) => d.toObject());
  }
  getProject(id) {
    return PipelineProject.findById(id).lean();
  }
  casProject(id, revision, p) {
    const { _id, createdAt, updatedAt, __v, ...fields } = p;
    return PipelineProject.findOneAndUpdate(
      { _id: id, revision },
      { $set: { ...fields, revision: revision + 1 } },
      { returnDocument: "after", runValidators: true },
    ).lean();
  }
  createJob(job) {
    return PipelineJob.create({ ...job, _id: job.id }).then((d) =>
      d.toObject(),
    );
  }
  getJob(id) {
    return PipelineJob.findById(id).lean();
  }
  findJobByKey(projectId, requestKey) {
    return PipelineJob.findOne({ projectId, requestKey }).lean();
  }
  recordUsage(entry) {
    return PipelineUsage.create(entry);
  }
  listUsage(projectId) {
    return PipelineUsage.find({ projectId }).sort({ at: 1 }).limit(5000).lean();
  }
  listJobs(projectId, limit = 20) {
    return PipelineJob.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
  releaseSlot(projectId, jobId) {
    return PipelineProject.updateOne(
      { _id: projectId },
      { $pull: { activeJobs: jobId }, $inc: { revision: 1 } },
    );
  }
  resolveUser(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return User.findOne({
      _id: id,
      isBlocked: { $ne: true },
      role: { $in: ["planner", "vendor", "couple"] },
    })
      .select("_id role")
      .lean();
  }
  claim(workerId, now = new Date()) {
    // Also reclaim jobs whose worker died mid-run (lease expired), so they never hang as "running".
    return PipelineJob.findOneAndUpdate(
      {
        $or: [
          { status: "queued" },
          { status: "running", leaseUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          status: "running",
          leaseOwner: workerId,
          leaseUntil: new Date(now.getTime() + 90000),
        },
      },
      { sort: { createdAt: 1 }, returnDocument: "after" },
    ).lean();
  }
  heartbeat(id, workerId) {
    return PipelineJob.updateOne(
      {
        _id: id,
        status: "running",
        leaseOwner: workerId,
        leaseUntil: { $gt: new Date() },
      },
      { $set: { leaseUntil: new Date(Date.now() + 90000) } },
    ).then((r) => r.modifiedCount === 1);
  }
  finish(id, workerId, { result, error }) {
    return PipelineJob.findOneAndUpdate(
      {
        _id: id,
        status: "running",
        leaseOwner: workerId,
        leaseUntil: { $gt: new Date() },
      },
      {
        $set: {
          status: error ? "failed" : result.status,
          result: result || null,
          error: error || null,
        },
        $unset: { leaseOwner: 1, leaseUntil: 1 },
      },
      { returnDocument: "after" },
    ).lean();
  }
  async publish(job) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const p = await this.getProject(job.projectId);
      if (!p) return;
      const next = structuredClone(p);
      for (const asset of job.result?.assets || [])
        if (!next.assets.some((a) => a.id === asset.id))
          next.assets.push(asset);
      for (const update of job.result?.assetUpdates || []) {
        const asset = next.assets.find((a) => a.id === update.id);
        if (asset?.status === "pending_screen") Object.assign(asset, update);
      }
      next.activeJobs = next.activeJobs.filter((id) => id !== job.id);
      if (await this.casProject(p._id, p.revision, next)) {
        await PipelineJob.updateOne(
          { _id: job.id },
          { $set: { published: true } },
        );
        return;
      }
    }
    throw new PipelineError(
      "PUBLICATION_CONFLICT",
      "Job result publication will be retried",
      503,
    );
  }
  async reconcile() {
    await PipelineJob.updateMany(
      { status: "running", leaseUntil: { $lt: new Date() } },
      {
        $set: {
          status: "needs_review",
          error: {
            code: "WORKER_INTERRUPTED",
            message:
              "Worker lease expired; provider completion is uncertain. Review before submitting a new request.",
          },
        },
        $unset: { leaseOwner: 1, leaseUntil: 1 },
      },
    );
    const unpublished = await PipelineJob.find({
      status: { $in: ["succeeded", "needs_review", "awaiting_flow", "failed"] },
      published: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .limit(30)
      .lean();
    for (const job of unpublished) await this.publish(job);
    // Repair a crash between reserving a project slot and inserting its job.
    const reserved = await PipelineProject.find({
      "activeJobs.0": { $exists: true },
      updatedAt: { $lt: new Date(Date.now() - 120000) },
    })
      .limit(30)
      .lean();
    for (const p of reserved) {
      for (const id of p.activeJobs)
        if (!(await this.getJob(id))) await this.releaseSlot(p._id, id);
    }
  }
}
