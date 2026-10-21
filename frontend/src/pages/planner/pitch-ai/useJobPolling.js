import { useEffect, useRef } from "react";
import { pipelineAPI, TERMINAL_JOB_STATES } from "../../../api/pipelineApi";

const INTERVAL_MS = 2500;

// Polls every non-terminal job in `jobs` until it settles. onUpdate(job, settled) fires per fetch.
export default function useJobPolling(projectId, jobs, onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const activeIds = Object.values(jobs)
    .filter((j) => !TERMINAL_JOB_STATES.includes(j.status))
    .map((j) => j.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!projectId || !activeIds) return undefined;
    let cancelled = false;
    let inFlight = false;
    const ids = activeIds.split(",");
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await Promise.all(
          ids.map(async (id) => {
            try {
              const job = await pipelineAPI.getJob(projectId, id);
              if (!cancelled) onUpdateRef.current(job, TERMINAL_JOB_STATES.includes(job.status));
            } catch {
              // Transient poll failure: try again on the next tick.
            }
          }),
        );
      } finally {
        inFlight = false;
      }
    };
    const timer = setInterval(tick, INTERVAL_MS);
    tick();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId, activeIds]);
}
