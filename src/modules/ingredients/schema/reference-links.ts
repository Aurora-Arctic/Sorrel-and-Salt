import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { deities, deityTraditions } from '../../vocabulary/schema/deities';
import { planets, zodiacSigns } from '../../vocabulary/schema/astrology';
import { ingredients } from './ingredients';
import { references } from './references';

// Which row a reference supports, one per citation (MB.151): a nullable key
// per sourced table under one `num_nonnulls` CHECK, MB.40's shape, rather
// than a join table per table — a new sourced table costs a column, its index
// and a widened CHECK, not a table, a trigger, a finder and a loader. Full
// `auditColumns`, as substitutes: a link is content, and unlinking leaves a
// tombstone (DESIGN.md §5, "References"; claude-docs/db/references.md).
export const referenceLinks = pgTable(
  'reference_links',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    referenceId: uuid('reference_id')
      .notNull()
      .references(() => references.id),
    ingredientId: uuid('ingredient_id').references(() => ingredients.id),
    deityId: uuid('deity_id').references(() => deities.id),
    deityTraditionId: uuid('deity_tradition_id').references(() => deityTraditions.id),
    planetId: uuid('planet_id').references(() => planets.id),
    zodiacSignId: uuid('zodiac_sign_id').references(() => zodiacSigns.id),
    // "p. 112", "s.v. Hecate": the link's, not the reference's, since the
    // citation names the work and the page shows the locator beside it.
    locator: text('locator'),
    ...auditColumns,
  },
  (table) => [
    // One live link per reference per row, partial per rule 4. Each leads on
    // its sourced id, so a read of one row's links implies its predicate and
    // uses it: no plain parent index is built beside them. None leads on
    // `reference_id`: nothing reads from a reference back to its links, and a
    // reference is never hard-deleted.
    uniqueIndex('reference_links_ingredient_unique')
      .on(table.ingredientId, table.referenceId)
      .where(sql`${table.ingredientId} is not null and ${table.deletedAt} is null`),
    uniqueIndex('reference_links_deity_unique')
      .on(table.deityId, table.referenceId)
      .where(sql`${table.deityId} is not null and ${table.deletedAt} is null`),
    uniqueIndex('reference_links_deity_tradition_unique')
      .on(table.deityTraditionId, table.referenceId)
      .where(sql`${table.deityTraditionId} is not null and ${table.deletedAt} is null`),
    uniqueIndex('reference_links_planet_unique')
      .on(table.planetId, table.referenceId)
      .where(sql`${table.planetId} is not null and ${table.deletedAt} is null`),
    uniqueIndex('reference_links_zodiac_sign_unique')
      .on(table.zodiacSignId, table.referenceId)
      .where(sql`${table.zodiacSignId} is not null and ${table.deletedAt} is null`),

    // A new sourced column widens this, a DROP CONSTRAINT under an `.ack.md`.
    check(
      'reference_links_one_row',
      sql`num_nonnulls(ingredient_id, deity_id, deity_tradition_id, planet_id, zodiac_sign_id) = 1`,
    ),
    check('reference_links_locator_not_blank', sql`locator is null or btrim(locator) <> ''`),
  ],
);
