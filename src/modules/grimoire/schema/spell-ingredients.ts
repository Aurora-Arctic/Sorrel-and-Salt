import { sql } from 'drizzle-orm';
import { check, integer, numeric, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { ingredients } from '../../ingredients/schema/ingredients';
import { inventoryUnit } from '../../ingredients/schema/inventory-items';
import { spells } from './spells';

// What is in the jar and in what order (stories 50, 57): a layer is either an
// ingredient the workspace knows or a name written for this one jar.
//
// It references the ingredient, never the inventory item: stock is what a
// workspace holds today, and a recipe pointing at it would be damaged by
// running out. Soft-deleted, unlike the other two join tables (MB.110): a
// spell is a record of a working, so a layer taken out of it is a tombstone
// (claude-docs/db.md, "The grimoire").
export const spellIngredients = pgTable(
  'spell_ingredients',
  {
    // A surrogate key, because the layer cannot be one: a removed layer's
    // tombstone would go on holding its depth.
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
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
    // Stored, never inferred from insertion order; `notNull`, since distinct
    // NULLs would collide with nothing in the layer index below.
    layerOrder: integer('layer_order').notNull(),
    // A short line on this ingredient's role in the jar — unrelated to the
    // deferred notes subsystem (§13).
    note: text('note'),
    ...auditColumns,
  },
  (table) => [
    // One live layer per depth; leading on `spell_id` makes it the index that
    // reads a jar in order. Checked per row, not at end of statement, so a
    // reorder moves the live rows through a scratch offset rather than
    // sweeping `layer_order + 1`.
    uniqueIndex('spell_ingredients_spell_id_layer_order_unique')
      .on(table.spellId, table.layerOrder)
      .where(sql`${table.deletedAt} is null`),

    // One ingredient per jar: wanted at two depths is one row with a note.
    // A custom row's null `ingredient_id` is nothing to be unique about.
    uniqueIndex('spell_ingredients_spell_id_ingredient_id_unique')
      .on(table.spellId, table.ingredientId)
      .where(sql`${table.ingredientId} is not null and ${table.deletedAt} is null`),
    // Its mirror over the custom rows, on name alone: a custom row is matched
    // against nothing, so `form` is part of no key.
    uniqueIndex('spell_ingredients_spell_id_custom_name_unique')
      .on(table.spellId, sql`lower(${table.name})`)
      .where(sql`${table.ingredientId} is null and ${table.deletedAt} is null`),

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
