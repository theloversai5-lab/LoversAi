import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareGeneration } from "../preparation.js";
import {
  generationRequest,
  providerReadiness,
  GeminiClient,
} from "../gemini.js";

test("preview preparation renders a drawing and preserves clean sources without writing assets", async () => {
  const pixels = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "#fff" },
  })
    .jpeg()
    .toBuffer();
  const snapshot = {
    revision: 4,
    brief: { description: "Garden" },
    components: [
      {
        id: "stage",
        category: "stage",
        description: "Timber",
        masterAssetId: "master",
      },
    ],
    assets: [
      {
        id: "front",
        kind: "venue",
        view: "front",
        status: "approved",
        mimeType: "image/jpeg",
      },
      {
        id: "back",
        kind: "venue",
        view: "back",
        status: "approved",
        mimeType: "image/jpeg",
      },
      {
        id: "master",
        kind: "component_sheet",
        status: "approved",
        mimeType: "image/jpeg",
      },
    ],
    canvas: {
      baseAssetId: "front",
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
    },
  };
  const original = structuredClone(snapshot);
  const prepared = await prepareGeneration(
    { operation: "showcase", options: {}, snapshot },
    {
      assets: {
        read: async (id) => {
          assert.ok(["front", "back", "master"].includes(id));
          return pixels;
        },
        write: async () => assert.fail("preview must not write"),
      },
    },
  );
  assert.deepEqual(snapshot, original);
  assert.equal(prepared.references.length, 4);
  assert.deepEqual(
    prepared.prompt.references
      .filter((r) => r.assetId !== prepared.overlay.id)
      .map((r) => r.assetId),
    ["front", "back", "master"],
  );
  const drawing = prepared.references.find(
    (r) => r.assetId === prepared.overlay.id,
  );
  assert.equal(drawing.mimeType, "image/png");
  const { data, info } = await sharp(drawing.buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (180 * info.width + 180) * info.channels;
  assert.ok(
    data[offset] > data[offset + 1],
    "placement region must actually be tinted red",
  );
});

test("inspection serializes the same payload that Gemini sends, without making a provider call", async () => {
  const input = {
    text: "Wedding composition",
    references: [
      {
        role: "venue front",
        mimeType: "image/jpeg",
        buffer: Buffer.from("front"),
      },
    ],
  };
  const planned = generationRequest(input);
  assert.equal(planned.serializedBytes, Buffer.byteLength(planned.body));
  assert.equal(planned.referenceBytes, 5);
  const payload = JSON.parse(planned.body);
  assert.equal(payload.contents[0].parts[2].inlineData.data, "ZnJvbnQ=");
  const client = new GeminiClient({
    apiKey: "private-secret",
    imageModel: "image",
    fetchImpl: async (_, init) => {
      assert.equal(init.body, planned.body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { inlineData: { mimeType: "image/jpeg", data: "eA==" } },
                ],
              },
            },
          ],
        }),
      );
    },
  });
  assert.equal((await client.generate(input)).buffer.toString(), "x");
});

test("provider readiness rejects placeholders and invalid model paths without revealing keys", () => {
  const result = providerReadiness({
    apiKey: "your_gemini_api_key_here",
    imageModel: "models/image",
    visionModel: "vision",
  });
  assert.equal(result.generationReady, false);
  assert.equal(result.screeningReady, false);
  assert.ok(result.blockers.includes("GEMINI_KEY_MISSING"));
  assert.ok(result.blockers.includes("IMAGE_MODEL_INVALID"));
  assert.equal(
    JSON.stringify(result).includes("your_gemini_api_key_here"),
    false,
  );
  const ready = providerReadiness({
    apiKey: "secret",
    imageModel: "image",
    visionModel: "vision",
  });
  assert.equal(ready.generationReady, true);
  assert.equal(ready.availabilityVerified, false);
});
