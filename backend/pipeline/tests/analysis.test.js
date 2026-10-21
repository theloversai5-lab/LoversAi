import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeLayout, sanitizeSpecs, validateAnalysisOptions, runAnalysis } from "../analysis.js";
import { validateComponentSheetOptions } from "../contracts.js";
import { compilePrompt } from "../prompts.js";

const sq = (x, y, s = 0.2) => [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
const project = () => ({
  brief: { description: "Garden wedding" },
  components: [
    { id: "stage", category: "stage", description: "Floral stage", masterAssetId: "m1" },
    { id: "dining", category: "dining", description: "Round tables" },
  ],
  assets: [
    { id: "iso", kind: "venue_isometric", status: "approved", mimeType: "image/jpeg" },
    { id: "cand", kind: "venue_isometric", status: "candidate", mimeType: "image/jpeg" },
    { id: "m1", kind: "component_sheet", status: "approved", componentId: "stage", viewType: "front", mimeType: "image/jpeg" },
    { id: "t1", kind: "component_sheet", status: "approved", componentId: "stage", viewType: "top", mimeType: "image/jpeg" },
  ],
});

test("layout sanitizer drops unknown components, degenerate and overlapping zones, clamps points", () => {
  const out = sanitizeLayout(
    {
      zones: [
        { componentId: "stage", label: "Stage", reason: "faces guests", points: sq(0.1, 0.1) },
        { componentId: "dining", label: "Seating & dining", reason: "near bar", points: sq(0.15, 0.15) }, // overlaps stage
        { componentId: "dining", label: "Seating", reason: "open lawn", points: [{ x: 0.5, y: 0.5 }, { x: 1.4, y: 0.5 }, { x: 1.4, y: 0.9 }, { x: 0.5, y: 0.9 }] },
        { componentId: "ghost", label: "x", reason: "x", points: sq(0.7, 0.1) },
        { componentId: "stage", label: "tiny", reason: "x", points: sq(0.7, 0.1, 0.001) },
      ],
      keepClear: [
        { label: "Entrance", points: sq(0.12, 0.12, 0.05) }, // inside stage -> dropped
        { label: "Exit", points: sq(0.05, 0.8, 0.1) },
      ],
      summary: "Stage at top, seating centre",
    },
    ["stage", "dining"],
  );
  assert.deepEqual(out.zones.map((z) => z.label), ["Stage", "Seating"]);
  assert.ok(out.zones[1].points.every(([x, y]) => x <= 1 && y <= 1));
  assert.deepEqual(out.keepClear.map((k) => k.label), ["Exit"]);
  assert.throws(() => sanitizeLayout({ zones: [], keepClear: [] }, ["stage"]), { code: "PROVIDER_INVALID_RESPONSE" });
});

test("spec sanitizer requires dimensions and price, orders the price range, bounds values", () => {
  const out = sanitizeSpecs({
    name: "Stage", summary: "s", dimensions: { widthFt: 24, depthFt: 16, heightFt: 12 },
    materials: ["truss"], billOfQuantities: [{ item: "LED panel", quantity: 40, unit: "pcs" }, { item: "", quantity: 1, unit: "x" }],
    priceInr: { low: 300000, high: 180000 }, priceBasis: "rental", setupHours: 10, crew: 8, powerKw: 15, leadTimeDays: 7, notes: ["n"],
  });
  assert.deepEqual(out.priceInr, { low: 180000, high: 300000 });
  assert.equal(out.billOfQuantities.length, 1);
  assert.equal(out.estimate, true);
  assert.throws(() => sanitizeSpecs({ dimensions: { widthFt: 0 }, priceInr: {} }), { code: "PROVIDER_INVALID_RESPONSE" });
});

test("analysis options require approved bases and known components", () => {
  assert.deepEqual(validateAnalysisOptions("layout_plan", { baseAssetId: "iso" }, project()), { baseAssetId: "iso" });
  assert.throws(() => validateAnalysisOptions("layout_plan", { baseAssetId: "cand" }, project()));
  assert.throws(() => validateAnalysisOptions("layout_plan", { baseAssetId: "iso", x: 1 }, project()), { code: "INVALID_JOB" });
  assert.throws(() => validateAnalysisOptions("layout_plan", { baseAssetId: "iso" }, { ...project(), components: [] }), { code: "INVALID_JOB" });
  assert.deepEqual(validateAnalysisOptions("component_specs", { componentId: "dining" }, project()), { componentId: "dining" });
  assert.throws(() => validateAnalysisOptions("component_specs", { componentId: "nope" }, project()), { code: "INVALID_COMPONENT" });
});

test("component_specs sends the approved views and saves a sanitized JSON asset", async () => {
  const saved = [];
  let request;
  const result = await runAnalysis(
    { operation: "component_specs", options: { componentId: "stage" } },
    project(),
    {
      assets: { read: async () => Buffer.from([1]) },
      gemini: {
        visionModel: "v",
        analyze: async (r) => {
          request = r;
          return { value: { dimensions: { widthFt: 20, depthFt: 12, heightFt: 10 }, priceInr: { low: 1, high: 2 } } };
        },
      },
      save: async (buffer, mimeType, meta) => {
        saved.push({ json: JSON.parse(buffer), mimeType, meta });
        return { id: "out", ...meta };
      },
      assertOwnership: async () => {},
    },
  );
  assert.deepEqual(request.references.map((r) => r.assetId), ["m1", "t1"]);
  assert.equal(result.status, "succeeded");
  assert.equal(saved[0].mimeType, "application/json");
  assert.equal(saved[0].meta.kind, "component_specs");
  assert.equal(saved[0].json.dimensions.widthFt, 20);
});

test("spec drawing accepts dimensions only for viewType spec and passes them to the prompt", () => {
  const dims = { widthFt: 24, depthFt: 16, heightFt: 12 };
  assert.deepEqual(validateComponentSheetOptions({ componentId: "stage", viewType: "spec", dimensions: dims }).dimensions, dims);
  assert.throws(() => validateComponentSheetOptions({ componentId: "stage", viewType: "front", dimensions: dims }), { code: "INVALID_JOB" });
  assert.throws(() => validateComponentSheetOptions({ componentId: "stage", viewType: "spec", dimensions: { widthFt: -1 } }), { code: "INVALID_JOB" });
  const out = compilePrompt("component_sheet", project(), { componentId: "stage", viewType: "spec", dimensions: dims });
  assert.match(out.text, /dimension lines/);
  assert.match(out.text, /"suppliedDimensionsFt":\{"widthFt":24/);
});
