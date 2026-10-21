// Estimated provider cost from recorded token usage. USD per 1M tokens, standard tier.
// Sources (read 2026-10-19): developers.openai.com/api/docs/pricing, ai.google.dev/gemini-api/docs/pricing,
// fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles. Override with WEDDING_PRICING_JSON.
export const PRICES = {
  "gpt-image-2": { textIn: 5, imageIn: 8, imageOut: 30, verified: true },
  "gpt-image-1.5": { textIn: 5, imageIn: 8, imageOut: 32, textOut: 10, verified: true },
  "gpt-image-1": { textIn: 5, imageIn: 10, imageOut: 40, verified: true },
  "gpt-image-1-mini": { textIn: 2, imageIn: 2.5, imageOut: 8, verified: true },
  "gpt-4.1": { in: 2, cachedIn: 0.5, out: 8, verified: true },
  "gpt-4.1-mini": { in: 0.4, cachedIn: 0.1, out: 1.6, verified: true },
  // Gemini 3.6 Flash: $0.75 / $3.75 through 2026-12-31 (doubles from 2027-01-01).
  "gemini-3.6-flash": { in: 0.75, out: 3.75, verified: true },
  "gemini-3.8-flash": { in: 0.75, out: 3.75, verified: true },
  // Nano Banana 2.1 rates came from a summary of the pricing page, not verbatim text.
  "gemini-nano-banana-2.1": { in: 1.5, imageOut: 30, textOut: 7.5, verified: false },
  "fal-ai/qwen-image-edit-2511-multiple-angles": { perMegapixel: 0.035, verified: true },
};

function table(env = process.env) {
  if (!env.WEDDING_PRICING_JSON) return PRICES;
  try {
    return { ...PRICES, ...JSON.parse(env.WEDDING_PRICING_JSON) };
  } catch {
    return PRICES;
  }
}
const n = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
const perM = (tokens, rate) => (n(tokens) * n(rate)) / 1e6;

// kind: "image" (generation) | "vision" (screening, QA, analysis, suggestions)
export function estimateCost({ provider, model, usage, kind, width, height }, env) {
  const p = table(env)[model];
  if (!p) return { cost: null, reason: "unpriced_model" };
  if (p.perMegapixel) {
    if (!width || !height) return { cost: null, reason: "missing_dimensions" };
    return { cost: ((width * height) / 1e6) * p.perMegapixel, verified: p.verified };
  }
  if (!usage) return { cost: null, reason: "missing_usage" };
  let cost;
  if (provider === "openai" && kind === "image") {
    const d = usage.input_tokens_details || {};
    const text = d.text_tokens ?? (d.image_tokens == null ? usage.input_tokens : 0);
    cost = perM(text, p.textIn) + perM(d.image_tokens, p.imageIn) + perM(usage.output_tokens, p.imageOut);
  } else if (provider === "openai") {
    const cached = usage.input_tokens_details?.cached_tokens || 0;
    cost = perM(n(usage.input_tokens) - cached, p.in) + perM(cached, p.cachedIn ?? p.in) + perM(usage.output_tokens, p.out);
  } else {
    // Gemini: candidates are image tokens for image models; thinking tokens bill as text output.
    const outRate = kind === "image" ? p.imageOut ?? p.out : p.out ?? p.textOut;
    cost =
      perM(usage.promptTokenCount, p.in) +
      perM(usage.candidatesTokenCount, outRate) +
      perM(usage.thoughtsTokenCount, p.textOut ?? p.out);
  }
  return { cost, verified: p.verified };
}

const GENERATED = ["venue_isometric", "venue_360", "component_sheet", "showcase", "placement", "region_edit", "element_view"];
const ANALYSIS = ["layout_plan", "component_specs"];

// Every priced provider call recorded on the project's assets plus the usage ledger.
export function projectCosts(project, ledger = [], env) {
  const items = [];
  const push = (operation, kind, t, extra = {}) => {
    if (!t) return;
    const est = estimateCost({ provider: t.provider, model: t.model, usage: t.usage, kind, ...extra }, env);
    items.push({ at: extra.at ?? null, operation, provider: t.provider, model: t.model, kind, cost: est.cost, verified: est.verified ?? false, reason: est.reason, usage: t.usage ?? null });
  };
  for (const a of project.assets || []) {
    if (a.screening?.telemetry) push("screen_assets", "vision", a.screening.telemetry, { at: a.createdAt });
    if (GENERATED.includes(a.kind)) {
      if (a.provider === "fal")
        push(a.kind, "image", { provider: "fal", model: a.model }, { at: a.createdAt, width: a.width, height: a.height });
      else push(a.kind, "image", a.generationTelemetry, { at: a.createdAt });
      if (a.qa?.telemetry) push(`${a.kind} QA`, "vision", a.qa.telemetry, { at: a.createdAt });
    }
    if (ANALYSIS.includes(a.kind)) push(a.kind, "vision", a.generationTelemetry, { at: a.createdAt });
  }
  for (const u of ledger) push(u.operation, u.kind || "vision", u.telemetry, { at: u.at });
  const round = (v) => Math.round(v * 10000) / 10000;
  const byProvider = {}, byOperation = {};
  let total = 0, unpriced = 0;
  for (const i of items) {
    if (i.cost == null) {
      unpriced++;
      continue;
    }
    total += i.cost;
    byProvider[i.provider] = round((byProvider[i.provider] || 0) + i.cost);
    const o = (byOperation[i.operation] ||= { calls: 0, cost: 0 });
    o.calls++;
    o.cost = round(o.cost + i.cost);
  }
  return {
    currency: "USD",
    total: round(total),
    byProvider,
    byOperation,
    unpricedCalls: unpriced,
    items: items.map((i) => ({ ...i, cost: i.cost == null ? null : round(i.cost) })),
    pricingNote:
      "Estimated from provider-reported token usage at standard list prices; excludes failed calls that produced no output. Nano Banana 2.1 rates are unverified.",
  };
}
