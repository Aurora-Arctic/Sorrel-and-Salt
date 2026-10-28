# PR #1308: a spell may lay one form in several steps

No task id: the change rides in PR #1308 (the spell builder's step list) at the owner's request.

## The rule before

A spell held each form once. `spell_steps_spell_id_variant_id_unique`, a partial unique index on `(spell_id, variant_id)` over live rows, enforced it (MB.217 moved it from the ingredient to the form). The shared Zod check `distinctSteps` refused a repeated `variantId` with the same message, and the builder's picker listed a form already in the jar as "Already in the jar" and disabled it.

## The owner's call

2026-10-28: "You should be able to select an ingredient multiple times for different steps in the jar." The owner asked for it in this PR, not as a separate task.

## Why

A working can use the same form at two points of the recipe: some salt in the first step, more at the end. One row per form forced the cook to merge them into one step and lose the order.

## What changed

- **Index.** Migration `0087_spell-steps-repeat-forms.sql` drops the index. The custom-name index stays: a one-off name is still once per jar. `position` and `layer_order` stay unique per spell.
- **Zod.** `distinctSteps` (`src/modules/grimoire/validation/spell.ts`) no longer refuses a repeated `variantId`.
- **Service.** `writeRecipe` moves a step aside only when it changes to or from a custom name. `lockStepsOfVariants` and `moveSteps` needed no change.
- **Picker.** A form already in the jar is pickable again. A one-off name already in the jar is still refused.
- **Supply.** Coven Inventory judges a form on the sum of what all its steps need, converted through `unitConvert`. If any step cannot convert, each line of that form reads Units Differ. Each step keeps its own line.
- **Docs.** DESIGN.md §5 and the decisions table, `db/grimoire.md`, `db/demo-scenario.md` and `components/spell-builder.md`.

## Departure from rule 10

CLAUDE.md rule 10 says an index drop is two PRs, each its own task: remove the code that relies on it, then drop it. Here the code and the drop are one PR, at the owner's instruction. This is safe because dropping a uniqueness rule cannot break a deploy still running: the old code only ever writes sets of steps that satisfy the stricter rule. The sidecar `0087_spell-steps-repeat-forms.ack.md` records this.
