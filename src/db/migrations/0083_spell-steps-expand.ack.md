# 0083_spell-steps-expand — destructive DDL

Destructive DDL acknowledged: this is the expand step of renaming the `spell_ingredients` table to `spell_steps` (M13.1), so that a spell's recipe is one ordered list of steps, each an instruction, an ingredient, or both. The table is renamed and a view named `spell_ingredients` over it takes the old name, so the deploy still serving reads and writes the same rows through the view. The renamed indexes, CHECKs and foreign keys are names no statement of that deploy relies on. The exactly-one CHECK `spell_ingredients_ingredient_or_name` is dropped and replaced in the same transaction by two wider ones, which admit every row the deploy before writes.

## Findings this covers

| Rule                     | Statement                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| RENAME (column or table) | `ALTER TABLE "spell_ingredients" RENAME TO "spell_steps"`                                                                                          |
| RENAME (column or table) | `ALTER INDEX "spell_ingredients_spell_id_layer_order_unique" RENAME TO "spell_steps_spell_id_layer_order_unique"`                                  |
| RENAME (column or table) | `ALTER INDEX "spell_ingredients_spell_id_variant_id_unique" RENAME TO "spell_steps_spell_id_variant_id_unique"`                                    |
| RENAME (column or table) | `ALTER INDEX "spell_ingredients_spell_id_custom_name_unique" RENAME TO "spell_steps_spell_id_custom_name_unique"`                                  |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_form_only_on_custom" TO "spell_steps_form_only_on_custom"`                         |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_variant_with_ingredient" TO "spell_steps_variant_with_ingredient"`                 |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_name_not_blank" TO "spell_steps_name_not_blank"`                                   |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_form_not_blank" TO "spell_steps_form_not_blank"`                                   |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_variant_fk" TO "spell_steps_variant_fk"`                                           |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_spell_id_spells_id_fk" TO "spell_steps_spell_id_spells_id_fk"`                     |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_ingredient_id_ingredients_id_fk" TO "spell_steps_ingredient_id_ingredients_id_fk"` |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_created_by_users_id_fk" TO "spell_steps_created_by_users_id_fk"`                   |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_updated_by_users_id_fk" TO "spell_steps_updated_by_users_id_fk"`                   |
| RENAME (column or table) | `ALTER TABLE "spell_steps" RENAME CONSTRAINT "spell_ingredients_deleted_by_users_id_fk" TO "spell_steps_deleted_by_users_id_fk"`                   |
| DROP (any object)        | `ALTER TABLE "spell_steps" DROP CONSTRAINT "spell_ingredients_ingredient_or_name"`                                                                 |

## Why no deploy breaks

`migrate.yml` runs before `deploy.yml` promotes, so the deploy before this one meets the renamed table for the length of the rollout, and again after any rollback to it. Every statement it sends names `spell_ingredients`, and the view serves each of them: a simple view over one table is updatable in Postgres, so its inserts and updates with `RETURNING` and its soft deletes write the table, and the table's `set_updated_at` trigger fires for them. MB.252 measured this for the `planets` view (`claude-docs/design-decisions/mb.252-table-rename.md`).

The new columns do not get in its way. `position` and `body` are nullable, so its inserts, which name neither, still pass. The two CHECKs replacing the exactly-one CHECK admit every row it writes: a step with exactly one of an ingredient and a name holds at most one identity and is not empty. The new amount CHECK admits every such row too, since each carries an identity. No code maps one of the renamed index or constraint names to an error message, so no message changes.

## What is lost

Nothing. Every row keeps its values under the same table, now named `spell_steps`, and `position` and `spells.note` start as copies of `layer_order` and `instructions`. The rows the deploy before writes after this migration hold only the old columns; M13.9 fills the new ones again from them before it drops the old ones.
