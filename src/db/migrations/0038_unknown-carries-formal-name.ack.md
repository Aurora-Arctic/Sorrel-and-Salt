# 0038_unknown-carries-formal-name — destructive DDL

Destructive DDL acknowledged: `0038` replaces `ingredients_nomenclature_declares_canonical_name` with a wider CHECK under the same name, so that an `unknown` entry may carry a formal name (MB.161). Every row the old CHECK admitted, the new one admits, and no column or index is touched.

## Findings this covers

| Rule              | Statement                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_nomenclature_declares_canonical_name"` |

Nothing else in the migration is flagged: the `ADD CONSTRAINT` that follows re-creates the CHECK.

## Why the drop is safe

- **It only widens.** The old CHECK was `(nomenclature in ('none', 'unknown')) = (canonical_name is null)`; the new one is `nomenclature = 'unknown' or (nomenclature = 'none') = (canonical_name is null)`. For every kind but `unknown` the two say the same thing, and for `unknown` the old one's only admitted shape, a null formal name, the new one admits too. So the `ADD CONSTRAINT`'s validation finds no row to refuse, and nothing is backfilled.
- **No reader sees a gap.** `drizzle-kit migrate` applies the file in one transaction, so no write lands between the drop and its replacement.
- **Nothing names the constraint.** No error map reads it and no `ON CONFLICT` targets it; the name is kept so that DESIGN.md §5, the schema and the tests still find it.

## Why this is one PR, not two

CLAUDE.md rule 10 splits a column or index drop across two PRs because the deploy still serving when `migrate.yml` runs must not lose anything it reads. A CHECK is read by nothing, and the deploy still serving writes only rows the old CHECK admitted, which the new one admits. That deploy's Zod refuses an edit to an `unknown` row written with a formal name under MB.161 until the name is cleared or a kind chosen, so a rollback loses no write (`claude-docs/design-decisions/mb.161-plan.md`).

## What is lost

Nothing. No row changes, and the constraint is back before the transaction commits.
