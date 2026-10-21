import { useCallback, useEffect, useRef, useState } from "react";
import { pipelineAPI, newRequestKey } from "../../../api/pipelineApi";
import { paymentAPI } from "../../../api/api";
import useJobPolling from "./useJobPolling";
import { clearAssetCache } from "./AssetImage";
import { COSTS, STORAGE_KEY } from "./constants";

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
const writeStored = (id) => {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable; resume simply won't work.
  }
};

const isRevisionConflict = (e) => e?.status === 409 && e?.code === "REVISION_CONFLICT";
const isRetriable = (e) => !e?.status || e.status >= 500;

export default function usePitchProject() {
  const [phase, setPhase] = useState("loading"); // loading | disabled | error | none | ready
  const [loadError, setLoadError] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [project, setProjectState] = useState(null);
  const [credits, setCredits] = useState(null);
  const [jobs, setJobs] = useState({});
  const projectRef = useRef(null);
  const pending = useRef(new Map());

  const setProject = useCallback((p) => {
    projectRef.current = p;
    setProjectState(p);
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const data = await paymentAPI.getCredits("planner");
      if (data?.success !== false) setCredits(Number(data?.credits) || 0);
    } catch {
      // Balance display is advisory; enqueue enforces credits server-side.
    }
  }, []);

  const refresh = useCallback(async () => {
    const id = projectRef.current?._id;
    if (!id) return null;
    const p = await pipelineAPI.getProject(id);
    setProject(p);
    return p;
  }, [setProject]);

  const trackJob = useCallback((job) => {
    if (job?.id) setJobs((prev) => ({ ...prev, [job.id]: job }));
  }, []);

  const loadJobs = useCallback(
    async (p) => {
      let list = [];
      try {
        list = await pipelineAPI.listJobs(p._id);
      } catch {
        list = (
          await Promise.all(
            (p.activeJobs || []).map((id) => pipelineAPI.getJob(p._id, id).catch(() => null)),
          )
        ).filter(Boolean);
      }
      setJobs(Object.fromEntries(list.map((j) => [j.id, j])));
    },
    [],
  );

  const openProject = useCallback(
    async (id) => {
      const p = await pipelineAPI.getProject(id);
      clearAssetCache();
      pending.current.clear();
      setProject(p);
      writeStored(p._id);
      setPhase("ready");
      loadJobs(p);
      return p;
    },
    [loadJobs, setProject],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const caps = await pipelineAPI.capabilities();
        if (!alive) return;
        setCapabilities(caps);
      } catch (e) {
        if (!alive) return;
        if (e.status === 404) setPhase("disabled");
        else {
          setLoadError(e);
          setPhase("error");
        }
        return;
      }
      refreshCredits();
      const stored = readStored();
      if (!stored) return setPhase("none");
      try {
        await openProject(stored);
      } catch (e) {
        if (!alive) return;
        if (e.status === 404) {
          writeStored(null);
          setPhase("none");
        } else {
          setLoadError(e);
          setPhase("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [openProject, refreshCredits]);

  useJobPolling(project?._id, jobs, (job, settled) => {
    const prev = jobs[job.id];
    trackJob(job);
    if (settled && prev && prev.status !== job.status) {
      refresh().catch(() => {});
      if (COSTS[job.operation]) refreshCredits();
    }
  });

  const createProject = useCallback(
    async (brief) => {
      const p = await pipelineAPI.createProject(brief);
      clearAssetCache();
      pending.current.clear();
      setJobs({});
      setProject(p);
      writeStored(p._id);
      setPhase("ready");
      return p;
    },
    [setProject],
  );

  const resetProject = useCallback(() => {
    writeStored(null);
    clearAssetCache();
    pending.current.clear();
    setJobs({});
    setProject(null);
    setPhase("none");
  }, [setProject]);

  // fn(revision) -> Promise<project | {project}>. Retries once on a stale revision.
  const mutate = useCallback(
    async (fn) => {
      let revision = projectRef.current.revision;
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await fn(revision);
          const p = result?.project || result;
          if (p?._id) setProject(p);
          return result;
        } catch (e) {
          if (isRevisionConflict(e) && attempt === 0) {
            revision = (await refresh()).revision;
            continue;
          }
          throw e;
        }
      }
    },
    [refresh, setProject],
  );

  const approve = useCallback(
    (assetId, reason) =>
      mutate((rev) => pipelineAPI.approveAsset(projectRef.current._id, rev, assetId, reason)),
    [mutate],
  );

  const updateProject = useCallback(
    (changes) =>
      mutate((rev) => pipelineAPI.updateProject(projectRef.current._id, rev, changes)),
    [mutate],
  );

  const upload = useCallback(
    (files, meta) =>
      mutate((rev) => pipelineAPI.uploadAssets(projectRef.current._id, rev, files, meta)),
    [mutate],
  );

  /**
   * Enqueue a job for a user action. The requestKey is generated per action and
   * reused when the same action is retried after a network/server failure, so
   * the backend can return the original job instead of charging again.
   * prepare(): optional async step (e.g. canvas PATCH) returning the revision to enqueue against.
   */
  const runJob = useCallback(
    async (actionId, operation, options = {}, { prepare } = {}) => {
      const id = projectRef.current._id;
      const signature = JSON.stringify([operation, options]);
      let entry = pending.current.get(actionId);
      if (!entry || entry.signature !== signature)
        entry = { requestKey: newRequestKey(), revision: null, signature };
      for (let attempt = 0; ; attempt++) {
        if (entry.revision == null)
          entry.revision = prepare ? await prepare() : projectRef.current.revision;
        try {
          const job = await pipelineAPI.enqueueJob(id, {
            revision: entry.revision,
            requestKey: entry.requestKey,
            operation,
            options,
          });
          pending.current.delete(actionId);
          trackJob(job);
          refresh().catch(() => {});
          if (COSTS[operation]) refreshCredits();
          return job;
        } catch (e) {
          if (isRevisionConflict(e) && attempt === 0) {
            // No job exists for this key (the key lookup precedes the revision check).
            entry.revision = prepare ? null : (await refresh()).revision;
            continue;
          }
          if (isRetriable(e)) pending.current.set(actionId, entry);
          else pending.current.delete(actionId);
          throw e;
        }
      }
    },
    [refresh, refreshCredits, trackJob],
  );

  const latestJob = useCallback(
    (predicate) =>
      Object.values(jobs)
        .filter(predicate)
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] ||
      null,
    [jobs],
  );

  const costs = Object.fromEntries(
    Object.entries(COSTS).map(([op, fallback]) => [
      op,
      capabilities?.operations?.[op]?.creditCost ?? fallback,
    ]),
  );

  return {
    phase,
    costs,
    loadError,
    capabilities,
    project,
    credits,
    jobs,
    refresh,
    refreshCredits,
    createProject,
    openProject,
    resetProject,
    approve,
    updateProject,
    upload,
    runJob,
    latestJob,
  };
}
