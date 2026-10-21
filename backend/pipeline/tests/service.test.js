import test from "node:test";
import assert from "node:assert/strict";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";
import { GeminiClient } from "../gemini.js";
const owner = { _id: "owner", role: "planner" },
  other = { _id: "stranger", role: "vendor" };
function setup() {
  return new PipelineService({
    repository: new MemoryRepository(),
    assets: {},
    gemini: new GeminiClient({
      apiKey: "test",
      imageModel: "image",
      visionModel: "vision",
    }),
  });
}
test("unrelated users cannot read or modify a project", async () => {
  const s = setup(),
    p = await s.create(owner, { description: "Garden wedding" });
  await assert.rejects(s.get(p._id, other), { code: "PROJECT_NOT_FOUND" });
  await assert.rejects(
    s.update(p._id, other, 0, { brief: { description: "hijack" } }),
    { code: "PROJECT_NOT_FOUND" },
  );
});
test("revision CAS prevents stale drawing/brief overwrite", async () => {
  const s = setup(),
    p = await s.create(owner, { description: "Wedding" });
  await s.update(p._id, owner, 0, { brief: { description: "Updated" } });
  await assert.rejects(
    s.update(p._id, owner, 0, { brief: { description: "Old" } }),
    { code: "REVISION_CONFLICT" },
  );
});
test("a request key returns the same job, but cannot change its input", async () => {
  const s = setup(),
    p = await s.create(owner, { description: "Jasmine stage" });
  const request = {
    revision: 0,
    requestKey: "req-1",
    operation: "showcase",
    options: {},
  };
  const a = await s.enqueue(p._id, owner, request),
    b = await s.enqueue(p._id, owner, request);
  assert.equal(a.id, b.id);
  await assert.rejects(
    s.enqueue(p._id, owner, { ...request, operation: "panorama" }),
    { code: "IDEMPOTENCY_CONFLICT" },
  );
});
test("collaborators may edit but only owners grant access", async () => {
  const s = setup(),
    p = await s.create(owner, { description: "Wedding" });
  const updated = await s.collaborators(p._id, owner, 0, ["vendor-user"]);
  assert.equal(
    (await s.get(p._id, { _id: "vendor-user" })).revision,
    updated.revision,
  );
  await assert.rejects(
    s.collaborators(p._id, { _id: "vendor-user" }, updated.revision, []),
    { code: "OWNER_REQUIRED" },
  );
});
test("rejected asset cannot be promoted even by the owner", async () => {
  const s = setup(),
    p = await s.create(owner, { description: "Wedding" });
  p.assets = [
    { id: "bad", status: "rejected", screening: { category: "unsafe" } },
  ];
  await s.repository.casProject(p._id, 0, p);
  await assert.rejects(
    s.approve(p._id, owner, 1, "bad", "Reviewed this image carefully"),
    { code: "ASSET_NOT_REVIEWABLE" },
  );
});
test("component design changes invalidate an old sheet promotion", async () => {
  const s = setup(),
    p = await s.create(owner, { description: "Wedding" });
  p.components = [
    { id: "stage", category: "stage", description: "Different stage" },
  ];
  p.assets = [
    {
      id: "sheet",
      kind: "component_sheet",
      status: "candidate",
      componentId: "stage",
      sourceComponentHash: "old",
    },
  ];
  await s.repository.casProject(p._id, 0, p);
  await assert.rejects(
    s.approve(p._id, owner, 1, "sheet", "I approve the sheet"),
    { code: "STALE_COMPONENT" },
  );
});
