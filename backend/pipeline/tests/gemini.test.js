import test from "node:test";
import assert from "node:assert/strict";
import { GeminiClient } from "../gemini.js";
const response = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
const imageResponse = {
  candidates: [
    {
      finishReason: "STOP",
      content: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: Buffer.from("imagebytes").toString("base64"),
            },
          },
        ],
      },
    },
  ],
};
test("Gemini payload includes labeled independent image parts for all references", async () => {
  let payload;
  const client = new GeminiClient({
    apiKey: "test-key",
    imageModel: "test-image",
    visionModel: "test-vision",
    fetchImpl: async (url, init) => {
      assert.match(url, /test-image:generateContent$/);
      payload = JSON.parse(init.body);
      return response(imageResponse);
    },
  });
  const result = await client.generate({
    text: "venue scene",
    references: [
      {
        role: "venue front",
        mimeType: "image/jpeg",
        buffer: Buffer.from("front"),
      },
      {
        role: "decor master",
        mimeType: "image/jpeg",
        buffer: Buffer.from("decor"),
      },
    ],
  });
  assert.equal(result.model, "test-image");
  assert.equal(payload.contents[0].parts.filter((p) => p.inlineData).length, 2);
  assert.ok(
    payload.contents[0].parts.some((p) => p.text?.includes("decor master")),
  );
  assert.equal(
    payload.generationConfig.responseModalities.includes("IMAGE"),
    true,
  );
});
test("text-only refusals cannot be accepted as an image", async () => {
  const client = new GeminiClient({
    apiKey: "test",
    imageModel: "image",
    fetchImpl: async () =>
      response({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "I cannot generate that" }] },
          },
        ],
      }),
  });
  await assert.rejects(client.generate({ text: "scene", references: [] }), {
    code: "PROVIDER_NO_IMAGE",
  });
});
test("semantic screening fails closed on invalid JSON and unsafe accept", async () => {
  for (const verdict of [
    "not-json",
    JSON.stringify({ decision: "accept", category: "unsafe", reason: "bad" }),
  ]) {
    const client = new GeminiClient({
      apiKey: "test",
      visionModel: "vision",
      fetchImpl: async () =>
        response({
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: verdict }] } },
          ],
        }),
    });
    await assert.rejects(
      client.screen({
        buffer: Buffer.from("x"),
        mimeType: "image/jpeg",
        kind: "venue",
      }),
      { code: "PROVIDER_INVALID_VERDICT" },
    );
  }
});
test("provider errors do not disclose response bodies or credentials", async () => {
  const client = new GeminiClient({
    apiKey: "secret",
    imageModel: "image",
    fetchImpl: async () =>
      new Response("secret private quota info", { status: 403 }),
  });
  await assert.rejects(
    client.generate({ text: "scene", references: [] }),
    (e) => e.code === "PROVIDER_HTTP_ERROR" && !e.message.includes("secret"),
  );
});

test("base64 expansion cannot bypass the serialized request size limit", async () => {
  const client = new GeminiClient({
    apiKey: "test",
    imageModel: "image",
    fetchImpl: async () => {
      throw new Error("must not submit oversized request");
    },
  });
  await assert.rejects(
    client.generate({
      text: "scene",
      references: [
        {
          role: "venue",
          mimeType: "image/jpeg",
          buffer: Buffer.alloc(16 * 1024 * 1024),
        },
      ],
    }),
    { code: "REFERENCE_LIMIT" },
  );
});

test("successful calls return measured bytes, duration and whitelisted usage without provider secrets", async () => {
  let requestBytes;
  const client = new GeminiClient({
    apiKey: "private-key",
    imageModel: "image",
    visionModel: "vision",
    fetchImpl: async (_, init) => {
      requestBytes = Buffer.byteLength(init.body);
      return response({
        ...imageResponse,
        usageMetadata: {
          promptTokenCount: 80,
          candidatesTokenCount: 20,
          totalTokenCount: 100,
          privateAccount: "private-key",
        },
      });
    },
  });
  const generated = await client.generate({
    text: "Wedding stage",
    references: [],
  });
  assert.equal(generated.telemetry.requestBytes, requestBytes);
  assert.ok(generated.telemetry.elapsedMs >= 0);
  assert.deepEqual(generated.telemetry.usage, {
    promptTokenCount: 80,
    candidatesTokenCount: 20,
    totalTokenCount: 100,
  });
  assert.equal(
    JSON.stringify(generated.telemetry).includes("private-key"),
    false,
  );
});
