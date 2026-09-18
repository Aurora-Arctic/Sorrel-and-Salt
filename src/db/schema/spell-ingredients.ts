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

// DESIGN.md §5: `spellId`, `ingredientId`, `name`, `form`, `quantity`, `unit`,
// `layerOrder`, `note`, + audit stamps, keyed on the layer. Story 50's table —
// what is actually in the jar, and in what order it went in — and story 57's,
// since MB.40: a layer is either an ingredient the workspace knows or a name
// written for this one jar.
//
// **It references the ingredient, never the inventory item**, and that is the
// acceptance criterion rather than an implementation detail: stock is what a
// workspace happens to hold today, and a recipe that pointed at it would be
// damaged by running out of something. M10.21 tests exactly that — soft-delete
// the stock row for mugwort and the spell still says two tablespoons of
// mugwort. The reverse direction is stated at `inventory_items` too, so a
// reader arriving from either table meets the argument.
//
// The second of MB.34's three join tables: `...auditStampColumns` rather than
// `...auditColumns`, because pulling an ingredient back out of a jar removes
// the row outright. No `deleted_at`, and so no rule-4 partial index either —
// that convention exists to stop a tombstone reserving a name forever, and a
// hard-deleted table has no tombstone to dodge. The four stamps stay, because
// `created_by` still answers who put this ingredient in this jar. MB.40 does
// not reopen this: a custom row carries content, but content addressable only
// through its spell — unlike a folk name, which stands on its own — and the
// deciding argument in MB.34 was the `deleted_at IS NULL` a service joining
// *through* this table would have to remember by hand, which is exactly how
// derived categories (M10.7) reach `ingredient_categories`.
//
// The table is inert at Wave 4. Nothing queries it until M10.5's service and
// M10.15's builder land in Wave 13 — CLAUDE.md's table-task-then-behaviour-task
// rule, and the reason MB.40 could reshape it as a contract migration against
// zero rows.
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
    // suppression, and contributes nothing to derived categories. Reusable
    // would be a different thing — a workspace-local `ingredients` row, which
    // story 29's one-field stub already is.
    //
    // `form` is free text and not a foreign key, for the same reason
    // `ingredients.form` is not (§14): a member must be able to write
    // `rhizome` before anyone has curated it. It is only meaningful on a
    // custom row — on a linked one it would be a second copy of half the
    // ingredient's identity — and a CHECK below says so.
    name: text('name'),
    form: text('form'),
    // `numeric(12, 3)`, matching `inventory_items.quantityOnHand` exactly:
    // M9.5's converter reads both sides of "do I have enough for this spell",
    // and a spell quantity that could not represent what a jar quantity can
    // would lose precision on the comparison rather than on the input.
    //
    // Nullable, with `unit`, because a layer may name no measurement at all —
    // "a pinch of salt", "a sprig of rosemary" — and a draft is saved before it
    // is finished. Zero is a quantity; absence is not, the same call §5 makes
    // on the stock table.
    quantity: numeric('quantity', { precision: 12, scale: 3 }),
    // M9.2's enum, not a second copy of it. One vocabulary means the Postgres
    // type is shared as well as the list: a tablespoon in a spell is the
    // tablespoon a jar is measured in, and M9.5 converts between them. The type
    // keeps its `inventory_unit` name — renaming it to suit a second consumer
    // would be a `RENAME` under rule 10 for no gain, and the name it has is the
    // one the shipped migration already carries.
    //
    // No `unitDimension` column and so no dimension CHECK: §5 names neither on
    // this table, the dimension is derivable from the unit through
    // `src/lib/units.ts`, and the query that groups stock by dimension has no
    // counterpart here.
    unit: inventoryUnit('unit'),
    // Story 51: layering sequence is part of the recipe, so it is stored rather
    // than inferred from insertion order, which no query may rely on.
    //
    // `notNull` deliberately, and since MB.40 half of the primary key. The
    // criterion is that layer order is "stored and unique within a spell", and
    // a nullable column would satisfy neither half of that: distinct NULLs
    // collide with nothing, so an unordered row would sit outside the key that
    // is supposed to constrain it. Every layer in a jar is somewhere in the
    // stack, including the only one.
    layerOrder: integer('layer_order').notNull(),
    // A short line on this ingredient's role in the jar. Unrelated to the
    // deferred notes subsystem (§13) — §5 says so explicitly, because the word
    // is otherwise taken.
    note: text('note'),
    ...auditStampColumns,
  },
  (table) => [
    // The identity of a row is the layer it sits at. Not a surrogate id, which
    // would say nothing about the jar; and no longer the `(spell_id,
    // ingredient_id)` pair M10.2 keyed on, because a custom row does not have
    // one. Leading on `spell_id` both scopes the key to the jar and makes its
    // index the one that answers "read this spell's ingredients in order",
    // which is every read of this table in M10.9 and MB.6.
    //
    // The key is checked per row rather than at end of statement, so M10.16's
    // reorder cannot be a single `layer_order + 1` sweep — it rewrites the
    // jar's rows, which a hard-deleted table makes an ordinary
    // delete-and-insert. Asserted in the schema test so the constraint the
    // reorder has to work within is written down before the reorder is.
    primaryKey({ columns: [table.spellId, table.layerOrder] }),

    // What the old primary key used to guarantee: one ingredient per jar. An
    // ingredient wanted at two depths is one row with a note, not two rows
    // competing to describe the same ingredient. Partial, because a custom
    // row's null `ingredient_id` is not an ingredient to be unique about.
    uniqueIndex('spell_ingredients_spell_id_ingredient_id_unique')
      .on(table.spellId, table.ingredientId)
      .where(sql`${table.ingredientId} is not null`),
    // Its mirror over the custom rows, in the shape of
    // `ingredients_workspace_label_unique`: inside one jar an ambiguous label
    // is a mistake, not a distinction, and `lower(name)` folds Salt onto salt.
    // Name only, not name plus form — a custom row is never matched against
    // anything, so there is no identity key for `form` to be part of; a jar
    // that wants valerian root and valerian leaf writes two names.
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
