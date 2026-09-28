# 0017_custom-spell-ingredients — destructive DDL

Destructive DDL acknowledged: `0017` drops the `(spell_id, ingredient_id)` primary key and the `(spell_id, layer_order)` unique index on `spell_ingredients`, a table that is empty and unqueried until Wave 13. The key moves onto `(spell_id, layer_order)` — already unique through the index being dropped — and "one ingredient per jar" is held by a partial unique index created earlier in the same file, so every guarantee is taken over before the thing that used to hold it goes. `DROP NOT NULL` on `ingredient_id` widens and is exempt.

## Findings this covers

| Rule              | Statement                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "spell_ingredients" DROP CONSTRAINT "spell_ingredients_spell_id_ingredient_id_pk"` |
| DROP (any object) | `DROP INDEX "spell_ingredients_spell_id_layer_order_unique"`                                    |

## Provenance

The wording above is [PR #126](https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/126)'s acknowledgement line, verbatim. It was correct and argued when `0017` landed; MB.48 moved it here because a PR body does not survive the merge that closes it, and release 0.2.0's PR then rescanned this migration with nowhere to read the acknowledgement from.
