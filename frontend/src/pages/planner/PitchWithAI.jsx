import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import usePitchProject from "./pitch-ai/usePitchProject";
import VenueStep from "./pitch-ai/VenueStep";
import IsometricStep from "./pitch-ai/IsometricStep";
import DecorStep from "./pitch-ai/DecorStep";
import PlacementStep from "./pitch-ai/PlacementStep";
import GalleryStep from "./pitch-ai/GalleryStep";
import { Button, ErrorNotice, Notice } from "./pitch-ai/ui";
import { currentBase, GROUND_VIEWS, STEPS } from "./pitch-ai/constants";

const inputClass =
  "mt-1 w-full rounded-md border border-[#222] bg-black px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none";

function furthestStep(project) {
  const assets = project?.assets || [];
  const approved = (kind) => assets.some((a) => a.kind === kind && a.status === "approved");
  const groundApproved = GROUND_VIEWS.every((v) =>
    assets.some((a) => a.kind === "venue" && a.view === v && a.status === "approved"),
  );
  if (approved("placement")) return "placement";
  if (approved("venue_isometric"))
    return (project.components || []).some((c) => c.masterAssetId) ? "placement" : "decor";
  return groundApproved ? "isometric" : "venue";
}

function Shell({ children, credits, onNew, showNew }) {
  return (
    <div className="min-h-full rounded-lg border border-[#222] bg-black text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Pitch with AI</h1>
          <p className="text-[11px] text-white/50">Venue to isometric to decor to placement, ready for a client pitch.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-[#222] px-3 py-1.5 text-xs text-white/80">
            Credits: {credits == null ? "-" : credits}
          </span>
          {showNew && (
            <Button variant="secondary" onClick={onNew}>
              New project
            </Button>
          )}
        </div>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

export default function PitchWithAI() {
  const ctx = usePitchProject();
  const { phase, project, credits, loadError, createProject, resetProject } = ctx;
  const [step, setStep] = useState("venue");
  const [brief, setBrief] = useState({ description: "", style: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const initialisedFor = useRef(null);

  useEffect(() => {
    if (project && initialisedFor.current !== project._id) {
      initialisedFor.current = project._id;
      setStep(furthestStep(project));
    }
  }, [project]);

  const onNew = () => {
    if (window.confirm("Start a new project? The current project stays saved on the server but will no longer be resumed here.")) {
      resetProject();
    }
  };

  const create = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      await createProject({
        description: brief.description.trim(),
        style: brief.style.trim(),
      });
    } catch (e) {
      setCreateError(e);
    } finally {
      setCreating(false);
    }
  };

  if (phase === "loading")
    return (
      <Shell credits={credits}>
        <p className="text-xs text-white/50">Loading</p>
      </Shell>
    );

  if (phase === "disabled")
    return (
      <Shell credits={credits}>
        <div className="mx-auto max-w-md space-y-3 py-10 text-center">
          <p className="text-sm text-white">Pitch with AI is not enabled on this server.</p>
          <p className="text-xs text-white/50">The venue pipeline is currently switched off. Contact support to enable it.</p>
          <Link to="/vendor-ai" className="inline-block text-xs text-white underline">
            Back to Vendor AI
          </Link>
        </div>
      </Shell>
    );

  if (phase === "error")
    return (
      <Shell credits={credits}>
        <ErrorNotice error={loadError} />
        <Button variant="secondary" className="mt-3" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Shell>
    );

  if (phase === "none")
    return (
      <Shell credits={credits}>
        <div className="mx-auto max-w-lg space-y-4 py-6">
          <p className="text-sm text-white">Start a new pitch</p>
          <label className="block text-[11px] text-white/60">
            Brief (optional)
            <textarea
              rows={3}
              maxLength={8000}
              value={brief.description}
              onChange={(e) => setBrief({ ...brief, description: e.target.value })}
              placeholder="Evening garden wedding; keep the venue building and trees unchanged."
              className={inputClass}
            />
          </label>
          <label className="block text-[11px] text-white/60">
            Style (optional)
            <input
              maxLength={200}
              value={brief.style}
              onChange={(e) => setBrief({ ...brief, style: e.target.value })}
              placeholder="Contemporary floral"
              className={inputClass}
            />
          </label>
          <ErrorNotice error={createError} />
          <Button onClick={create} disabled={creating}>
            {creating ? "Creating" : "Create project"}
          </Button>
        </div>
      </Shell>
    );

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const go = (id) => () => setStep(id);
  const base = currentBase(project);

  return (
    <Shell credits={credits} onNew={onNew} showNew>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-[#222] pb-3">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={go(s.id)}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs transition ${
              s.id === step ? "bg-white text-black" : i < stepIndex ? "text-white/80 hover:text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${s.id === step ? "border-black" : "border-[#333]"}`}>
              {i + 1}
            </span>
            {s.label}
          </button>
        ))}
      </nav>
      {(project.activeJobs || []).length >= 2 && (
        <div className="mb-4">
          <Notice tone="warn">Two jobs are running for this project. New jobs can start when one finishes.</Notice>
        </div>
      )}
      {step === "venue" && <VenueStep ctx={ctx} onNext={go("isometric")} />}
      {step === "isometric" && <IsometricStep ctx={ctx} onNext={go("decor")} />}
      {step === "decor" && <DecorStep key={project._id} ctx={ctx} onNext={go(base ? "placement" : "isometric")} />}
      {step === "placement" && <PlacementStep key={project._id} ctx={ctx} onNext={go("gallery")} />}
      {step === "gallery" && <GalleryStep ctx={ctx} />}
    </Shell>
  );
}
