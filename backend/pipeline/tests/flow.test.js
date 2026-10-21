import test from "node:test";
import assert from "node:assert/strict";
import { buildFlowHandoff } from "../flow.js";
import { designHash } from "../fingerprints.js";
test("Flow handoff requires an approved showcase and never reports a generated video", () => {
  const p = {
    _id: "p",
    revision: 3,
    brief: { description: "Wedding" },
    components: [],
    assets: [{ id: "shot", kind: "showcase", status: "candidate" }],
  };
  assert.throws(() => buildFlowHandoff(p, { showcaseAssetId: "shot" }), {
    code: "ASSET_NOT_APPROVED",
  });
  p.assets[0].status = "approved";
  p.assets[0].sourceDesignHash = designHash(p);
  const out = buildFlowHandoff(p, { showcaseAssetId: "shot" });
  assert.equal(out.provider, "google_flow");
  assert.equal(out.status, "awaiting_flow");
  assert.equal(out.startFrameAssetId, "shot");
  assert.equal(out.videoUrl, undefined);
  assert.match(out.prompt, /isometric-style drone/);
});

test("Flow cannot animate an approved frame against a changed design", () => {
  const p = {
    _id: "p",
    revision: 2,
    brief: { description: "Original garden" },
    components: [],
    canvas: null,
    assets: [{ id: "shot", kind: "showcase", status: "approved" }],
  };
  p.assets[0].sourceDesignHash = designHash(p);
  p.brief.description = "Completely different venue and lighting";
  assert.throws(() => buildFlowHandoff(p, { showcaseAssetId: "shot" }), {
    code: "STALE_DESIGN",
  });
});
