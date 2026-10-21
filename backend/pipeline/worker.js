import dotenv from "dotenv";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PipelineJob, PipelineProject } from "./models.js";
import { MongoRepository } from "./repository.js";
import { AssetStore } from "./media.js";
import { createModelClient } from "./providers.js";
import { runStage } from "./stages.js";
import { PipelineError } from "./contracts.js";
import { defaultBillingAdapter } from "./billing.js";
dotenv.config({ quiet: true });

export async function processNextJob(deps, workerId) {
  const repo = deps.repository;
  await repo.reconcile();
  const job = await repo.claim(workerId);
  if (!job) return false;
  let lostLease = false;
  const heartbeat = setInterval(() => {
    repo
      .heartbeat(job.id, workerId)
      .then((ok) => {
        if (!ok) lostLease = true;
      })
      .catch(() => {
        lostLease = true;
      });
  }, 20000);
  heartbeat.unref();
  try {
    const assertOwnership = async () => {
      if (lostLease || !(await repo.heartbeat(job.id, workerId))) {
        lostLease = true;
        throw new PipelineError(
          "WORKER_LEASE_LOST",
          "Worker ownership was lost; no further provider calls will be started",
          409,
        );
      }
    };
    const result = await runStage(job, { ...deps, assertOwnership });
    if (lostLease) return true;
    const completed = await repo.finish(job.id, workerId, { result });
    if (completed) await repo.publish(completed);
  } catch (error) {
    // Failed/uncertain work is never put back on the queue automatically.
    const completed = await repo.finish(job.id, workerId, {
      error: {
        code: error.status ? error.code : "PIPELINE_FAILED",
        message: error.status
          ? error.message
          : "Pipeline operation failed; review worker configuration and job inputs",
        ...(["OVERLAP_REQUIRED", "STITCH_FAILED"].includes(error.code) &&
        error.captureDiagnostics
          ? { captureDiagnostics: error.captureDiagnostics }
          : {}),
      },
    });
    if (completed) await repo.publish(completed);

    // Billing refund for billed jobs that failed without producing any output.
    // Never refund on WORKER_LEASE_LOST (uncertain outcome) or needs_review (output may exist).
    const isLeaseLost = error.code === "WORKER_LEASE_LOST";
    const isUncertain = completed?.status === "needs_review";
    const hasOutput = (completed?.result?.assets?.length ?? 0) > 0;
    const billing = deps.billing;
    const billingRecord = job.billing;
    if (
      billing &&
      billingRecord &&
      !isLeaseLost &&
      !isUncertain &&
      !hasOutput
    ) {
      try {
        await billing.refund({
          userId: billingRecord.userId,
          amount: billingRecord.amount,
          reference: billingRecord.reference,
          metadata: {
            projectId: job.projectId,
            operation: job.operation,
            reason: "job_failed",
          },
        });
      } catch (refundErr) {
        console.error(
          "Billing refund failed for job",
          job.id,
          ":",
          refundErr.message,
        );
      }
    }
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
export async function startWorker(billingAdapter = defaultBillingAdapter) {
  if (process.env.WEDDING_PIPELINE_ENABLED !== "true")
    throw new Error(
      "Set WEDDING_PIPELINE_ENABLED=true to explicitly start the wedding worker",
    );
  if (!process.env.MONGO_URI)
    throw new Error(
      "A persistent MONGO_URI is required; the pipeline worker never seeds users or starts an ephemeral database",
    );
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([PipelineJob.init(), PipelineProject.init()]);
  const deps = {
      repository: new MongoRepository(),
      assets: new AssetStore(),
      gemini: createModelClient(),
      billing: billingAdapter,
    },
    workerId = randomUUID();
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  console.log(
    "Wedding pipeline worker started. Google Flow mode: explicit handoff.",
  );
  try {
    while (!stopping) {
      try {
        if (!(await processNextJob(deps, workerId))) await sleep(1500);
      } catch (error) {
        console.error(
          "Wedding worker iteration failed:",
          error.code || error.name,
        );
        await sleep(3000);
      }
    }
  } finally {
    process.off("SIGTERM", stop);
    process.off("SIGINT", stop);
    await mongoose.disconnect();
  }
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
)
  startWorker().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
