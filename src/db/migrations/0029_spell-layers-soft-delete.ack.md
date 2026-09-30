# 0029_spell-layers-soft-delete — destructive DDL

Destructive DDL acknowledged: `0029` replaces `spell_ingredients`' `(spell_id, layer_order)` primary key with a surrogate `id` and re-creates its two partial unique indexes under the same names with `deleted_at IS NULL` added, so that a layer removed from a spell is a tombstone holding nothing. Every guarantee is taken over before what held it goes, no column is dropped, and the table is empty on staging and production.

## Findings this covers

| Rule              | Statement                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "spell_ingredients" DROP CONSTRAINT "spell_ingredients_spell_id_layer_order_pk"` |
| DROP (any object) | `DROP INDEX "spell_ingredients_spell_id_ingredient_id_unique"`                                |
| DROP (any object) | `DROP INDEX "spell_ingredients_spell_id_custom_name_unique"`                                  |

The `id` column is added `NOT NULL` with a default, which fills any existing row, so the check does not flag it.

## Why each drop is safe

- **The primary key.** `spell_ingredients_spell_id_layer_order_unique`, on the same two columns, is created earlier in the file, while every row is live, so it holds exactly what the key held when the key goes. The key's `NOT NULL` on both columns stays, because both columns declare it themselves.
- **The two indexes.** Each is dropped and re-created with the same name and columns in the next statement. The new predicate differs only on rows carrying a `deleted_at`, and until this migration no row could.

`drizzle-kit migrate` applies the file in one transaction, so no reader ever sees a state between a drop and its replacement.

## Why this is one PR, not two

CLAUDE.md rule 10 splits a column or index drop across two PRs because the deploy still serving when `migrate.yml` runs must not lose anything it reads. Nothing here is lost to it. Every column it declares survives. The columns it does not declare are nullable (`deleted_at`, `deleted_by`) or defaulted (`id`), so its inserts still succeed. It writes no tombstones, so to it every index constrains exactly what it did before. Nothing in `src/` names any of the three constraints: no error map reads them and no `ON CONFLICT` targets them. And the table is empty on both deploy targets, since no service writes a layer until Wave 13, and the demo seed, the only other writer, never runs there.

## What is lost

Nothing. No row exists on either deploy target, and no guarantee lapses between a drop and its replacement.
