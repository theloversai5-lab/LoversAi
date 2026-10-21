export class MemoryRepository {
  projects = new Map();
  jobs = new Map();
  async createProject(p) {
    this.projects.set(p._id, structuredClone(p));
    return structuredClone(p);
  }
  async getProject(id) {
    return structuredClone(this.projects.get(id) || null);
  }
  async casProject(id, revision, p) {
    const old = this.projects.get(id);
    if (!old || old.revision !== revision) return null;
    const next = { ...structuredClone(p), revision: revision + 1 };
    this.projects.set(id, next);
    return structuredClone(next);
  }
  async findJobByKey(projectId, key) {
    return structuredClone(
      [...this.jobs.values()].find(
        (j) => j.projectId === projectId && j.requestKey === key,
      ) || null,
    );
  }
  async createJob(job) {
    this.jobs.set(job.id, structuredClone(job));
    return structuredClone(job);
  }
  async getJob(id) {
    return structuredClone(this.jobs.get(id) || null);
  }
  async recordUsage(entry) {
    (this.usage ||= []).push({ at: new Date(), ...entry });
  }
  async listUsage(projectId) {
    return (this.usage || []).filter((u) => u.projectId === projectId);
  }
  async listJobs(projectId, limit = 20) {
    return structuredClone(
      [...this.jobs.values()]
        .filter((j) => j.projectId === projectId)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, limit),
    );
  }
  async releaseSlot(projectId, jobId) {
    const p = this.projects.get(projectId);
    p.activeJobs = p.activeJobs.filter((id) => id !== jobId);
    p.revision++;
  }
  async resolveUser(id) {
    return id === "vendor-user" ? { _id: id, role: "vendor" } : null;
  }
}
