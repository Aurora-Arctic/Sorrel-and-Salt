# The step note is retired (PR #1308)

**Decided by the owner, 2026-10-28:** "Delete note and keep body. Have it replace note in the form."

## What changed

`spell_steps.note`, the short per-ingredient line from before M13.1, is retired. `spell_steps.body` (the Instruction field) is the one text on a step. The builder already showed the Instruction field on a step with an ingredient, so the form gained nothing: it stopped carrying `note` through.

- Migration `0088_spell-steps-note-into-body` copies each live step's note into its body: the note alone becomes the body, a body alone stays, and both become `body`, a blank line, `note`. A removed step is left as it was. The notes themselves stay in the column.
- The same migration rewrites the CHECK `spell_steps_amount_on_ingredient` without `note` (DROP CONSTRAINT and ADD CONSTRAINT, acknowledged in `0088_spell-steps-note-into-body.ack.md`).
- The GraphQL `SpellStep` and `SpellStepInput` types, the Zod schema, the recipe service, the builder, the seeds and the tests no longer name it. A client that still sends `note` has it ignored.
- The Drizzle column stays declared, commented as retired.

## What is owed

Rule 10 asks for a column drop in its own PR. **M13.9 drops `spell_steps.note`**, with `layer_order` and `spells.instructions`; it is listed in `PENDING_DROPS` in `tests/db/schema-drift.test.ts`. Until then the deploy before this one may still write the column, and nothing reads it.

`spells.note`, the spell-level note, is a different field and stays.
