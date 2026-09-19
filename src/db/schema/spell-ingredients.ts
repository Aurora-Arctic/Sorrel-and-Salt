import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../audit';
import { ingredients } from './ingredients';
import { inventoryUnit } from './inventory-items';
import { spells } from './spells';

// DESIGN.md §5, story 50 — what is actually in the jar, and in what order it
// went in — and story 57 since MB.40: a layer is either an ingredient the
// workspace knows or a name written for this one jar.
//
// **It references the ingredient, never the inventory item**, and that is an
// acceptance criterion rather than a detail: stock is what a workspace happens
// to hold today, and a recipe pointing at it would be damaged by running out.
// M10.21 tests exactly that. The reverse direction is stated at
// `inventory_items` too, so a reader arriving from either table meets it.
//
// The second of MB.34's three hard-deleted join tables —
// `...auditStampColumns`, no `deleted_at`, and so no rule-4 partial index.
// MB.40 does not reopen that: a custom row carries content, but content
// addressable only through its spell (claude-docs/db.md, "Hard delete on the
// three join tables"). The two partial indexes below are about MB.40's
// custom-row split, not soft delete.
export const spellIngredients = pgTable(
  'spell_ingredients',
  {
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    // Nullable since MB.40: a custom row has no ingredient to point at. The
    // CHECK below is what keeps a row from leaving both this and `name` empty,
    // so nullability here costs nothing in integrity — DESIGN.md §14's
    // "nullable FKs plus num_nonnulls" idiom.
    ingredientId: uuid('ingredient_id').references(() => ingredients.id),
    // The custom row's label and form (MB.40, story 57). A name written for
    // this jar only: it never becomes an `ingredients` row, never appears on
    // the workspace's ingredients page, never enters local-beats-compendium
    // suppression, and contributes nothing to derived categories. `form` is
    // free text for the same reason `ingredients.form` is, and is meaningful
    // only on a custom row — beside an ingredient id it would be a second copy
    // of half that ingredient's identity, which a CHECK below refuses.
    name: text('name'),
    form: text('form'),
    // `numeric(12, 3)`, matching `inventory_items.quantityOnHand` exactly:
    // M9.5's converter reads both sides of "do I have enough for this spell".
    //
    // Nullable, with `unit`, because a layer may name no measurement at all —
    // "a pinch of salt" — and a draft is saved before it is finished. Zero is a
    // quantity; absence is not.
    quantity: numeric('quantity', { precision: 12, scale: 3 }),
    // M9.2's enum, not a second copy: a tablespoon in a spell is the tablespoon
    // a jar is measured in, and M9.5 converts between them. The type keeps its
    // `inventory_unit` name — renaming it would be a `RENAME` under rule 10 for
    // no gain.
    //
    // No `unitDimension` column and so no dimension CHECK: §5 names neither,
    // the dimension is derivable through `src/lib/units.ts`, and the query that
    // groups stock by dimension has no counterpart here.
    unit: inventoryUnit('unit'),
    // Story 51: layering sequence is part of the recipe, so it is stored rather
    // than inferred from insertion order, which no query may rely on. `notNull`
    // and half the primary key: distinct NULLs collide with nothing, so a
    // nullable column would put an unordered row outside the key meant to
    // constrain it. Every layer in a jar is somewhere in the stack.
    layerOrder: integer('layer_order').notNull(),
    // A short line on this ingredient's role in the jar. Unrelated to the
    // deferred notes subsystem (§13) — §5 says so explicitly, because the word
    // is otherwise taken.
    note: text('note'),
    ...auditStampColumns,
  },
  (table) => [
    // The identity of a row is the layer it sits at — not a surrogate id, and
    // no longer the `(spell_id, ingredient_id)` pair M10.2 keyed on, since a
    // custom row has none. Leading on `spell_id` scopes the key to the jar and
    // makes its index the one that answers "read this spell's layers in order".
    //
    // The key is checked per row rather than at end of statement, so M10.16's
    // reorder cannot be a single `layer_order + 1` sweep — it rewrites the
    // jar's rows, which a hard-deleted table makes an ordinary
    // delete-and-insert. Asserted in the schema test.
    primaryKey({ columns: [table.spellId, table.layerOrder] }),

    // What the old primary key used to guarantee: one ingredient per jar. An
    // ingredient wanted at two depths is one row with a note, not two rows
    // competing to describe the same ingredient. Partial, because a custom
    // row's null `ingredient_id` is not an ingredient to be unique about.
    uniqueIndex('spell_ingredients_spell_id_ingredient_id_unique')
      .on(table.spellId, table.ingredientId)
      .where(sql`${table.ingredientId} is not null`),
    // Its mirror over the custom rows: inside one jar an ambiguous label is a
    // mistake, not a distinction. Name only, not name plus form — a custom row
    // is never matched against anything, so `form` is part of no identity key.
    uniqueIndex('spell_ingredients_spell_id_custom_name_unique')
      .on(table.spellId, sql`lower(${table.name})`)
      .where(sql`${table.ingredientId} is null`),

    // Exactly one of the two: a layer names an ingredient or a custom name,
    // never both and never neither. Enforced in Zod as well (MB.8), so the
    // CHECK is never what a user sees.
    check('spell_ingredients_ingredient_or_name', sql`num_nonnulls(ingredient_id, name) = 1`),
    // `form` describes the custom name beside it. Beside an ingredient id it
    // would shadow `ingredients.form` — half of that ingredient's identity —
    // and the two would drift.
    check('spell_ingredients_form_only_on_custom', sql`ingredient_id is null or form is null`),
    // A blank name would satisfy `num_nonnulls` and name nothing; the
    // `ingredients_form_not_blank` idiom, on both text columns.
    check('spell_ingredients_name_not_blank', sql`name is null or btrim(name) <> ''`),
    check('spell_ingredients_form_not_blank', sql`form is null or btrim(form) <> ''`),
  ],
);
