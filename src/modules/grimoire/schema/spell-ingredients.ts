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

// What is in the jar and in what order (stories 50, 57): a layer is either an
// ingredient the workspace knows or a name written for this one jar.
//
// It references the ingredient, never the inventory item: stock is what a
// workspace holds today, and a recipe pointing at it would be damaged by
// running out. Hard-deleted (MB.34) — `auditStampColumns`, no `deleted_at`,
// no rule-4 partial index; the two partial indexes below split the custom
// rows from the ingredient rows (claude-docs/db.md, "The grimoire").
export const spellIngredients = pgTable(
  'spell_ingredients',
  {
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    // Nullable: a custom row has no ingredient. The CHECK below keeps a row
    // from leaving both this and `name` empty.
    ingredientId: uuid('ingredient_id').references(() => ingredients.id),
    // The custom row's label and form. Never becomes an `ingredients` row and
    // contributes nothing to derived categories; `form` is meaningful only
    // beside a name, which a CHECK below enforces.
    name: text('name'),
    form: text('form'),
    // `numeric(12, 3)`, matching `inventory_items.quantityOnHand` so the
    // converter reads both sides. Nullable, with `unit`: "a pinch" names no
    // measurement, and zero is a quantity where absence is not.
    quantity: numeric('quantity', { precision: 12, scale: 3 }),
    // The same enum a jar is measured in, so the converter can go between them.
    // No `unitDimension` here: nothing groups a spell's layers by dimension.
    unit: inventoryUnit('unit'),
    // Stored, never inferred from insertion order; `notNull` and half the
    // primary key, since distinct NULLs would collide with nothing.
    layerOrder: integer('layer_order').notNull(),
    // A short line on this ingredient's role in the jar — unrelated to the
    // deferred notes subsystem (§13).
    note: text('note'),
    ...auditStampColumns,
  },
  (table) => [
    // A row's identity is the layer it sits at; leading on `spell_id` makes the
    // index the one that reads a jar in order. Checked per row, not at end of
    // statement, so a reorder rewrites the jar's rows rather than sweeping
    // `layer_order + 1` — see above.
    primaryKey({ columns: [table.spellId, table.layerOrder] }),

    // One ingredient per jar: wanted at two depths is one row with a note.
    // Partial, since a custom row's null `ingredient_id` is nothing to be unique about.
    uniqueIndex('spell_ingredients_spell_id_ingredient_id_unique')
      .on(table.spellId, table.ingredientId)
      .where(sql`${table.ingredientId} is not null`),
    // Its mirror over the custom rows, on name alone: a custom row is matched
    // against nothing, so `form` is part of no key.
    uniqueIndex('spell_ingredients_spell_id_custom_name_unique')
      .on(table.spellId, sql`lower(${table.name})`)
      .where(sql`${table.ingredientId} is null`),

    // Exactly one of the two. Enforced in Zod too, so the CHECK is never what a
    // user sees.
    check('spell_ingredients_ingredient_or_name', sql`num_nonnulls(ingredient_id, name) = 1`),
    // Beside an ingredient id, `form` would shadow half that ingredient's identity.
    check('spell_ingredients_form_only_on_custom', sql`ingredient_id is null or form is null`),
    // A blank name would satisfy `num_nonnulls` and name nothing.
    check('spell_ingredients_name_not_blank', sql`name is null or btrim(name) <> ''`),
    check('spell_ingredients_form_not_blank', sql`form is null or btrim(form) <> ''`),
  ],
);
