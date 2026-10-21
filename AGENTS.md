# Lovers AI — agent instructions

Read these before writing UI. The new product lives in `frontend/`. The old app is frozen in `frontend-legacy/` — do not rebuild there.

## Now

We are building the **new website UI**. AI tools come later. Match the flow in `docs/PRODUCT.md`. Match the look in `docs/BRAND.md`. Match the words in `docs/COPY.md`.

## Always load

- `.cursor/rules/product.mdc`
- `.cursor/rules/ui-theme.mdc`
- `.cursor/rules/copy-voice.mdc`
- `.cursor/rules/repo-layout.mdc`

## Hard rules

1. Only these four colors: `#1E4636` `#3A2563` `#F08A3C` `#E2B451`
2. Never black. Never red.
3. Greek-mythology look, same family as [Hermes Agent](https://hermes-agent.nousresearch.com/) — marble, engravings, heavy type — using **our** four colors, not their blue/black.
4. One visual language on every screen.
5. Words a child can read. **At most 4–5 words per line.** Shortest line wins.
6. Unveiling: one step, then the next. Do not dump a long form.
7. Heavy display type. Text must never clip, ellipsis, or hide.

## Source of truth

| File | Use |
|---|---|
| `docs/PRODUCT.md` | What we are building (from website flow deck) |
| `docs/BRAND.md` | Colors, type, Greek theme |
| `docs/COPY.md` | How we write |
| `docs/brand/palette.png` | Color picture |
