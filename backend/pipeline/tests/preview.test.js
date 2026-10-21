import test from "node:test";
import assert from "node:assert/strict";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";
import { GeminiClient, MAX_REQUEST_BYTES } from "../gemini.js";
import { fingerprint } from "../fingerprints.js";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { AssetStore } from "../media.js";
import { runStage } from "../stages.js";

const owner = { _id: "owner" },
  intruder = { _id: "intruder" };
function setup(
  gemini = new GeminiClient({
    apiKey: "private-key",
    imageModel: "image",
    visionModel: "vision",
  }),
) {
  return new PipelineService({
    repository: new MemoryRepository(),
    assets: {
      read: async () => Buffer.alloc(16 * 1024 * 1024),
      write: async () => assert.fail("preview must not persist bytes"),
    },
    gemini,
  });
}

test("preview returns prompt and QA headroom without changing project, reserving jobs or disclosing credentials", async () => {
  const service = setup();
  const project = await service.create(owner, {
    description: "Jasmine garden wedding",
  });
  const before = await service.get(project._id, owner);
  const preview = await service.preview(project._id, owner, {
    revision: 0,
    operation: "showcase",
    options: {},
  });
  assert.match(preview.prompt, /Jasmine garden wedding/);
  assert.equal(preview.sourceRevision, 0);
  assert.equal(preview.references.length, 0);
  assert.ok(preview.request.serializedBytes > 100);
  assert.equal(preview.request.limitBytes, MAX_REQUEST_BYTES);
  assert.ok(preview.request.qaCandidateHeadroomBytes < MAX_REQUEST_BYTES);
  assert.equal(preview.provider.generationReady, true);
  assert.equal(preview.provider.availabilityVerified, false);
  assert.equal(JSON.stringify(preview).includes("private-key"), false);
  assert.equal(JSON.stringify(preview).includes("base64"), false);
  assert.equal(service.repository.jobs.size, 0);
  assert.deepEqual(await service.get(project._id, owner), before);
});

test("preview enforces project isolation, revision and supported task before inspecting private bytes", async () => {
  const service = setup(),
    p = await service.create(owner, { description: "Wedding" });
  await assert.rejects(
    service.preview(p._id, intruder, { revision: 0, operation: "showcase" }),
    { code: "PROJECT_NOT_FOUND" },
  );
  await assert.rejects(
    service.preview(p._id, owner, { revision: 99, operation: "showcase" }),
    { code: "REVISION_CONFLICT" },
  );
  await assert.rejects(
    service.preview(p._id, owner, { revision: 0, operation: "screen_assets" }),
    { code: "INVALID_TASK" },
  );
  await assert.rejects(
    service.preview(p._id, owner, {
      revision: 0,
      operation: "showcase",
      options: { url: "https://example.com" },
    }),
    { code: "INVALID_JOB" },
  );
});

test("missing or invalid model configuration blocks paid enqueue before any project reservation", async () => {
  for (const config of [
    {},
    { apiKey: "key", imageModel: "models/image", visionModel: "vision" },
  ]) {
    const service = setup(new GeminiClient(config));
    const p = await service.create(owner, { description: "Wedding" });
    const preview = await service.preview(p._id, owner, {
      revision: 0,
      operation: "showcase",
    });
    assert.equal(preview.provider.generationReady, false);
    await assert.rejects(
      service.enqueue(p._id, owner, {
        revision: 0,
        requestKey: "first",
        operation: "showcase",
      }),
      { code: "PROVIDER_NOT_CONFIGURED" },
    );
    assert.equal((await service.get(p._id, owner)).revision, 0);
    assert.equal(service.repository.jobs.size, 0);
  }
});

test("actual serialized image budget rejects enqueue before revision or active jobs change", async () => {
  const service = setup(),
    p = await service.create(owner, { description: "Wedding" });
  p.assets = [
    { id: "large", kind: "venue", status: "approved", mimeType: "image/jpeg" },
  ];
  await service.repository.casProject(p._id, 0, p);
  await assert.rejects(
    service.enqueue(p._id, owner, {
      revision: 1,
      requestKey: "too-large",
      operation: "showcase",
    }),
    { code: "REFERENCE_LIMIT" },
  );
  assert.equal((await service.get(p._id, owner)).revision, 1);
  assert.equal(service.repository.jobs.size, 0);
});

test("idempotent recovery survives provider configuration disappearing after enqueue", async () => {
  const service = setup(),
    p = await service.create(owner, { description: "Wedding" });
  const request = {
    revision: 0,
    requestKey: "recover-me",
    operation: "showcase",
  };
  // A persisted job must be recoverable even after operator configuration changes.
  await service.repository.createJob({
    id: "original",
    projectId: p._id,
    requestKey: request.requestKey,
    requestHash: fingerprint(request),
    status: "queued",
  });
  service.gemini = new GeminiClient({
    apiKey: "",
    imageModel: "",
    visionModel: "",
  });
  assert.equal((await service.enqueue(p._id, owner, request)).id, "original");
});

test("drawn preview leaves no files and reports the exact bytes later sent by the generation stage", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wedding-preview-"));
  try {
    const assets = new AssetStore(root);
    const pixels = await sharp({
      create: { width: 600, height: 600, channels: 3, background: "#cbbf87" },
    })
      .jpeg()
      .toBuffer();
    let sentBytes;
    const gemini = new GeminiClient({
      apiKey: "test-key",
      imageModel: "image",
      visionModel: "vision",
      fetchImpl: async (_, init) => {
        const payload = JSON.parse(init.body);
        if (payload.generationConfig.responseModalities) {
          sentBytes = Buffer.byteLength(init.body);
          assert.equal(
            payload.contents[0].parts.filter((p) => p.inlineData).length,
            3,
          );
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  finishReason: "STOP",
                  content: {
                    parts: [
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: pixels.toString("base64"),
                        },
                      },
                    ],
                  },
                },
              ],
            }),
          );
        }
        return new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        decision: "pass",
                        reason: "Preserved",
                        issues: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        );
      },
    });
    const service = new PipelineService({
      repository: new MemoryRepository(),
      assets,
      gemini,
    });
    const p = await service.create(owner, {
      description: "Ivory garden wedding",
    });
    const venue = await assets.write(pixels, "image/jpeg"),
      master = await assets.write(pixels, "image/jpeg");
    p.assets = [
      { ...venue, kind: "venue", view: "front", status: "approved" },
      { ...master, kind: "component_sheet", status: "approved" },
    ];
    p.components = [
      {
        id: "stage",
        category: "stage",
        description: "Timber stage",
        masterAssetId: master.id,
      },
    ];
    p.canvas = {
      baseAssetId: venue.id,
      regions: [
        {
          id: "stage-zone",
          action: "place",
          componentId: "stage",
          points: [
            [0.2, 0.2],
            [0.6, 0.2],
            [0.6, 0.6],
          ],
        },
      ],
      strokes: [],
    };
    await service.repository.casProject(p._id, 0, p);
    const files = await readdir(root);
    const inspection = await service.preview(p._id, owner, {
      revision: 1,
      operation: "showcase",
    });
    assert.deepEqual(await readdir(root), files);
    assert.equal(inspection.references.length, 3);
    assert.equal(
      inspection.references.filter((r) => r.derived && r.assetId === null)
        .length,
      1,
    );
    const result = await runStage(
      {
        id: "execute",
        snapshot: await service.get(p._id, owner),
        operation: "showcase",
        options: {},
      },
      { assets, gemini },
    );
    assert.equal(sentBytes, inspection.request.serializedBytes);
    assert.equal(
      result.assets.find((a) => a.kind === "showcase").status,
      "candidate",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
