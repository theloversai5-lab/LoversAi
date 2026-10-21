import React, { useMemo, useState } from "react";
import AssetImage from "./AssetImage";
import { Button, Cost, ErrorNotice, JobLine, Notice, Panel, StatusBadge, Verdict } from "./ui";
import { byNewest, GROUND_VIEWS } from "./constants";

const APPROVE_REASON = "Planner approved this isometric venue view as the base";

export function venueIsometricSources(project) {
  const venue = (project.assets || [])
    .filter((a) => a.kind === "venue" && a.status === "approved")
    .sort(byNewest);
  const ground = GROUND_VIEWS.map((v) => venue.find((a) => a.view === v)).filter(Boolean);
  const satellite = venue.find((a) => a.view === "satellite");
  return { ground, satellite, ids: [...ground, ...(satellite ? [satellite] : [])].map((a) => a.id) };
}

export default function IsometricStep({ ctx, onNext }) {
  const { project, runJob, approve, latestJob, credits, costs } = ctx;
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const sources = useMemo(() => venueIsometricSources(project), [project]);
  const candidates = useMemo(
    () => (project.assets || []).filter((a) => a.kind === "venue_isometric").sort(byNewest),
    [project.assets],
  );
  const job = latestJob((j) => j.operation === "venue_isometric");
  const running = job && ["queued", "running"].includes(job.status);
  const hasApproved = candidates.some((a) => a.status === "approved");

  const generate = async (actionId) => {
    setBusy("generate");
    setError(null);
    try {
      await runJob(actionId, "venue_isometric", { venueAssetIds: sources.ids });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const doApprove = async (asset) => {
    setBusy(asset.id);
    setError(null);
    try {
      await approve(asset.id, APPROVE_REASON);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const enough = sources.ground.length >= 4;
  return (
    <Panel
      title="2. Isometric venue"
      actions={
        <>
          <Button
            onClick={() => generate("iso-generate")}
            disabled={!enough || running || busy === "generate"}
          >
            {candidates.length ? "Regenerate" : "Generate isometric"} <Cost amount={costs.venue_isometric} />
          </Button>
          <Button variant="secondary" onClick={onNext} disabled={!hasApproved}>
            Continue
          </Button>
        </>
      }
    >
      {!enough && <Notice tone="warn">Approve all four ground views in step 1 first.</Notice>}
      <p className="mb-4 text-xs text-white/50">
        Uses {sources.ground.length} ground view{sources.ground.length === 1 ? "" : "s"}
        {sources.satellite ? " and the satellite view" : ""}. The result is an illustrative drone-style view, not surveyed
        geometry.
      </p>
      <div className="space-y-2">
        <JobLine job={job} />
        <ErrorNotice error={error} cost={costs.venue_isometric} credits={credits} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {candidates.map((a) => (
          <div key={a.id} className="rounded-md border border-[#222]">
            <AssetImage projectId={project._id} assetId={a.id} className="aspect-[4/3] w-full bg-[#0a0a0a]" />
            <div className="space-y-2 border-t border-[#222] p-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={a.status} />
                {["candidate", "review"].includes(a.status) && (
                  <Button variant="secondary" onClick={() => doApprove(a)} disabled={busy === a.id}>
                    Approve
                  </Button>
                )}
              </div>
              <Verdict label="QA" verdict={a.qa} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
