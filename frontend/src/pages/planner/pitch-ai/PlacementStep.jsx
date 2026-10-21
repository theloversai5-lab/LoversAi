import React, { useMemo, useState } from "react";
import AssetImage from "./AssetImage";
import PlacementCanvas from "./PlacementCanvas";
import { Button, Cost, ErrorNotice, JobLine, Notice, Panel, StatusBadge, Verdict } from "./ui";
import { byNewest, currentBase, elementLabel, ELEMENTS } from "./constants";

const APPROVE_REASON = "Planner approved this placement as the next base";
const approvedAt = (a) => String(a.approval?.at || a.createdAt || "");

export default function PlacementStep({ ctx, onNext }) {
  const { project, runJob, approve, updateProject, latestJob, credits, costs } = ctx;
  const [componentId, setComponentId] = useState(null);
  const [place, setPlace] = useState([]);
  const [keep, setKeep] = useState([]);
  const [active, setActive] = useState("place");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const base = currentBase(project);
  const ready = ELEMENTS.filter((e) =>
    (project.components || []).some((c) => c.id === e.id && c.masterAssetId),
  );
  const selected = componentId || ready[0]?.id || null;
  const assets = useMemo(() => project.assets || [], [project.assets]);
  const placements = useMemo(
    () => assets.filter((a) => a.kind === "placement").sort(byNewest),
    [assets],
  );
  const history = useMemo(() => {
    const iso = assets
      .filter((a) => a.kind === "venue_isometric" && a.status === "approved")
      .sort((a, b) => approvedAt(b).localeCompare(approvedAt(a)))[0];
    const steps = assets
      .filter((a) => a.kind === "placement" && a.status === "approved")
      .sort((a, b) => approvedAt(a).localeCompare(approvedAt(b)));
    return iso ? [iso, ...steps] : steps;
  }, [assets]);
  const job = latestJob((j) => j.operation === "placement");
  const running = job && ["queued", "running"].includes(job.status);

  const layers = [
    { key: "place", action: "place", points: place, label: selected ? elementLabel(selected) : "" },
    { key: "keep", action: "keep_clear", points: keep, label: keep.length ? "Keep clear" : "" },
  ];
  const setPts = active === "place" ? setPlace : setKeep;
  const activePts = active === "place" ? place : keep;
  const valid = base && selected && place.length >= 3 && (keep.length === 0 || keep.length >= 3);

  const submit = async () => {
    setBusy("submit");
    setError(null);
    const regions = [
      { id: `place-${selected}`, action: "place", componentId: selected, points: place },
      ...(keep.length ? [{ id: "keep-clear-1", action: "keep_clear", points: keep }] : []),
    ];
    const canvas = { baseAssetId: base.id, regions, strokes: [] };
    try {
      await runJob(
        `placement-${base.id}-${JSON.stringify(regions)}`,
        "placement",
        { baseAssetId: base.id, componentId: selected },
        { prepare: async () => (await updateProject({ canvas })).revision },
      );
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
      setPlace([]);
      setKeep([]);
      setActive("place");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  if (!base)
    return (
      <Panel title="4. Placement">
        <Notice tone="warn">Approve an isometric venue view in step 2 first.</Notice>
      </Panel>
    );

  return (
    <Panel
      title="4. Placement"
      actions={
        <Button variant="secondary" onClick={onNext}>
          Continue
        </Button>
      }
    >
      {!ready.length && <Notice tone="warn">Approve at least one decor master in step 3 first.</Notice>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-md border border-[#222]">
            <PlacementCanvas
              projectId={project._id}
              assetId={base.id}
              layers={layers}
              activeLayer={active}
              disabled={!selected || running}
              onAddPoint={(pt) => setPts((prev) => (prev.length >= 64 ? prev : [...prev, pt]))}
            />
          </div>
          <p className="text-[11px] text-white/50">
            Click on the image to add polygon points for the selected layer. Current base:{" "}
            {base.kind === "placement" ? "latest approved placement" : "approved isometric"}.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-white/50">Element</p>
            <div className="flex flex-wrap gap-2">
              {ready.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setComponentId(e.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    selected === e.id ? "border-white bg-white text-black" : "border-[#222] text-white/70 hover:border-white/40"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-white/50">Layer</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["place", `Placement (${place.length})`],
                ["keep", `Keep clear (${keep.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`rounded-md border px-2 py-1.5 text-xs ${
                    active === key ? "border-white text-white" : "border-[#222] text-white/60 hover:border-white/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" disabled={!activePts.length} onClick={() => setPts((p) => p.slice(0, -1))}>
                Undo
              </Button>
              <Button variant="secondary" disabled={!activePts.length} onClick={() => setPts([])}>
                Clear
              </Button>
            </div>
            {keep.length > 0 && keep.length < 3 && (
              <p className="mt-2 text-[11px] text-amber-200">Keep-clear needs at least 3 points or none.</p>
            )}
          </div>
          <Button className="w-full" onClick={submit} disabled={!valid || running || busy === "submit"}>
            {busy === "submit" ? "Submitting" : "Place element"} <Cost amount={costs.placement} />
          </Button>
          <JobLine job={job} />
          <ErrorNotice error={error} cost={costs.placement} credits={credits} />
        </div>
      </div>

      {placements.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-white/50">Placement results</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {placements.map((a) => (
              <div key={a.id} className={`rounded-md border ${a.id === base.id ? "border-white" : "border-[#222]"}`}>
                <AssetImage projectId={project._id} assetId={a.id} className="aspect-[4/3] w-full bg-[#0a0a0a]" />
                <div className="space-y-2 border-t border-[#222] p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/70">
                      {a.componentId ? elementLabel(a.componentId) : "Placement"}
                      {a.id === base.id && " / current base"}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                  <Verdict label="QA" verdict={a.qa} />
                  {["candidate", "review"].includes(a.status) && (
                    <Button variant="secondary" className="w-full" disabled={busy === a.id} onClick={() => doApprove(a)}>
                      Approve as next base
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-white/50">History</p>
          <ol className="flex gap-3 overflow-x-auto pb-2">
            {history.map((a, i) => (
              <li key={a.id} className="w-40 shrink-0 rounded-md border border-[#222]">
                <AssetImage projectId={project._id} assetId={a.id} className="aspect-[4/3] w-full bg-[#0a0a0a]" />
                <p className="border-t border-[#222] px-2 py-1 text-[11px] text-white/70">
                  {a.kind === "venue_isometric"
                    ? "Isometric base"
                    : `Step ${history[0].kind === "venue_isometric" ? i : i + 1}: ${
                        a.componentId ? elementLabel(a.componentId) : "placement"
                      }`}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}
