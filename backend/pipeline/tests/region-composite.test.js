import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { compositeRegions, regionEditMask } from "../media.js";
import { OpenAIClient } from "../openai.js";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";

const solid = (w, h, c) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).jpeg({ quality: 100 }).toBuffer();
const px = async (buf, x, y) => {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const region = { cx: 0.5, cy: 0.5, rx: 0.15, ry: 0.15, rotation: 0 };

test("composite keeps pixels outside the pin identical and takes the edit inside", async () => {
  const base = await solid(400, 300, { r: 20, g: 120, b: 20 });
  const edit = await solid(600, 600, { r: 230, g: 30, b: 30 }); // different size/aspect, like provider output
  const out = await compositeRegions(base, edit, [region]);
  const meta = await sharp(out).metadata();
  assert.deepEqual([meta.width, meta.height], [400, 300]);
  const [cr] = await px(out, 200, 150);
  assert.ok(cr > 200, "centre should be the edit");
  const corner = await px(out, 5, 5), baseCorner = await px(base, 5, 5);
  corner.forEach((v, i) => assert.ok(Math.abs(v - baseCorner[i]) <= 3, "corner unchanged"));
});

test("OpenAI mask is base-sized, transparent inside regions and opaque outside", async () => {
  const base = await solid(400, 300, { r: 0, g: 0, b: 0 });
  const mask = await regionEditMask(base, [region]);
  const { data, info } = await sharp(mask).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [400, 300, 4]);
  const alpha = (x, y) => data[(y * 400 + x) * 4 + 3];
  assert.equal(alpha(200, 150), 0);
  assert.equal(alpha(5, 5), 255);
});

test("OpenAI edits attach the mask when provided", async () => {
  let form;
  const c = new OpenAIClient({
    apiKey: "sk-test",
    imageModel: "gpt-image-2",
    visionModel: "gpt-4.1",
    fetchImpl: async (_u, init) => {
      form = init.body;
      return { ok: true, status: 200, body: [Buffer.from(JSON.stringify({ data: [{ b64_json: Buffer.from([1, 2]).toString("base64") }] }))] };
    },
  });
  const img = await solid(10, 10, { r: 1, g: 1, b: 1 });
  await c.generate({ text: "x", references: [{ buffer: img, mimeType: "image/jpeg", role: "base" }], mask: Buffer.from([9]) });
  assert.ok(form.get("mask"));
});

test("owner can accept a QA-rejected generation only with an explicit override", async () => {
  const repo = new MemoryRepository();
  const service = new PipelineService({ repository: repo, assets: {}, gemini: {} });
  const project = {
    _id: "p", ownerId: "o", collaborators: [], revision: 0, brief: {}, components: [], canvas: null, activeJobs: [],
    assets: [
      { id: "e1", kind: "region_edit", status: "rejected", qa: { decision: "reject", reason: "changed outside" } },
      { id: "u1", kind: "venue", status: "rejected", screening: { decision: "reject", category: "unsafe" } },
    ],
  };
  repo.projects.set("p", structuredClone(project));
  await assert.rejects(service.approve("p", { _id: "o" }, 0, "e1", "Looks good to the planner"), { code: "ASSET_NOT_REVIEWABLE" });
  const saved = await service.approve("p", { _id: "o" }, 0, "e1", "Looks good to the planner", true);
  const asset = saved.assets.find((a) => a.id === "e1");
  assert.equal(asset.status, "approved");
  assert.equal(asset.approval.qaOverride, true);
  await assert.rejects(service.approve("p", { _id: "o" }, saved.revision, "u1", "Override unsafe image", true), { code: "ASSET_NOT_REVIEWABLE" });
});
