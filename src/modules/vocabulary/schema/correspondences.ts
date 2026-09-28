import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';

// The vocabularies behind `ingredients.planet` and `ingredients.zodiac`, and
// deliberately not foreign key targets for them (correspondences-schema.test.ts
// asserts so): a member must be able to write `Eris` before anyone curates it.
// Two tables rather than one with a `kind`, so a suggestion query has no
// predicate to forget; one tier, no colour, no order column
// (claude-docs/db.md, "The correspondence vocabularies").
export const planets = pgTable(
  'planets',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4, and on the slug alone, never the display name.
    uniqueIndex('planets_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    // Required *and non-empty*: NOT NULL alone accepts '', and the description
    // is search surface (Lilith's carries "Black Moon").
    check('planets_description_not_blank', sql`btrim(description) <> ''`),
    // The suggestion query matches name and description alike. Match with `%`
    // under a per-transaction `pg_trgm.similarity_threshold`, as on
    // `ingredients_trgm` (claude-docs/db.md, "Fuzzy matching").
    index('planets_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.description} gin_trgm_ops`,
    ),
  ],
);

export const zodiacSigns = pgTable(
  'zodiac_signs',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('zodiac_signs_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    check('zodiac_signs_description_not_blank', sql`btrim(description) <> ''`),
    index('zodiac_signs_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.description} gin_trgm_ops`,
    ),
  ],
);
