// Wedding pipeline ("Pitch with AI") API wrapper. Auth/base URL come from api.js.
import { apiFetch } from "./api";

const BASE = "/wedding-pipeline";
const LONG = 120000;

export class PipelineApiError extends Error {
  constructor({ status, code, message, data }) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const blobText = async (data) => {
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
};

const call = async (endpoint, options = {}) => {
  try {
    return await apiFetch(`${BASE}${endpoint}`, options);
  } catch (error) {
    if (!error.response) {
      throw new PipelineApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: error.message || "Network error",
      });
    }
    let data = error.response.data;
    if (typeof Blob !== "undefined" && data instanceof Blob) data = await blobText(data);
    throw new PipelineApiError({
      status: error.response.status,
      code: data?.code || `HTTP_${error.response.status}`,
      message: data?.error || data?.message || `Request failed (${error.response.status})`,
      data,
    });
  }
};

export const newRequestKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

export const pipelineAPI = {
  capabilities: () => call("/capabilities"),
  createProject: (brief = {}) =>
    call("/projects", { method: "POST", data: { brief } }).then((r) => r.project),
  getProject: (id) => call(`/projects/${id}`).then((r) => r.project),
  updateProject: (id, revision, changes) =>
    call(`/projects/${id}`, { method: "PATCH", data: { revision, changes } }).then(
      (r) => r.project,
    ),
  // files: File[]; views: string[] matching files; kind: "venue" | "decor"
  uploadAssets: (id, revision, files, { kind, views }) => {
    const form = new FormData();
    files.forEach((f) => form.append("images", f));
    form.append("kind", kind);
    form.append("views", JSON.stringify(views));
    form.append("revision", String(revision));
    return call(`/projects/${id}/assets`, {
      method: "POST",
      data: form,
      timeout: LONG,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  approveAsset: (id, revision, assetId, reason) =>
    call(`/projects/${id}/assets/${assetId}/approve`, {
      method: "POST",
      data: { revision, reason },
    }).then((r) => r.project),
  assetBlob: (id, assetId) =>
    call(`/projects/${id}/assets/${assetId}`, { responseType: "blob", timeout: LONG }),
  enqueueJob: (id, body) =>
    call(`/projects/${id}/jobs`, { method: "POST", data: body, timeout: 60000 }).then(
      (r) => r.job,
    ),
  getJob: (id, jobId) => call(`/projects/${id}/jobs/${jobId}`).then((r) => r.job),
  listJobs: (id) => call(`/projects/${id}/jobs`).then((r) => r.jobs || []),
  flowDelivery: (id) => call(`/projects/${id}/flow-delivery`),
  flowPackage: (id, handoffAssetId, revision) =>
    call(`/projects/${id}/flow/${handoffAssetId}/package`, {
      method: "POST",
      data: { revision },
      responseType: "blob",
      timeout: LONG,
    }),
};

export const TERMINAL_JOB_STATES = ["succeeded", "needs_review", "awaiting_flow", "failed"];
