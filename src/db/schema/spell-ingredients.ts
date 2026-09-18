import {
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

// DESIGN.md §5: `spellId`, `ingredientId`, `quantity`, `unit`, `layerOrder`,
// `note`, + audit stamps, keyed on the pair. Story 50's table — what is
// actually in the jar, and in what order it went in.
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
// the row outright. No `deleted_at`, and so no partial unique index either —
// rule 4's convention exists to stop a tombstone reserving a name forever, and
// a composite primary key has no tombstone to dodge. The four stamps stay,
// because `created_by` still answers who put this ingredient in this jar.
//
// The table is inert at Wave 3. Nothing queries it until M10.5's service and
// M10.15's builder land in Wave 13 — CLAUDE.md's table-task-then-behaviour-task
// rule.
export const spellIngredients = pgTable(
  'spell_ingredients',
  {
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
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
    // `notNull` deliberately. The criterion is that layer order is "stored and
    // unique within a spell", and a nullable column would satisfy neither half
    // of that: distinct NULLs collide with nothing, so an unordered row would
    // sit outside the index that is supposed to constrain it. Every ingredient
    // in a jar is somewhere in the stack, including the only one.
    layerOrder: integer('layer_order').notNull(),
    // A short line on this ingredient's role in the jar. Unrelated to the
    // deferred notes subsystem (§13) — §5 says so explicitly, because the word
    // is otherwise taken.
    note: text('note'),
    ...auditStampColumns,
  },
  (table) => [
    // The identity of a layer is the pair, exactly as on `ingredient_categories`
    // and `workspace_members`: a surrogate id would let the same ingredient be
    // added to the same spell twice, and nothing downstream could tell the two
    // rows apart. An ingredient wanted at two depths is one row with a note,
    // not two rows competing to describe the same ingredient.
    primaryKey({ columns: [table.spellId, table.ingredientId] }),
    // "layerOrder is stored and unique within a spell" — the acceptance
    // criterion, in the one place that can enforce it. Leading on `spell_id`
    // both scopes the uniqueness to the jar and makes the index the one that
    // answers "read this spell's ingredients in order", which is every read of
    // this table in M10.9 and MB.6.
    //
    // Not partial: there is no `deleted_at` on this table to write a predicate
    // against (MB.34). Unique indexes are checked per row rather than at end of
    // statement, so M10.16's reorder cannot be a single `layer_order + 1` sweep
    // — it rewrites the jar's rows, which a hard-deleted table makes an ordinary
    // delete-and-insert. Asserted in the schema test so the constraint the
    // reorder has to work within is written down before the reorder is.
    uniqueIndex('spell_ingredients_spell_id_layer_order_unique').on(
      table.spellId,
      table.layerOrder,
    ),
  ],
);
