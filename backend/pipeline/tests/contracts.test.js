import test from "node:test";
import assert from "node:assert/strict";
import {
  validateBrief,
  validateComponents,
  validateCanvas,
} from "../contracts.js";

const project = {
  assets: [
    { id: "base", kind: "venue", status: "approved" },
    { id: "sheet", kind: "component_sheet", status: "approved" },
  ],
  components: [{ id: "stage", category: "stage", masterAssetId: "sheet" }],
};
const canvas = () => ({
  baseAssetId: "base",
  regions: [
    {
      id: "r1",
      action: "place",
      componentId: "stage",
      points: [
        [0.1, 0.1],
        [0.4, 0.1],
        [0.4, 0.4],
        [0.1, 0.4],
      ],
    },
  ],
  strokes: [],
});

test("rejects nonfinite coordinates before prompt or rasterization", () => {
  const c = canvas();
  c.regions[0].points[0][0] = NaN;
  assert.throws(() => validateCanvas(c, project), { code: "INVALID_CANVAS" });
});
test("blocks placement into a keep-clear region", () => {
  const c = canvas();
  c.regions.push({
    id: "exit",
    action: "keep_clear",
    points: [
      [0.2, 0.2],
      [0.8, 0.2],
      [0.8, 0.8],
      [0.2, 0.8],
    ],
  });
  assert.throws(() => validateCanvas(c, project), {
    code: "PROTECTED_REGION_CONFLICT",
  });
});

test("keep-clear strokes cannot bypass polygon placement checks", () => {
  const c = canvas();
  c.strokes.push({
    id: "exit-line",
    action: "keep_clear",
    points: [
      [0, 0.2],
      [1, 0.2],
    ],
  });
  assert.throws(() => validateCanvas(c, project), { code: "INVALID_CANVAS" });
});
test("blocks cross-project and unapproved component references", () => {
  const c = canvas();
  c.baseAssetId = "elsewhere";
  assert.throws(() => validateCanvas(c, project), {
    code: "ASSET_NOT_APPROVED",
  });
  c.baseAssetId = "base";
  assert.throws(
    () =>
      validateCanvas(c, {
        ...project,
        components: [{ id: "stage", masterAssetId: "missing" }],
      }),
    { code: "ASSET_NOT_APPROVED" },
  );
});
test("accepts a bounded placement and keeps its identity", () => {
  assert.equal(
    validateCanvas(canvas(), project).regions[0].componentId,
    "stage",
  );
});
test("validates component categories and never accepts an uploaded master approval", () => {
  assert.throws(
    () =>
      validateComponents([{ id: "c", category: "unknown", description: "a" }]),
    { code: "INVALID_COMPONENT" },
  );
  assert.throws(
    () =>
      validateComponents([
        { id: "c", category: "stage", description: "a", masterAssetId: "fake" },
      ]),
    { code: "INVALID_COMPONENT" },
  );
  assert.equal(
    validateComponents([
      {
        id: "flowers",
        category: "flowers",
        description: "White jasmine and marigolds",
      },
    ])[0].id,
    "flowers",
  );
});
test("brief limits free text and preserves constraints as data", () => {
  assert.throws(() => validateBrief({ description: "x".repeat(8001) }), {
    code: "INVALID_BRIEF",
  });
  assert.equal(
    validateBrief({
      description: "Garden wedding",
      constraints: ["Keep all exits clear"],
    }).constraints[0],
    "Keep all exits clear",
  );
});
