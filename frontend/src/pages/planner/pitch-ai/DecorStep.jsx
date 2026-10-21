import React, { useEffect, useMemo, useState } from "react";
import AssetImage, { downloadAsset } from "./AssetImage";
import { Button, Cost, ErrorNotice, JobLine, Notice, Panel, StatusBadge, Verdict } from "./ui";
import { byNewest, DRAWING_VIEWS, ELEMENTS, IMAGE_MIME, SHEET_VIEWS } from "./constants";

const APPROVE_SHEET = "Planner approved this sheet as the component master";
const APPROVE_REF = "Planner reviewed and approved this decor reference photo";

const APPROVE_BOARD = "Planner approved this presentation board for fabrication review";
const EMPTY_BOARD = { depthFt: "", widthFt: "", heightFt: "", notes: "" };
const BOARD_DIMS = [
  ["depthFt", "Length (ft)", "16"],
  ["widthFt", "Width (ft)", "12"],
  ["heightFt", "Height (ft)", "10"],
];
const inputClass =
  "mt-1 w-full rounded-md border border-[#222] bg-black px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none";

const list = (s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// Server-owned fields (masterAssetId, ...) must not be sent back.
export const editableComponent = (c) => ({
  id: c.id,
  category: c.category,
  description: c.description,
  palette: c.palette || [],
  materials: c.materials || [],
  dimensions: c.dimensions ?? null,
  referenceAssetIds: c.referenceAssetIds || [],
});

const refKey = (projectId) => `pitchAi.decorRefs.${projectId}`;
const readRefs = (projectId) => {
  try {
    return JSON.parse(localStorage.getItem(refKey(projectId)) || "{}");
  } catch {
    return {};
  }
};
const writeRefs = (projectId, refs) => {
  try {
    localStorage.setItem(refKey(projectId), JSON.stringify(refs));
  } catch {
    // Non-critical: the saved component keeps the reference once approved.
  }
};

export default function DecorStep({ ctx, onNext }) {
  const { project, upload, runJob, approve, updateProject, latestJob, credits, costs, jobs } = ctx;
  const [selected, setSelected] = useState(ELEMENTS[0].id);
  const [localRefs, setLocalRefs] = useState(() => readRefs(project._id));
  const [form, setForm] = useState({ description: "", palette: "", materials: "" });
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const element = ELEMENTS.find((e) => e.id === selected);
  const component = (project.components || []).find((c) => c.id === selected) || null;
  const assets = useMemo(() => project.assets || [], [project.assets]);
  const refAssetId = component?.referenceAssetIds?.[0] || localRefs[selected] || null;
  const refAsset = assets.find((a) => a.id === refAssetId) || null;

  useEffect(() => {
    setForm({
      description: component?.description || "",
      palette: (component?.palette || []).join(", "),
      materials: (component?.materials || []).join(", "),
    });
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, component?.description, component?.palette?.join(), component?.materials?.join()]);

  useEffect(() => setBoard(EMPTY_BOARD), [selected]);

  const sheets = useMemo(
    () => assets.filter((a) => a.kind === "component_sheet" && a.componentId === selected).sort(byNewest),
    [assets, selected],
  );
  // Sheet assets may not carry viewType; fall back to the job that produced them.
  const viewTypeOf = (asset) => {
    if (asset.viewType) return asset.viewType;
    const job = Object.values(jobs).find(
      (j) => j.id === asset.jobId || (j.result?.assets || []).some((x) => x.id === asset.id),
    );
    return job?.options?.viewType || "sheet";
  };
  const sheetJob = latestJob((j) => j.operation === "component_sheet" && j.options?.componentId === selected);
  const screenJob = latestJob((j) => j.operation === "screen_assets");
  const sheetRunning = sheetJob && ["queued", "running"].includes(sheetJob.status);

  const wantRefs = refAsset?.status === "approved" ? [refAsset.id] : [];
  const dirty =
    !component ||
    component.description !== form.description.trim() ||
    (component.palette || []).join("|") !== list(form.palette).join("|") ||
    (component.materials || []).join("|") !== list(form.materials).join("|") ||
    (component.referenceAssetIds || []).join("|") !== wantRefs.join("|");

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

  const uploadRef = (file) =>
    wrap("upload", async () => {
      if (!IMAGE_MIME.includes(file.type)) throw new Error("Use JPEG, PNG or WebP images.");
      const result = await upload([file], { kind: "decor", views: ["detail"] });
      if (result.rejected?.length) throw new Error(result.rejected[0].reason);
      const id = result.accepted?.[0]?.id;
      if (id) {
        const next = { ...localRefs, [selected]: id };
        setLocalRefs(next);
        writeRefs(project._id, next);
        await runJob(`decor-screen-${id}`, "screen_assets", {});
      }
    })();

  const save = wrap("save", async () => {
    if (!form.description.trim()) throw new Error("Describe the element first.");
    const next = {
      id: element.id,
      category: element.category,
      description: form.description.trim(),
      palette: list(form.palette).slice(0, 8),
      materials: list(form.materials).slice(0, 10),
      dimensions: component?.dimensions ?? null,
      referenceAssetIds: wantRefs,
    };
    const others = (project.components || []).filter((c) => c.id !== element.id).map(editableComponent);
    await updateProject({ components: [...others, next] });
  });

  const generate = (viewType) =>
    wrap(`gen-${viewType}`, () =>
      runJob(`sheet-${selected}-${viewType}`, "component_sheet", { componentId: selected, viewType }),
    )();

  const generateBoard = wrap("gen-board", async () => {
    const dimensions = {};
    for (const [key, label] of BOARD_DIMS) {
      const raw = board[key].trim();
      if (!raw) continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0.1 || v > 300) throw new Error(`${label} must be between 0.1 and 300.`);
      dimensions[key] = v;
    }
    if (!Object.keys(dimensions).length) throw new Error("Enter at least one overall dimension.");
    const notes = board.notes.trim();
    await runJob(`board-${selected}`, "component_sheet", {
      componentId: selected,
      viewType: "board",
      dimensions,
      ...(notes ? { specNotes: notes } : {}),
    });
  });

  const approveAsset = (asset, reason) => wrap(asset.id, () => approve(asset.id, reason))();

  const mastered = ELEMENTS.filter((e) =>
    (project.components || []).some((c) => c.id === e.id && c.masterAssetId),
  ).length;

  return (
    <Panel
      title="3. Decor elements"
      actions={
        <Button variant="secondary" onClick={onNext} disabled={!mastered}>
          Continue ({mastered} ready)
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {ELEMENTS.map((e) => {
          const c = (project.components || []).find((x) => x.id === e.id);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(e.id)}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                selected === e.id ? "border-white bg-white text-black" : "border-[#222] text-white/70 hover:border-white/40"
              }`}
            >
              {e.label}
              {c?.masterAssetId ? " / master" : c ? " / defined" : ""}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="rounded-md border border-[#222]">
            <div className="flex items-center justify-between border-b border-[#222] px-2 py-1.5">
              <span className="text-[11px] text-white/80">Reference photo</span>
              <StatusBadge status={refAsset?.status} />
            </div>
            <label className="relative block aspect-[4/3] cursor-pointer bg-[#0a0a0a]">
              {refAsset ? (
                <AssetImage projectId={project._id} assetId={refAsset.id} className="h-full w-full" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[11px] text-white/40">
                  {busy === "upload" ? "Uploading" : "Select photo (optional)"}
                </span>
              )}
              <input
                type="file"
                accept={IMAGE_MIME.join(",")}
                className="hidden"
                disabled={busy === "upload"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadRef(f);
                }}
              />
            </label>
            <div className="space-y-2 p-2">
              <Verdict label="Screening" verdict={refAsset?.screening} />
              {refAsset?.status === "pending_screen" && (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={screenJob && ["queued", "running"].includes(screenJob.status)}
                  onClick={wrap("screen", () => runJob(`decor-screen-${refAsset.id}`, "screen_assets", {}))}
                >
                  Run screening
                </Button>
              )}
              {refAsset?.status === "review" && (
                <Button variant="secondary" className="w-full" onClick={() => approveAsset(refAsset, APPROVE_REF)}>
                  Approve reference
                </Button>
              )}
            </div>
          </div>
          <JobLine job={screenJob} />
        </div>

        <div className="space-y-3">
          <label className="block text-[11px] text-white/60">
            Description
            <textarea
              rows={3}
              value={form.description}
              maxLength={2000}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={`Describe the ${element.label.toLowerCase()}: style, structure, flowers, fabric`}
              className="mt-1 w-full rounded-md border border-[#222] bg-black px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[11px] text-white/60">
              Palette (comma separated)
              <input
                value={form.palette}
                onChange={(e) => setForm({ ...form, palette: e.target.value })}
                placeholder="ivory, sage, warm gold"
                className="mt-1 w-full rounded-md border border-[#222] bg-black px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
              />
            </label>
            <label className="block text-[11px] text-white/60">
              Materials (comma separated)
              <input
                value={form.materials}
                onChange={(e) => setForm({ ...form, materials: e.target.value })}
                placeholder="timber, jasmine, silk"
                className="mt-1 w-full rounded-md border border-[#222] bg-black px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/50 focus:outline-none"
              />
            </label>
          </div>
          {refAsset && refAsset.status !== "approved" && (
            <Notice tone="warn">The reference photo is used once it is approved.</Notice>
          )}
          {component?.masterAssetId && dirty && (
            <Notice tone="warn">Saving changes invalidates the current master; generate and approve a new sheet.</Notice>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={save} disabled={!dirty || busy === "save"}>
              {busy === "save" ? "Saving" : component ? "Save changes" : "Define element"}
            </Button>
            {SHEET_VIEWS.map((v) => (
              <Button
                key={v.viewType}
                onClick={() => generate(v.viewType)}
                disabled={!component || dirty || sheetRunning || busy === `gen-${v.viewType}`}
              >
                {v.label} <Cost amount={costs.component_sheet} />
              </Button>
            ))}
          </div>
          <div className="space-y-3 rounded-md border border-[#222] p-3">
            <div>
              <div className="text-xs text-white">Spec sheet</div>
              <div className="text-[11px] text-white/50">
                Six-view architectural presentation board for fabrication approval: plan, front, left, right,
                exploded and isometric views with dimensions, labels and schedules. Enter the sizes you know;
                the rest are derived proportionally from the design.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BOARD_DIMS.map(([key, label, placeholder]) => (
                <label key={key} className="block text-[11px] text-white/60">
                  {label}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.1"
                    max="300"
                    step="0.5"
                    value={board[key]}
                    onChange={(e) => setBoard({ ...board, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
            <label className="block text-[11px] text-white/60">
              Specs and notes (optional)
              <textarea
                rows={3}
                value={board.notes}
                maxLength={1500}
                onChange={(e) => setBoard({ ...board, notes: e.target.value })}
                placeholder="5 alternating half arches, 8 ft clear walkway, lamp racks in side zones, 6 in platform rise, entry step at front"
                className={inputClass}
              />
            </label>
            <Button onClick={generateBoard} disabled={!component || dirty || sheetRunning || busy === "gen-board"}>
              Generate spec sheet <Cost amount={costs.component_board} />
            </Button>
          </div>
          <JobLine job={sheetJob} />
          <ErrorNotice
            error={error}
            cost={sheetJob?.options?.viewType === "board" ? costs.component_board : costs.component_sheet}
            credits={credits}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sheets.map((a) => {
              const isMaster = component?.masterAssetId === a.id;
              const isDrawing = DRAWING_VIEWS.includes(viewTypeOf(a));
              return (
                <div key={a.id} className={`rounded-md border ${isMaster ? "border-white" : "border-[#222]"}`}>
                  <AssetImage
                    projectId={project._id}
                    assetId={a.id}
                    className={`${isDrawing ? "aspect-[3/2]" : "aspect-square"} w-full bg-[#0a0a0a]`}
                  />
                  <div className="space-y-2 border-t border-[#222] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-white/70">
                        {viewTypeOf(a) === "board" ? "spec sheet" : viewTypeOf(a).replace(/_/g, " ")}
                        {isMaster && " / master"}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>
                    <Verdict label="QA" verdict={a.qa} />
                    {isDrawing && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => downloadAsset(project._id, a).catch(setError)}
                      >
                        Download
                      </Button>
                    )}
                    {isDrawing && ["candidate", "review"].includes(a.status) && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled={busy === a.id}
                        onClick={() => approveAsset(a, APPROVE_BOARD)}
                      >
                        Approve spec sheet
                      </Button>
                    )}
                    {!isMaster && !isDrawing && ["candidate", "review"].includes(a.status) && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled={busy === a.id}
                        onClick={() => approveAsset(a, APPROVE_SHEET)}
                      >
                        Approve as master
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
