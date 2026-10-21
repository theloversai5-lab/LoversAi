import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GeminiClient, providerReadiness } from "./gemini.js";
import { OpenAIClient } from "./openai.js";
import { providerSelection } from "./providers.js";
dotenv.config({ quiet: true });

async function catalogJson(response) {
  if (Number(response.headers.get("content-length")) > 65536)
    throw new Error("catalog-size");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > 65536) throw new Error("catalog-size");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function inspectProvider({
  client = new GeminiClient(),
  online = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  const local = providerReadiness(client);
  const report = {
    status: local.generationReady ? "configured_unverified" : "blocked",
    generationVerified: false,
    models: [],
    blockers: [...local.blockers],
  };
  if (!online || !local.generationReady) return report;
  for (const [role, model] of [
    ["image", client.imageModel],
    ["vision", client.visionModel],
  ]) {
    let result = {
      role,
      id: model,
      catalogAccessible: false,
      imageModalityVerified: false,
    };
    try {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
        {
          method: "GET",
          redirect: "error",
          headers: { "x-goog-api-key": client.apiKey },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error("catalog-http");
      const data = await catalogJson(response);
      if (
        data.name !== `models/${model}` ||
        !Array.isArray(data.supportedGenerationMethods)
      )
        throw new Error("catalog-format");
      result = {
        ...result,
        catalogAccessible: true,
        generateContentSupported:
          data.supportedGenerationMethods.includes("generateContent"),
      };
      if (!result.generateContentSupported)
        report.blockers.push(`${role.toUpperCase()}_MODEL_UNSUPPORTED_METHOD`);
    } catch {
      report.blockers.push(`${role.toUpperCase()}_MODEL_CATALOG_UNAVAILABLE`);
    }
    report.models.push(result);
  }
  report.status = report.blockers.length ? "blocked" : "catalog_verified";
  return report;
}
// Metadata-only check of the configured OpenAI models (GET /v1/models/{id}); no generation.
export async function inspectOpenAI({ client = new OpenAIClient(), roles = ["image", "vision"], online = false, fetchImpl = globalThis.fetch } = {}) {
  const local = client.readiness();
  const report = { provider: "openai", status: local.blockers.length ? "blocked" : "configured_unverified", models: [], blockers: [...local.blockers] };
  if (!online || local.blockers.includes("OPENAI_KEY_MISSING")) return report;
  for (const role of roles) {
    const id = role === "image" ? client.imageModel : client.visionModel;
    let ok = false;
    try {
      const r = await fetchImpl(`https://api.openai.com/v1/models/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${client.apiKey}` },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      ok = r.ok && (await r.json())?.id === id;
    } catch {}
    report.models.push({ role, id, catalogAccessible: ok });
    if (!ok) report.blockers.push(`OPENAI_${role.toUpperCase()}_MODEL_UNAVAILABLE`);
  }
  report.status = report.blockers.length ? "blocked" : "catalog_verified";
  return report;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const argv = process.argv.slice(2);
  if (argv.some((a) => a !== "--online")) {
    console.error("Supported option: --online (model metadata only)");
    process.exitCode = 2;
  } else {
    const online = argv.includes("--online"), sel = providerSelection();
    const openaiRoles = ["image", "vision"].filter((r) => sel[r] === "openai");
    const reports = [];
    if (openaiRoles.length) reports.push(await inspectOpenAI({ roles: openaiRoles, online }));
    if (openaiRoles.length < 2) reports.push({ provider: "gemini", ...(await inspectProvider({ online })) });
    const report = { selection: sel, status: reports.some((r) => r.status === "blocked") ? "blocked" : reports.every((r) => r.status === "catalog_verified") ? "catalog_verified" : "configured_unverified", reports };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === "blocked" ? 2 : 0;
  }
}
