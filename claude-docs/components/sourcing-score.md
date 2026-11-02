# SourcingScore

`src/components/SourcingScore/` shows a curator how well a compendium entry is sourced. It has four parts, top to bottom:

1. **The heading**, "Sourcing Score: 38", an `h4` under the Sources section's `h3`, with an "About Sourcing Score" InfoTip beside it (not inside it, so the region's name stays the heading's text).
2. **The bar**, 0.5rem high and out of 100: gains in the accent, costs in the warning ink, the rest the quiet fill. It is `role="img"` with a label stating the numbers, "Gained 43, cost 5, out of 100". Gains stop at 100 and costs take only what the gains left, so a total over 100 or below 0 never overflows the track. The bar's height is the one value past the tokens, held in `$bar-height` in `index.scss`.
3. **The key**, "Gained +43 · Cost −5 · Out of 100", in muted caption ink, so colour is never the only carrier. It is hidden from screen readers, which hear the bar's label instead.
4. **The facts**, a list with its markers cleared (`list-reset`, as the global `ul li::before` draws a ✦ that would become a grid cell), one row each: a 1rem stroke circle, the label, then signed points right-aligned in tabular numerals. A gain (points above 0) has a ticked circle in the accent, a cost (below 0) a dashed circle in the warning ink, and no points an empty circle in the muted ink. Rows run gains, then costs, then zeros, each group in the order the read returned them. The glyphs are `aria-hidden`; every row shows its sign and number, "+10", "−5" or "0", with a true minus sign. Zero-point facts are listed too, so the curator reads what to fix as well as what is wrong, and the rows always add up to the heading.

A hairline closes the panel off from the References field beneath. The padding above it is `space(5)`, equal to the Sources body's gap below it, and the panel's own bottom margin is cleared so the two sides match.

The score and its facts come from `sourcingScore` in `src/modules/ingredients/services/sourcing-score.ts`, with every weight in `src/modules/ingredients/schema/sourcing-weights.ts`. The reasoning behind each fact and weight is in [`../design-decisions/m14.24-plan.md`](../design-decisions/m14.24-plan.md), "The score".

## Props

`SourcingScoreProps` (`types.ts`):

| Prop           | What it is                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `sourcing`     | The `SourcingScore` the curator read returns: `score` and its `facts` list.                                                                  |
| `headingLevel` | The heading's level: 4 (the default) in the edit dialog, 3 on the entry page, under its References h2. The size is the h4's at either level. |

## On the entry page

The entry page shows the same panel, whole and always open, as the last block of the References section, with `headingLevel={3}`, so the section still ends the page. `ReferencesSection` takes it as `children`; the section is always drawn (with "No sources recorded." when there are none), so an entry with no references still shows the score. The section spaces its parts with its own stack gap and no hairline, so the panel takes that gap, and `.ingredient-entry__references .sourcing-score` drops the panel's bottom divider, margin and padding, as nothing follows it. There is no toggle.

## Where it shows

The compendium's edit dialog, at the start of the form's Sources section (the form's `sourcesIntro` slot). The admin compendium dialog and the entry page's dialog both render [`CompendiumEntryForm`](compendium-entry-form.md), which draws the panel from its `sourcing` prop. The admin page reads the score in `read-entry.ts`; the entry page reads it in `sourcingOf` in `src/app/(public)/compendium/ingredients/[slug]/page.tsx`. Both call `readSourcingScore`, which refuses anyone who is not a curator or admin; the entry page asks only when the viewer can curate, and the score is never in the cached public read. An add and a coven's own entry have none. The panel is a landmark named by its heading, so a screen reader can jump to it. The entry page also shows it at the foot of its References section, from the same read.

## Testing

`tests/components/SourcingScore/index.test.tsx` checks the region is named by the heading, the rows run gains, costs then zeros with their signed points, the bar's accessible name states the numbers (including for a negative total), and the bar never passes its track. `tests/app/(shell)/admin/compendium/compendium-dialog.test.tsx` checks the edit dialog shows it. The heading level prop is tested in the same file, and `tests/app/(public)/compendium/ingredients/slug-page.test.tsx` checks who is handed the score. The service refusal is `tests/modules/ingredients/services/compendium-sourcing.test.ts`.
