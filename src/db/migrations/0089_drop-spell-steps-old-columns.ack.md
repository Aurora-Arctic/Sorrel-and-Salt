# 0089_drop-spell-steps-old-columns — destructive DDL

Destructive DDL acknowledged: this is the contract step of M13.1's renames and of the step note's retirement (M13.9). M13.1 renamed `spell_ingredients` to `spell_steps` behind a `spell_ingredients` view and added `position` and `spells.note` beside `layer_order` and `instructions`; migration 0088 copied each step's `note` into its `body`. Every reader and writer now uses the new columns, so no deploy that meets this migration reads or writes the old ones or the view.

## Findings this covers

| Rule              | Statement                                                        |
| ----------------- | ---------------------------------------------------------------- |
| NOT NULL addition | `ALTER TABLE "spell_steps" ALTER COLUMN "position" SET NOT NULL` |
| DROP (any object) | `DROP VIEW "spell_ingredients"`                                  |
| DROP (any object) | `DROP INDEX "spell_steps_spell_id_layer_order_unique"`           |
| DROP (any object) | `ALTER TABLE "spell_steps" DROP COLUMN "layer_order"`            |
| DROP (any object) | `ALTER TABLE "spell_steps" DROP COLUMN "note"`                   |
| DROP (any object) | `ALTER TABLE "spells" DROP COLUMN "instructions"`                |

`DROP VIEW` is written by hand: Drizzle does not track the view, so `generate` never emits it.

## Why no deploy breaks

`migrate.yml` runs before `deploy.yml` promotes, so the risk in a drop is the deploy still serving while the migration runs. This task merges only after a release carrying M13.1 has reached production, so the deploy serving is M13.1's or later, and its Drizzle schema names `position`, `body` and `spells.note` instead of the old columns. The `NOT NULL` is safe for the same reason: the deploy before M13.1, which wrote `layer_order` alone and left `position` null, is gone. The tests named the four old objects in `PENDING_DROPS` until now, and that list is empty here.

## What is lost

Nothing a reader still sees.

- `layer_order` is copied into `position` first, on every step where the two differ and not only where `position` is null, because the deploy before M13.1 kept writing `layer_order` alone, a reorder included, until now. The copy goes through a negative scratch value so the per-row unique index on `position` never meets a clash mid-statement.
- `spells.instructions` is not copied into `spells.note`: nothing in production writes spells, so `note` has been the only live column since M13.1. Anything left in `instructions` is dropped with it.
- `spell_steps.note` was copied into `body` by 0088 and read by nothing since; the column and its values are dropped.
