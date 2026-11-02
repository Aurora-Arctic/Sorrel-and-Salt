# SourcingScore

`src/components/SourcingScore/` shows a curator how well a compendium entry is sourced: the total as a heading, "Sourcing Score: 38", then every fact that made it, one per line as "fact: points", for example "1 Source: +10" or "Forms Citing Nothing: 1: −5". Zero-point facts are listed too, so the curator reads what to fix as well as what is wrong, and the lines always add up to the heading.

The score and its facts come from `sourcingScore` in `src/modules/ingredients/services/sourcing-score.ts`, with every weight in `src/modules/ingredients/schema/sourcing-weights.ts`. The reasoning behind each fact and weight is in [`../design-decisions/m14.24-plan.md`](../design-decisions/m14.24-plan.md), "The score".

## Props

`SourcingScoreProps` (`types.ts`):

| Prop       | What it is                                                                  |
| ---------- | --------------------------------------------------------------------------- |
| `sourcing` | The `SourcingScore` the curator read returns: `score` and its `facts` list. |

## Where it shows

The compendium's edit dialog (`src/app/(shell)/admin/compendium/compendium-dialog.tsx`), above the form, on the admin compendium and on the public compendium's edit dialog for a curator. `readCompendiumEntry` in `read-entry.ts` reads the score through `readSourcingScore`, which refuses anyone who is not a curator or admin; an add has no score. The section is a landmark named by its heading, so a screen reader can jump to it.

## Testing

`tests/components/SourcingScore/index.test.tsx` checks the heading names the total and each line carries its signed points in order. `tests/app/(shell)/admin/compendium/compendium-dialog.test.tsx` checks the edit dialog shows it.
