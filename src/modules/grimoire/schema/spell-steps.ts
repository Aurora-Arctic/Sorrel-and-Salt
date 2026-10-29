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

// A spell's recipe, one ordered list: a step is an
// instruction, an ingredient laid in the jar, or both. A step that lays an
// ingredient is a layer: either an ingredient the workspace knows or a name
// written for this one jar. One table rather than a steps table beside an
// ingredients one, because one ordered list cannot span two tables
// (claude-docs/design-decisions/m13.1-spell-steps.md).
//
// It references the ingredient, never the inventory item: stock is what a
// workspace holds today, and a recipe pointing at it would be damaged by
// running out. Soft-deleted, unlike the other two join tables: a
// spell is a record of a working, so a step taken out of it is a tombstone
// (claude-docs/db/grimoire.md, "The grimoire").
export const spellSteps = pgTable(
  'spell_steps',
  {
    // A surrogate key, because the position cannot be one: a removed step's
    // tombstone would go on holding its place.
    id: idColumn(),
    spellId: uuid('spell_id')
      .notNull()
      .references(() => spells.id),
    // Nullable: a custom row and an instruction-only step have no ingredient.
    // The CHECKs below allow at most one of this and `name`.
    ingredientId: uuid('ingredient_id').references(() => ingredients.id),
    // The form laid, set exactly when `ingredient_id` is: a jar may
    // hold Rosemary herb and Rosemary oil, a custom layer neither.
    variantId: uuid('variant_id'),
    // The custom row's label and form. Never becomes an `ingredients` row and
    // contributes nothing to derived categories; `form` is meaningful only
    // beside a name, which a CHECK below enforces.
    name: text('name'),
    form: text('form'),
    // A stock amount's shape, matching `inventory_items.quantityOnHand` so the
    // converter reads both sides. Nullable, with `unit`: "a pinch" names no
    // measurement, and zero is a quantity where absence is not.
    quantity: numeric('quantity', { precision: QUANTITY_PRECISION, scale: QUANTITY_SCALE }),
    // The same enum a jar is measured in, so the converter can go between them.
    // No `unitDimension` here: nothing groups a spell's layers by dimension.
    unit: inventoryUnit('unit'),
    // The step's place in the recipe. Stored, never inferred from insertion
    // order.
    position: integer('position').notNull(),
    // The instruction: what to do at this step, in the member's words.
    body: text('body'),
    ...auditColumns,
  },
  (table) => [
    // One live step per place; leading on `spell_id` makes it the index that
    // reads a recipe in order. Checked per row, not at end of statement, so a
    // reorder moves the live rows through a scratch offset rather than
    // sweeping `position + 1`.
    liveUnique('spell_steps_spell_id_position_unique', table, table.spellId, table.position),

    // No unique index on a jar's forms: a spell may lay one form in several
    // steps, at different depths or for different purposes. A custom row is still
    // identified by its name, below.
    // Its mirror over the custom rows, on name alone: a custom row is matched
    // against nothing, so `form` is part of no key.
    uniqueIndex('spell_steps_spell_id_custom_name_unique')
      .on(table.spellId, sql`lower(${table.name})`)
      .where(sql`${table.ingredientId} is null and ${table.deletedAt} is null`),

    // At most one identity, and never an empty step: an instruction, an
    // ingredient, or both. Enforced in Zod too, so a CHECK is never what a user
    // sees.
    check('spell_steps_one_identity', sql`num_nonnulls(ingredient_id, name) <= 1`),
    check('spell_steps_not_empty', sql`num_nonnulls(ingredient_id, name, body) >= 1`),
    // An amount describes an ingredient's place in the jar, so an
    // instruction-only step carries none.
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
