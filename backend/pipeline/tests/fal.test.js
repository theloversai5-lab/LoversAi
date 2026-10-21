import test from "node:test";
import assert from "node:assert/strict";
import { FalClient, allowedFalMediaUrl, FAL_ANGLES_MODEL } from "../fal.js";

const KEY = "fal-secret-key-123";
const QUEUE = `https://queue.fal.run/${FAL_ANGLES_MODEL}`;
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
const source = { buffer: Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]), mimeType: "image/jpeg" };
const input = (over = {}) => ({
  ...source,
  horizontalAngle: 45,
  verticalAngle: 30,
  zoom: 5,
  note: "warm dusk light",
  ...over,
});

function fakeFetch({ statuses = ["IN_QUEUE", "IN_PROGRESS", "COMPLETED"], imageUrl = "https://v3.fal.media/files/out.jpg", overrides = {} } = {}) {
  const calls = [];
  let polls = 0;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (overrides[url]) return overrides[url](init);
    if (url === QUEUE && init.method === "POST")
      return json({
        request_id: "req-1",
        status_url: "https://evil.example/status",
        response_url: "https://evil.example/result",
      });
    if (url === `${QUEUE}/requests/req-1/status`)
      return json({ status: statuses[Math.min(polls++, statuses.length - 1)] });
    if (url === `${QUEUE}/requests/req-1`) return json({ images: [{ url: imageUrl }] });
    if (url === imageUrl) return new Response(Buffer.from("jpeg-bytes"), { status: 200 });
    throw new Error(`unexpected url ${url}`);
  };
  return { fetchImpl, calls };
}

test("fal adapter submits, polls fixed queue URLs, then downloads the result without credentials", async () => {
  const { fetchImpl, calls } = fakeFetch();
  let ownership = 0;
  const client = new FalClient({ fetchImpl, apiKey: KEY, pollIntervalMs: 1 });
  const out = await client.angles({ ...input(), assertOwnership: async () => ownership++ });
  assert.equal(out.buffer.toString(), "jpeg-bytes");
  assert.equal(out.provider, "fal");
  assert.equal(out.model, FAL_ANGLES_MODEL);
  assert.equal(out.telemetry.requestId, "req-1");
  const [submit, ...rest] = calls;
  assert.equal(submit.url, QUEUE);
  assert.equal(submit.init.headers.Authorization, `Key ${KEY}`);
  const body = JSON.parse(submit.init.body);
  assert.deepEqual(body.image_urls, [`data:image/jpeg;base64,${source.buffer.toString("base64")}`]);
  assert.equal(body.horizontal_angle, 45);
  assert.equal(body.vertical_angle, 30);
  assert.equal(body.zoom, 5);
  assert.equal(body.lora_scale, 1);
  assert.equal(body.num_images, 1);
  assert.equal(body.output_format, "jpeg");
  assert.equal(body.additional_prompt, "warm dusk light");
  assert.equal(body.enable_safety_checker, true);
  // Three status polls, the result fetch and the media download; provider status_url ignored.
  assert.deepEqual(
    rest.map((c) => c.url),
    [
      `${QUEUE}/requests/req-1/status`,
      `${QUEUE}/requests/req-1/status`,
      `${QUEUE}/requests/req-1/status`,
      `${QUEUE}/requests/req-1`,
      "https://v3.fal.media/files/out.jpg",
    ],
  );
  assert.ok(!calls.some((c) => c.url.includes("evil.example")));
  const download = calls.at(-1).init;
  assert.equal(download.redirect, "error");
  assert.equal(download.headers, undefined, "media download carries no Authorization");
  assert.ok(ownership >= 4, "lease checked before submit, between polls and before result");
  assert.ok(calls.every((c) => c.init.signal instanceof AbortSignal));
});

test("fal note defaults to null and lease loss stops polling", async () => {
  const { fetchImpl, calls } = fakeFetch({ statuses: ["IN_QUEUE"] });
  const client = new FalClient({ fetchImpl, apiKey: KEY, pollIntervalMs: 1 });
  let n = 0;
  await assert.rejects(
    client.angles({
      ...input({ note: undefined }),
      assertOwnership: async () => {
        if (++n > 2) {
          const e = new Error("lost");
          e.code = "WORKER_LEASE_LOST";
          e.status = 409;
          throw e;
        }
      },
    }),
    { code: "WORKER_LEASE_LOST" },
  );
  assert.equal(JSON.parse(calls[0].init.body).additional_prompt, null);
  assert.equal(calls.filter((c) => c.url.endsWith("/status")).length, 1);
});

