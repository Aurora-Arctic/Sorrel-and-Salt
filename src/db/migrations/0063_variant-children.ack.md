# 0063_variant-children — destructive DDL

Destructive DDL acknowledged: `0063` gives stock, spell layers, category pairs, substitutes and reference links a variant column (MB.217). To do that it drops four unique indexes and three constraints and re-creates each, in the same transaction, keyed on the variant or wider than before. It also adds `inventory_items.variant_id` as `NOT NULL` with no `DEFAULT` on a table that holds no row on any deploy target. No column is dropped, and nothing the deploy still serving writes is refused.

## Findings this covers

| Rule                                      | Statement                                                                                                  | Re-created as                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DROP (any object)                         | `ALTER TABLE "ingredient_substitutes" DROP CONSTRAINT "ingredient_substitutes_not_itself"`                 | The same name, narrowed to the same ingredient _and_ the same form, so a sibling form may stand in                                                     |
| DROP (any object)                         | `ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_one_row"`                                  | The same name over six columns, the `SOURCED` registry's new `ingredient_variant_id` among them                                                        |
| DROP (any object)                         | `DROP INDEX "spell_ingredients_spell_id_ingredient_id_unique"`                                             | `spell_ingredients_spell_id_variant_id_unique`, one live layer per jar and variant                                                                     |
| DROP (any object)                         | `DROP INDEX "inventory_items_workspace_id_ingredient_id_unique"`                                           | `inventory_items_workspace_id_variant_id_unique`, one live row per coven and variant                                                                   |
| DROP (any object)                         | `DROP INDEX "ingredient_substitutes_link_unique"`                                                          | The same name and key, its predicate adding `variant_id IS NULL`, beside `ingredient_substitutes_variant_link_unique` for a form's own list            |
| DROP (any object)                         | `DROP INDEX "ingredient_substitutes_name_unique"`                                                          | The same name and key, its predicate adding `variant_id IS NULL`, beside `ingredient_substitutes_variant_name_unique`                                  |
| DROP (any object)                         | `ALTER TABLE "ingredient_categories" DROP CONSTRAINT "ingredient_categories_ingredient_id_category_id_pk"` | `ingredient_categories_ingredient_category_unique` on the same pair where `variant_id IS NULL`, beside `ingredient_categories_variant_category_unique` |
| `ADD COLUMN ... NOT NULL` without DEFAULT | `ALTER TABLE "inventory_items" ADD COLUMN "variant_id" uuid NOT NULL`                                      | No re-creation needed                                                                                                                                  |

The `DO` guard and the `UPDATE` that fills `spell_ingredients.variant_id` are not findings.

## Why each finding is safe

- **The two substitute indexes and `not_itself`.** Every existing row has a null `variant_id` and a null `substitute_variant_id`, because the columns are new. On those rows the new predicates and the new CHECK say exactly what the old ones said, so they hold the same rows to the same rule.
- **`reference_links_one_row`.** The new CHECK counts one more column, which is null on every existing row. Each row that had one sourced column still has exactly one.
- **The category pair key.** The new unique index on `(ingredient_id, category_id)` covers every existing row, since `variant_id` is null on all of them, so it refuses the same duplicates the key did. The two columns keep their own `NOT NULL`. Nothing names the key: no error map reads it and no `ON CONFLICT` targets it.
- **The layer and stock indexes.** These now key on the variant rather than the ingredient. The layers are filled with their ingredient's single live variant before the index is used, and the guard refuses a database where that variant is missing or not the only one. Because each ingredient's layers map to exactly one variant, a jar holding an ingredient once holds its variant once. `inventory_items` is empty on staging and production.
- **`inventory_items.variant_id NOT NULL`.** The table holds no row on any deploy target: nothing writes stock until M9.4. On a database that did hold a row, the `ALTER` would fail outright rather than leave a row without a variant.
- **No reader sees a gap.** `drizzle-kit migrate` applies the file in one transaction, so no write lands between a drop and its re-creation.

## Why this is one PR, not two

CLAUDE.md rule 10 splits a column or index drop across two PRs because the deploy still serving when `migrate.yml` runs must not lose anything it reads. This migration drops no column. No index or constraint name it drops is read by the deploy still serving: none is named in `src/` outside the schema files.

That deploy's own writes still succeed after this migration:

- It writes category pairs and substitutes with a null variant, which the re-created indexes and CHECKs admit on the same terms as before.
- It writes reference links naming one column, which the six-column CHECK admits.
- It writes no stock row.
- It writes no spell layer outside the `demo` seed, which never runs on a deploy target.

The precedent for replacements in one transaction is `0029` and `0038` (`claude-docs/db/expand-contract.md`). Read CLAUDE.md rule 10 strictly instead, and this task becomes two (`claude-docs/design-decisions/mb.215-plan.md`, "Risks").

## What is lost

Nothing. No row is deleted and no column is dropped. The only value written is each linked layer's variant, filled from the one live variant 0062 gave its ingredient. Every guarantee is back before the transaction commits, keyed on the variant or wider.
