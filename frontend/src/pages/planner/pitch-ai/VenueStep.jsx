import React, { useEffect, useMemo, useState } from "react";
import AssetImage from "./AssetImage";
import { Button, ErrorNotice, JobLine, Notice, Panel, StatusBadge, Verdict } from "./ui";
import { byNewest, GROUND_VIEWS, IMAGE_MIME, VENUE_SLOTS } from "./constants";

const APPROVE_REASON = "Planner reviewed venue photo and approved it for generation";

export default function VenueStep({ ctx, onNext }) {
  const { project, upload, runJob, approve, latestJob } = ctx;
  const [local, setLocal] = useState({}); // view -> File
  const [previews, setPreviews] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [rejected, setRejected] = useState([]);

  useEffect(() => {
    const urls = Object.fromEntries(Object.entries(local).map(([v, f]) => [v, URL.createObjectURL(f)]));
    setPreviews(urls);
    return () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
  }, [local]);

  const slots = useMemo(() => {
    const venue = (project.assets || []).filter((a) => a.kind === "venue").sort(byNewest);
    return Object.fromEntries(
      VENUE_SLOTS.map((s) => {
        const forView = venue.filter((a) => a.view === s.view);
        return [s.view, forView.find((a) => a.status !== "rejected") || forView[0] || null];
      }),
    );
  }, [project.assets]);

  const pendingCount = (project.assets || []).filter(
    (a) => a.kind === "venue" && a.status === "pending_screen",
  ).length;
  const approvedGround = GROUND_VIEWS.filter((v) => slots[v]?.status === "approved").length;
  const screenJob = latestJob((j) => j.operation === "screen_assets");
  const screening = screenJob && ["queued", "running"].includes(screenJob.status);

  const pick = (view, file) => {
    setError(null);
    if (!file) return;
    if (!IMAGE_MIME.includes(file.type)) return setError({ message: "Use JPEG, PNG or WebP images." });
    if (file.size > 10 * 1024 * 1024) return setError({ message: "Each image must be 10 MB or smaller." });
    setLocal((prev) => ({ ...prev, [view]: file }));
  };

  const doUpload = async () => {
    const entries = Object.entries(local);
    if (!entries.length) return;
    setBusy("upload");
    setError(null);
    setRejected([]);
    try {
      const result = await upload(
        entries.map(([, f]) => f),
        { kind: "venue", views: entries.map(([v]) => v) },
      );
      setRejected(
        (result.rejected || []).map((r) => ({ view: entries[r.index]?.[0], reason: r.reason })),
      );
      setLocal({});
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const doScreen = async () => {
    setBusy("screen");
    setError(null);
    try {
      await runJob("venue-screen", "screen_assets", {});
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

  return (
    <Panel
      title="1. Venue photos"
      actions={
        <>
          <Button
            variant="secondary"
            onClick={doUpload}
            disabled={!Object.keys(local).length || busy === "upload"}
          >
            {busy === "upload" ? "Uploading" : `Upload ${Object.keys(local).length || ""} photo${Object.keys(local).length === 1 ? "" : "s"}`}
          </Button>
          <Button variant="secondary" onClick={doScreen} disabled={!pendingCount || screening || busy === "screen"}>
            {screening ? "Screening" : `Run screening${pendingCount ? ` (${Math.min(pendingCount, 5)})` : ""}`}
          </Button>
          <Button onClick={onNext} disabled={approvedGround < 4}>
            Continue
          </Button>
        </>
      }
    >
      <p className="mb-4 text-xs text-white/50">
        Add four overlapping ground views and an optional satellite view. Photos are screened before they can be approved.
        {` ${approvedGround}/4 ground views approved.`}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {VENUE_SLOTS.map((slot) => {
          const asset = slots[slot.view];
          const preview = previews[slot.view];
          return (
            <div key={slot.view} className="flex flex-col rounded-md border border-[#222]">
              <div className="flex items-center justify-between border-b border-[#222] px-2 py-1.5">
                <span className="text-[11px] text-white/80">
                  {slot.label}
                  {slot.optional && <span className="text-white/40"> (optional)</span>}
                </span>
                {preview ? <StatusBadge status="not uploaded" /> : <StatusBadge status={asset?.status} />}
              </div>
              <label className="relative block aspect-[4/3] cursor-pointer bg-[#0a0a0a]">
                {preview ? (
                  <img src={preview} alt={slot.label} className="h-full w-full object-cover" />
                ) : asset ? (
                  <AssetImage projectId={project._id} assetId={asset.id} alt={slot.label} className="h-full w-full" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] text-white/40">
                    Select photo
                  </span>
                )}
                <input
                  type="file"
                  accept={IMAGE_MIME.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    pick(slot.view, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="flex flex-1 flex-col gap-2 p-2">
                <Verdict label="Screening" verdict={asset?.screening} />
                {asset?.status === "review" && (
                  <Button variant="secondary" onClick={() => doApprove(asset)} disabled={busy === asset.id}>
                    Approve
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-2">
        <JobLine job={screenJob} />
        {rejected.map((r, i) => (
          <Notice key={i} tone="error">
            {r.view}: {r.reason}
          </Notice>
        ))}
        <ErrorNotice error={error} />
      </div>
    </Panel>
  );
}