test("fal polling times out explicitly", async () => {
  const { fetchImpl } = fakeFetch({ statuses: ["IN_QUEUE"] });
  const client = new FalClient({ fetchImpl, apiKey: KEY, pollIntervalMs: 5, timeoutMs: 40 });
  await assert.rejects(client.angles(input()), { code: "PROVIDER_TIMEOUT", status: 504 });
});

test("SSRF guard only accepts HTTPS fal media hosts", async () => {
  for (const url of [
    "https://fal.media/x.jpg",
    "https://v3.fal.media/files/a.jpg",
    "https://cdn.fal.run/a.jpg",
  ])
    assert.equal(allowedFalMediaUrl(url), true, url);
  for (const url of [
    "http://v3.fal.media/a.jpg",
    "https://evil.com/a.jpg",
    "https://fal.media.evil.com/a.jpg",
    "https://evilfal.media/a.jpg",
    "https://user:pw@v3.fal.media/a.jpg",
    "https://v3.fal.media:8443/a.jpg",
    "file:///etc/passwd",
    "data:image/jpeg;base64,AAAA",
    "not a url",
  ])
    assert.equal(allowedFalMediaUrl(url), false, url);
  for (const imageUrl of ["https://169.254.169.254/latest/meta-data", "http://v3.fal.media/a.jpg"]) {
    const { fetchImpl, calls } = fakeFetch({ imageUrl });
    const client = new FalClient({ fetchImpl, apiKey: KEY, pollIntervalMs: 1 });
    await assert.rejects(client.angles(input()), { code: "PROVIDER_INVALID_IMAGE" });
    assert.ok(!calls.some((c) => c.url === imageUrl), "disallowed URL never fetched");
  }
});

test("fal errors never expose the key or provider bodies", async () => {
  const cases = [
    { [QUEUE]: () => json({ detail: `bad key ${KEY}` }, 401) },
    { [QUEUE]: () => { throw new Error(`socket closed for ${KEY}`); } },
    { [`${QUEUE}/requests/req-1`]: () => json({ detail: `failed ${KEY}` }, 500) },
    { [`${QUEUE}/requests/req-1/status`]: () => json({ status: "FAILED", error: KEY }) },
  ];
  const codes = [];
  for (const overrides of cases) {
    const { fetchImpl } = fakeFetch({ overrides });
    const client = new FalClient({ fetchImpl, apiKey: KEY, pollIntervalMs: 1 });
    await assert.rejects(client.angles(input()), (e) => {
      codes.push(e.code);
      assert.ok(!e.message.includes(KEY), e.message);
      assert.ok(!JSON.stringify(e).includes(KEY));
      return true;
    });
  }
  assert.deepEqual(codes, ["PROVIDER_HTTP_ERROR", "PROVIDER_UNAVAILABLE", "PROVIDER_HTTP_ERROR", "PROVIDER_FAILED"]);
  const missing = new FalClient({ fetchImpl: async () => assert.fail("no request"), apiKey: "" });
  assert.equal(missing.configured(), false);
  await assert.rejects(missing.angles(input()), { code: "PROVIDER_NOT_CONFIGURED", status: 503 });
});

test("fal rejects invalid request ids and oversized media", async () => {
  const badId = fakeFetch({ overrides: { [QUEUE]: () => json({ request_id: "../../x" }) } });
  await assert.rejects(
    new FalClient({ fetchImpl: badId.fetchImpl, apiKey: KEY, pollIntervalMs: 1 }).angles(input()),
    { code: "PROVIDER_INVALID_RESPONSE" },
  );
  const url = "https://v3.fal.media/files/big.jpg";
  const big = fakeFetch({
    imageUrl: url,
    overrides: {
      [url]: () =>
        new Response(Buffer.alloc(10), { headers: { "content-length": String(26 * 1024 * 1024) } }),
    },
  });
  await assert.rejects(
    new FalClient({ fetchImpl: big.fetchImpl, apiKey: KEY, pollIntervalMs: 1 }).angles(input()),
    { code: "PROVIDER_RESPONSE_TOO_LARGE" },
  );
});
