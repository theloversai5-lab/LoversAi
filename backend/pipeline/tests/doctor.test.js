import test from "node:test";
import assert from "node:assert/strict";
import { inspectProvider } from "../doctor.js";
import { GeminiClient } from "../gemini.js";

test("keyless provider doctor never calls network or guesses models", async () => {
  const report = await inspectProvider({
    client: new GeminiClient({ apiKey: "", imageModel: "", visionModel: "" }),
    online: true,
    fetchImpl: async () => assert.fail("no key means no network"),
  });
  assert.equal(report.status, "blocked");
  assert.equal(report.generationVerified, false);
  assert.ok(report.blockers.includes("GEMINI_KEY_MISSING"));
  assert.deepEqual(report.models, []);
});
test("online doctor only checks exact model metadata and does not claim image capability", async () => {
  const seen = [];
  const report = await inspectProvider({
    client: new GeminiClient({
      apiKey: "private-key",
      imageModel: "image",
      visionModel: "vision",
    }),
    online: true,
    fetchImpl: async (url, init) => {
      seen.push(url);
      assert.equal(init.method, "GET");
      assert.equal(init.headers["x-goog-api-key"], "private-key");
      const model = url.endsWith("/image") ? "image" : "vision";
      return new Response(
        JSON.stringify({
          name: `models/${model}`,
          supportedGenerationMethods: ["generateContent"],
        }),
      );
    },
  });
  assert.equal(report.status, "catalog_verified");
  assert.equal(report.generationVerified, false);
  assert.equal(seen.length, 2);
  assert.ok(
    seen.every(
      (url) => !url.includes("generateContent") && !url.includes("private-key"),
    ),
  );
  assert.ok(report.models.every((m) => m.imageModalityVerified === false));
  assert.equal(JSON.stringify(report).includes("private-key"), false);
});
test("catalog failures and unsupported methods are sanitized blockers", async () => {
  const client = new GeminiClient({
    apiKey: "private-key",
    imageModel: "image",
    visionModel: "vision",
  });
  const denied = await inspectProvider({
    client,
    online: true,
    fetchImpl: async () =>
      new Response("private-key internal account data", { status: 403 }),
  });
  assert.equal(denied.status, "blocked");
  assert.equal(JSON.stringify(denied).includes("private-key"), false);
  const unsupported = await inspectProvider({
    client,
    online: true,
    fetchImpl: async (url) =>
      new Response(
        JSON.stringify({
          name: `models/${url.split("/").at(-1)}`,
          supportedGenerationMethods: ["embedContent"],
        }),
      ),
  });
  assert.equal(unsupported.status, "blocked");
  assert.ok(unsupported.blockers.includes("IMAGE_MODEL_UNSUPPORTED_METHOD"));
});
