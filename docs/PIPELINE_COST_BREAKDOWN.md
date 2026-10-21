# Venue Studio — cost per full run (measured 2026-10-20)

Same scripted flow on each provider: 3 venue photos screened -> isometric + 360 -> 4 library references -> 4 angle views -> 4 AI suggestions -> 1 region edit (4 pins) -> final 360 -> 4 element specs. Costs are computed from provider-reported token usage at standard list prices (`backend/pipeline/pricing.js`, live at `GET /projects/:id/costs`).

| Step (calls) | OpenAI gpt-image-2 + gpt-4.1 | Gemini Nano Banana 2.1 + 3.6 Flash* |
|---|---|---|
| Photo screening (3) | $0.005 | $0.005 |
| Isometric (1 + QA) | $0.064 | $0.064 |
| 360 from photos (1 + QA) | $0.070 | $0.089 |
| Element angle views (4 + QA) | $0.255 | $0.258 |
| AI suggestions (4) | $0.021 | $0.028 |
| Region edit, 4 pins (1 + QA) | $0.138 | $0.076 |
| Final 360 of design (1 + QA) | $0.070 | $0.089 (failed QA twice in practice) |
| Element specs (4) | $0.036 | $0.037 |
| **Clean run total** | **$0.66** | **$0.64** |
| Actual measured spend incl. retries | $0.66 (no retries, ~6.5 min) | $0.77 (2 QA rejects, 1 HTTP error, final 360 never passed, ~7.5 min+) |

\* Nano Banana 2.1 rates came from a summary of the Google pricing page, not verbatim text. Gemini 3.6 Flash rates double on 2027-01-01 ($1.50 / $7.50 per 1M).

Prices used (USD / 1M tokens): gpt-image-2 text in 5, image in 8, image out 30; gpt-4.1 in 2, out 8; Nano Banana 2.1 in 1.50, image out 30; Gemini 3.6 Flash in 0.75, out 3.75.

Observations
- Totals are close; the biggest cost is the 4 angle views (~40%). Using one angle per element only when needed, or `gpt-image-1-mini` / quality `low` for previews, cuts that sharply.
- OpenAI region edit costs ~2x Gemini (larger image input), but OpenAI produced every step first time; Gemini failed the eye-level 360 of the final design (returned aerial views).
- OpenAI QA (gpt-4.1) returned "review" more often than Gemini — stricter, not failures.
- Failed provider calls that return no image are not counted (provider may still bill some input tokens).
