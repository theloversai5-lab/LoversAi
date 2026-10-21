# Brand and UI

Palette file: `docs/brand/palette.png`

## Colors — only these four

| Name | Hex | Use |
|---|---|---|
| Bottle green | `#1E4636` | Main dark field, most screens |
| Deep violet | `#3A2563` | Second dark field, night / ritual |
| Orange | `#F08A3C` | Action, ticks, borders, continue |
| Gold | `#E2B451` | Light field, display type on dark, ornament |

Forbidden: black, near-black, charcoal, red, pink, grey, pure white, blue.

How to keep contrast without extra colors:

- Dark green or violet field → type in gold.
- Gold or orange field → type in bottle green or violet.
- Orange = buttons, progress, focus rings. Not big backgrounds.

Tint only by mixing these four (for example gold at 20% over green). Never add a fifth hex.

## Greek mythology theme

Follow the **feel** of [Hermes Agent](https://hermes-agent.nousresearch.com/), not their colors.

Steal:

- Classical statues, marble grain, columns, laurel, meander (greek key)
- Dithered / etched art, duotoned into **green, violet, gold, orange**
- Huge condensed display type
- Full-bleed color blocks that switch: green → gold → violet → gold
- Ornament as frame, not clip-art stickers

Do not steal:

- Electric blue
- Black canvas
- Terminal / CLI as the brand
- Comic or cartoon gods

Mood: temple, silk, marble, dusk wedding. Gods as quiet guardians, not mascots.

Use the same ornaments, type, and rhythm on couple, planner, and vendor screens.

## Type

- Display: heavy, condensed, uppercase or tight title case. As large as the layout allows.
- Body: simple serif or humanist sans, still short lines.
- Never mix more than two families.
- Tracking on display can be tight. Line-height on display can be ~0.9–1.0 if glyphs do not collide.

**No text cuts.** Never `text-overflow: ellipsis`. Never `overflow: hidden` on text. Never truncate names or labels. Wrap to the next line. Widen the box. Shrink the type only as a last step, and stay readable.

## Unveiling

Screens reveal like a ceremony:

1. One question or one choice.
2. Short line of help under it.
3. Continue.
4. A gold progress tick moves.

No long forms. No sidebars full of fields. Scroll stories may unveil section by section the same way.

## Motion

Slow, short, ease-out. Fade and rise. No bounce. No red error flashes — use violet + gold for “wait” and orange for “try again”.
