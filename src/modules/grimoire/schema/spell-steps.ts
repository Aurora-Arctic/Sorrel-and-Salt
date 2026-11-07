import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { ingredients } from '../../ingredients/schema/ingredients';
import { ingredientVariants } from '../../ingredients/schema/ingredient-variants';
import { inventoryUnit } from '../../ingredients/schema/inventory-items';
import { QUANTITY_PRECISION, QUANTITY_SCALE } from '../../ingredients/schema/quantities';
import { spells } from './spells';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// A spell's recipe, one ordered list: a step is an instruction, an ingredient laid in the jar, or both. It references the
// ingredient, never the inventory item, and is soft-deleted as a tombstone (claude-docs/db/grimoire.md, "Grimoire service and schema details").
export const spellSteps = pgTable(
  'spell_steps',
  {
    // A surrogate key: a removed step's tombstone would go on holding the position.
    id: idColumn(),
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    // The CHECKs below allow at most one of this and `name`.
    ingredientId: uuid('ingredient_id').references(() => ingredients.id),
    // Set exactly when `ingredient_id` is.
    variantId: uuid('variant_id'),
    // Never becomes an `ingredients` row and contributes nothing to derived categories; `form` is meaningful only beside a name (CHECK below).
    name: text('name'),
    form: text('form'),
    // Nullable, with `unit`: "a pinch" names no measurement, and zero is a quantity where absence is not.
    quantity: numeric('quantity', { precision: QUANTITY_PRECISION, scale: QUANTITY_SCALE }),
    // No `unitDimension` here: nothing groups a spell's layers by dimension.
    unit: inventoryUnit('unit'),
    // Stored, never inferred from insertion order.
    position: integer('position').notNull(),
    body: text('body'),
    ...auditColumns,
  },
  (table) => [
    // One live step per place; leading on `spell_id` makes it the index that reads a recipe in order. Checked per row, so a
    // reorder moves the live rows through a scratch offset rather than sweeping `position + 1`.
    liveUnique('spell_steps_spell_id_position_unique', table, table.spellId, table.position),

    // No unique index on a jar's forms: a spell may lay one form in several steps.
    // Its mirror over the custom rows, on name alone, so `form` is part of no key.
    uniqueIndex('spell_steps_spell_id_custom_name_unique')
      .on(table.spellId, sql`lower(${table.name})`)
      .where(sql`${table.ingredientId} is null and ${table.deletedAt} is null`),

    // At most one identity, and never an empty step. Enforced in Zod too, so a CHECK is never what a user sees.
    check('spell_steps_one_identity', sql`num_nonnulls(ingredient_id, name) <= 1`),
    check('spell_steps_not_empty', sql`num_nonnulls(ingredient_id, name, body) >= 1`),
    check(
      'spell_steps_amount_on_ingredient',
      sql`(ingredient_id is not null or name is not null) or (quantity is null and unit is null)`,
    ),
    // Beside an ingredient id, `form` would shadow half that ingredient's identity.
    check('spell_steps_form_only_on_custom', sql`ingredient_id is null or form is null`),
    // A linked layer names its form, a custom one none. Needed beside the key
    // below, which MATCH SIMPLE skips whenever either column is null.
    check(
      'spell_steps_variant_with_ingredient',
      sql`(ingredient_id is null) = (variant_id is null)`,
    ),
    foreignKey({
      name: 'spell_steps_variant_fk',
      columns: [table.variantId, table.ingredientId],
      foreignColumns: [ingredientVariants.id, ingredientVariants.ingredientId],
    }),
    // A blank name or body would satisfy `num_nonnulls` and say nothing.
    check('spell_steps_name_not_blank', sql`name is null or btrim(name) <> ''`),
    check('spell_steps_form_not_blank', sql`form is null or btrim(form) <> ''`),
    check('spell_steps_body_not_blank', sql`body is null or btrim(body) <> ''`),
  ],
);
