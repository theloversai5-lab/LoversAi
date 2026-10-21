import React, { useMemo, useState } from "react";
import AssetImage, { downloadAsset, saveBlob } from "./AssetImage";
import { Button, ErrorNotice, JobLine, Notice, Panel } from "./ui";
import { byNewest, currentBase, elementLabel } from "./constants";
import { pipelineAPI } from "../../../api/pipelineApi";

const KIND_LABEL = {
  venue_isometric: "Isometric venue",
  component_sheet: "Decor sheet",
  placement: "Placement",
  showcase: "Showcase",
};

export default function GalleryStep({ ctx }) {
  const { project, capabilities, runJob, latestJob } = ctx;
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const assets = useMemo(() => project.assets || [], [project.assets]);

  const approved = useMemo(
    () => assets.filter((a) => KIND_LABEL[a.kind] && a.status === "approved").sort(byNewest),
    [assets],
  );
  const handoffs = useMemo(
    () => assets.filter((a) => a.kind === "flow_handoff").sort(byNewest),
    [assets],
  );
  const finalFrame = currentBase(project);
  const flowEnabled = Boolean(capabilities?.flowDelivery?.referencePackage);
  const flowJob = latestJob((j) => j.operation === "flow_handoff");
  const flowRunning = flowJob && ["queued", "running"].includes(flowJob.status);

  const wrap = (key, fn) => async () => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const prepareFlow = wrap("flow", () =>
    runJob(`flow-${finalFrame.id}`, "flow_handoff", { showcaseAssetId: finalFrame.id }),
  );

  const downloadPackage = (handoff) =>
    wrap(handoff.id, async () => {
      const blob = await pipelineAPI.flowPackage(project._id, handoff.id, project.revision);
      saveBlob(blob, `flow-package-${handoff.id}.zip`);
    })();

  return (
    <Panel title="5. Gallery">
      {!approved.length && <Notice>No approved outputs yet.</Notice>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {approved.map((a) => (
          <div key={a.id} className="rounded-md border border-[#222]">
            <AssetImage projectId={project._id} assetId={a.id} className="aspect-[4/3] w-full bg-[#0a0a0a]" />
            <div className="flex items-center justify-between gap-2 border-t border-[#222] p-2">
              <span className="text-[11px] text-white/70">
                {KIND_LABEL[a.kind]}
                {a.componentId ? ` / ${elementLabel(a.componentId)}` : ""}
                {a.viewType ? ` / ${a.viewType.replace(/_/g, " ")}` : ""}
              </span>
              <Button variant="secondary" disabled={busy === `dl-${a.id}`} onClick={wrap(`dl-${a.id}`, () => downloadAsset(project._id, a))}>
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-md border border-[#222] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-white">Google Flow handoff</p>
            <p className="text-[11px] text-white/50">
              Packages the final approved frame and decor masters with a drone-shot prompt for manual generation in Flow.
            </p>
          </div>
          <Button
            onClick={prepareFlow}
            disabled={!flowEnabled || !finalFrame || flowRunning || busy === "flow"}
          >
            Prepare handoff
          </Button>
        </div>
        {!flowEnabled && <p className="mt-2 text-[11px] text-white/40">Flow packaging is not available on this server.</p>}
        <div className="mt-3 space-y-2">
          <JobLine job={flowJob} />
          <ErrorNotice error={error} />
          {handoffs.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 rounded-md border border-[#222] px-3 py-2">
              <span className="text-[11px] text-white/70">Handoff {String(h.createdAt || "").slice(0, 16).replace("T", " ")}</span>
              <Button variant="secondary" disabled={busy === h.id} onClick={() => downloadPackage(h)}>
                Download package
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
