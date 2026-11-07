# SourcingScore

`src/components/SourcingScore/` shows a curator how well a compendium entry is sourced: a heading ("Sourcing Score: 38", an `h4` by default, `headingLevel` 3 on the entry page, same size), a bar out of 100, a key, and one row per fact.

- **The InfoTip sits beside the heading, not inside it**, so the region's name stays the heading's text. The panel is a landmark named by that heading.
- **The bar is `role="img"`** with a label stating the numbers ("Gained 43, cost 5, out of 100"). Gains stop at 100 and costs take only what the gains left, so a total over 100 or below 0 never overflows the track. Its height is the one value past the tokens (`$bar-height`).
- **The key is `aria-hidden`** (the bar's label is what is heard) and states the numbers in text, so colour is never the only carrier.
- **Facts list every weight, zero-point ones too**, so the curator reads what to fix as well as what is wrong, and the rows always add up to the heading. Rows run gains, then costs, then zeros, each in the order the read returned them. Each shows its sign and number with a true minus sign; the circle glyphs are `aria-hidden`. The list clears its markers (`list-reset`), as the global `ul li::before` ✦ would become a grid cell.
- **Forced colours.** The track takes a 1px `CanvasText` border, gains are `Highlight` and losses `CanvasText`.

The score and facts come from `sourcingScore` in `src/modules/ingredients/services/sourcing-score.ts`, with every weight in `src/modules/ingredients/schema/sourcing-weights.ts`; the reasoning is in [`../design-decisions/m14.24-plan.md`](../design-decisions/m14.24-plan.md), "The score".

## Where it shows

- **The compendium edit dialog**, at the start of the Sources section (the form's `sourcesIntro` slot). The admin dialog and the entry page's dialog both render [`CompendiumEntryForm`](ingredient-form.md#compendium-entry-form), which draws the panel from its `sourcing` prop. An add and a coven's own entry have none.
- **The entry page**, whole and always open, as the last block of the References section (`ReferencesSection` takes it as `children`) with `headingLevel={3}`, so the section still ends the page. The section is always drawn ("No sources recorded." when empty), so an entry with no references still shows the score. `.ingredient-entry__references .sourcing-score` drops the panel's bottom divider, margin and padding, as nothing follows it.

In the dialog a hairline closes the panel off from the References field; the padding above it is `space(5)`, equal to the Sources body's gap below it, and the panel's own bottom margin is cleared so the two match.

**Who may read it.** The admin page reads the score in `read-entry.ts`; the entry page in `sourcingOf` in `src/app/(public)/compendium/ingredients/[slug]/page.tsx`. Both call `readSourcingScore`, which refuses anyone who is not a curator or keeper; the entry page asks only when the viewer can curate, and the score is never in the cached public read.

## Tests

`tests/components/SourcingScore/index.test.tsx`, `tests/app/(shell)/curator/compendium/compendium-dialog.test.tsx` (the edit dialog shows it; the heading level), `tests/app/(public)/compendium/ingredients/slug-page.test.tsx` (who is handed the score) and `tests/modules/ingredients/services/compendium-sourcing.test.ts` (the service refusal).
