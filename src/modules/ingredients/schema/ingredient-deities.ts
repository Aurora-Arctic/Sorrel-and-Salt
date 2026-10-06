import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { deities } from '../../vocabulary/schema/deities';
import { ingredients } from './ingredients';

// The deities an ingredient names, one row per entry in the order entered
// (MB.165): a name, and beside it a link to the curated deity the member
// picked, so Greek and Roman Hecate stay told apart after a save. A child
// table rather than `ingredients.deities text[]`, which a link cannot live in;
// MB.166 fills it from that list, MB.167 switches to it and MB.168 drops the
// list. Full `auditColumns`, as substitutes: an entry is content, not a pairing
// of two curated rows (DESIGN.md §5, `ingredient_deities`).
export const ingredientDeities = pgTable(
  'ingredient_deities',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // Nullable: typed text links nothing, and is never resolved into a link.
    deityId: uuid('deity_id').references(() => deities.id),
    // Held on a linked row as well, so a link whose deity is soft-deleted
    // still reads as its name, with no finder reaching the deleted row.
    name: text('name').notNull(),
    // Stored, never inferred from insertion order: the list keeps the order
    // entered, as planets, signs and colours do (MB.165, "The order rule").
    position: integer('position').notNull(),
    ...auditColumns,
  },
  (table) => [
    // One live entry per place, and the parent's index: leading on
    // `ingredient_id`, it reads the list in order, so no plain parent index
    // is built beside it. Checked per row, so a reorder moves the live rows
    // through a scratch offset, as a jar's layers do.
    uniqueIndex('ingredient_deities_position_unique')
      .on(table.ingredientId, table.position)
      .where(sql`${table.deletedAt} is null`),
    // One live link per deity, and one live unlinked name, case folded. Links
    // to two same-named deities are two deities, so the name index covers
    // unlinked rows only. Partial per rule 4.
    uniqueIndex('ingredient_deities_link_unique')
      .on(table.ingredientId, table.deityId)
      .where(sql`${table.deityId} is not null and ${table.deletedAt} is null`),
    uniqueIndex('ingredient_deities_name_unique')
      .on(table.ingredientId, sql`lower(${table.name})`)
      .where(sql`${table.deityId} is null and ${table.deletedAt} is null`),

    // Required *and non-empty*: NOT NULL alone accepts ''.
    check('ingredient_deities_name_not_blank', sql`btrim(name) <> ''`),
  ],
);
