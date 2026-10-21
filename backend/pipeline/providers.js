// Selects the AI provider per role from .env:
//   WEDDING_AI_PROVIDER=gemini|openai      (default gemini; switches both roles)
//   WEDDING_IMAGE_PROVIDER / WEDDING_VISION_PROVIDER optionally override one role.
// No silent fallback: an unconfigured selected provider reports blockers and refuses paid work.
import { GeminiClient, ModelClient, keyLooksReal, modelValid } from "./gemini.js";
import { OpenAIClient } from "./openai.js";
import { fail } from "./contracts.js";

const PROVIDERS = ["gemini", "openai"];

export function providerSelection(env = process.env) {
  const pick = (value, fallback) => {
    const v = (value || fallback || "gemini").trim().toLowerCase();
    if (!PROVIDERS.includes(v)) fail("PROVIDER_NOT_CONFIGURED", `Unknown AI provider "${v}" (use gemini or openai)`, 503);
    return v;
  };
  const all = pick(env.WEDDING_AI_PROVIDER);
  return { image: pick(env.WEDDING_IMAGE_PROVIDER, all), vision: pick(env.WEDDING_VISION_PROVIDER, all) };
}

function roleReady(client, role) {
  const name = client.provider === "openai" ? "OPENAI" : "GEMINI";
  const key = keyLooksReal(client.apiKey);
  const model = modelValid(role === "image" ? client.imageModel : client.visionModel);
  return {
    ready: key && model,
    blockers: [
      ...(!key ? [`${name}_KEY_MISSING`] : []),
      ...(!model ? [`${name}_${role.toUpperCase()}_MODEL_INVALID`] : []),
    ],
  };
}

export class RoutedModelClient extends ModelClient {
  constructor({ image, vision }) {
    super();
    Object.assign(this, { imageClient: image, visionClient: vision });
  }
  get imageModel() { return this.imageClient.imageModel; }
  get visionModel() { return this.visionClient.visionModel; }
  get providers() { return { image: this.imageClient.provider, vision: this.visionClient.provider }; }
  readiness() {
    const img = roleReady(this.imageClient, "image"), vis = roleReady(this.visionClient, "vision");
    return {
      generationReady: img.ready && vis.ready,
      screeningReady: vis.ready,
      availabilityVerified: false,
      providers: this.providers,
      blockers: [...new Set([...img.blockers, ...vis.blockers])],
    };
  }
  generate(input) { return this.imageClient.generate(input); }
  structured(input) { return this.visionClient.structured(input); }
}

export function createModelClient(env = process.env, deps = {}) {
  const sel = providerSelection(env);
  const make = (name) => {
    if (name === "openai") return deps.openai || new OpenAIClient();
    const g = deps.gemini || new GeminiClient();
    g.provider = "gemini";
    return g;
  };
  const clients = {};
  for (const name of new Set([sel.image, sel.vision])) clients[name] = make(name);
  return new RoutedModelClient({ image: clients[sel.image], vision: clients[sel.vision] });
}
