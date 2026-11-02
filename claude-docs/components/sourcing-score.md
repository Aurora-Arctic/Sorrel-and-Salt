# SourcingScore

`src/components/SourcingScore/` shows a curator how well a compendium entry is sourced. It has four parts, top to bottom:

1. **The heading**, "Sourcing Score: 38", an `h4` under the Sources section's `h3`, with an "About Sourcing Score" InfoTip beside it (not inside it, so the region's name stays the heading's text).
2. **The bar**, 0.5rem high and out of 100: gains in the accent, costs in the warning ink, the rest the quiet fill. It is `role="img"` with a label stating the numbers, "Gained 43, cost 5, out of 100". Gains stop at 100 and costs take only what the gains left, so a total over 100 or below 0 never overflows the track. The bar's height is the one value past the tokens, held in `$bar-height` in `index.scss`.
3. **The key**, "Gained +43 · Cost −5 · Out of 100", in muted caption ink, so colour is never the only carrier. It is hidden from screen readers, which hear the bar's label instead.
4. **The facts**, one row each: a 1rem stroke circle, the label, then signed points right-aligned in tabular numerals. A gain (points above 0) has a ticked circle in the accent, a cost (below 0) a dashed circle in the warning ink, and no points an empty circle in the muted ink. Rows run gains, then costs, then zeros, each group in the order the read returned them. The glyphs are `aria-hidden`; every row shows its sign and number, "+10", "−5" or "0", with a true minus sign. Zero-point facts are listed too, so the curator reads what to fix as well as what is wrong, and the rows always add up to the heading.

The score and its facts come from `sourcingScore` in `src/modules/ingredients/services/sourcing-score.ts`, with every weight in `src/modules/ingredients/schema/sourcing-weights.ts`. The reasoning behind each fact and weight is in [`../design-decisions/m14.24-plan.md`](../design-decisions/m14.24-plan.md), "The score".

## Props

`SourcingScoreProps` (`types.ts`):

| Prop       | What it is                                                                  |
| ---------- | --------------------------------------------------------------------------- |
| `sourcing` | The `SourcingScore` the curator read returns: `score` and its `facts` list. |

## Where it shows

The compendium's edit dialog (`src/app/(shell)/admin/compendium/compendium-dialog.tsx`), at the start of the form's Sources section (the form's `sourcesIntro` slot), on the admin compendium and on the public compendium's edit dialog for a curator. `readCompendiumEntry` in `read-entry.ts` reads the score through `readSourcingScore`, which refuses anyone who is not a curator or admin; an add has no score. The section is a landmark named by its heading, so a screen reader can jump to it.

## Testing

`tests/components/SourcingScore/index.test.tsx` checks the region is named by the heading, the rows run gains, costs then zeros with their signed points, the bar's accessible name states the numbers (including for a negative total), and the bar never passes its track. `tests/app/(shell)/admin/compendium/compendium-dialog.test.tsx` checks the edit dialog shows it.
