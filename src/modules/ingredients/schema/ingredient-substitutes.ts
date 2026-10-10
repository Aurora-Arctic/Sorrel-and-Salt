import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { ingredients } from './ingredients';
import { idColumn } from '../../../db/schema-parts';

// What an ingredient may be replaced with, one row per entry (MB.138): a link
// to another ingredient, or a name typed for one that is not entered — the
// shape MB.40 gave a spell's layers. A child table rather than
// `ingredients.substitutes text[]`, which a link cannot live in; MB.139 fills
// it from that list, MB.140 switches to it and MB.141 drops the list. Full
// `auditColumns`, as folk names: a substitute is content, not a pairing of two
// curated rows (DESIGN.md §5, `ingredient_substitutes`).
export const ingredientSubstitutes = pgTable(
  'ingredient_substitutes',
  {
    id: idColumn(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // Nullable: a typed name links nothing. The CHECKs below keep a row from
    // being both or neither, and from naming its own ingredient.
    substituteId: uuid('substitute_id').references(() => ingredients.id),
    name: text('name'),
    ...auditColumns,
  },
  (table) => [
    // The read by parent (MB.140), which takes links and names alike and so
    // implies neither unique index's predicate. Nothing reads back from a
    // linked ingredient to its linkers, so no index leads on `substitute_id`
    // (MB.138, "The deletion rule").
    index('ingredient_substitutes_ingredient_id')
      .on(table.ingredientId)
      .where(sql`${table.deletedAt} is null`),
    // One live link and one live name per ingredient, case folded — the shapes
    // `spell_ingredients` gives its links and custom names. Partial per rule 4.
    uniqueIndex('ingredient_substitutes_link_unique')
      .on(table.ingredientId, table.substituteId)
      .where(sql`${table.substituteId} is not null and ${table.deletedAt} is null`),
    uniqueIndex('ingredient_substitutes_name_unique')
      .on(table.ingredientId, sql`lower(${table.name})`)
      .where(sql`${table.name} is not null and ${table.deletedAt} is null`),

    check('ingredient_substitutes_link_or_name', sql`num_nonnulls(substitute_id, name) = 1`),
    // A blank name would satisfy `num_nonnulls` and name nothing.
    check('ingredient_substitutes_name_not_blank', sql`name is null or btrim(name) <> ''`),
    check('ingredient_substitutes_not_itself', sql`substitute_id <> ingredient_id`),
  ],
);
