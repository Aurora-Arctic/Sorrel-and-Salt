import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';

// The vocabularies behind `ingredients.planets` and `ingredients.zodiacSigns`, and
// deliberately not foreign key targets for them (astrology-schema.test.ts
// asserts so): a member must be able to write `Eris` before anyone curates it.
// Two tables rather than one with a `kind`, so a suggestion query has no
// predicate to forget; one tier, no colour, no order column
// (claude-docs/db/astrology-vocabularies.md, "The astrology vocabularies").
export const planets = pgTable(
  'planets',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    // The identity the reference seed gave the row, null on any other; never
    // changed after, so a reseed knows a row an admin has since edited (MB.171).
    seedKey: text('seed_key'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('planets_seed_key_unique')
      .on(table.seedKey)
      .where(sql`${table.seedKey} is not null and ${table.deletedAt} is null`),
    // Partial per CLAUDE.md rule 4, and on the slug alone, never the display name.
    uniqueIndex('planets_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    // Required *and non-empty*: NOT NULL alone accepts '', and the description
    // is search surface (Lilith's carries "Black Moon").
    check('planets_description_not_blank', sql`btrim(description) <> ''`),
    // The suggestion query matches name and description alike, by `%` and
    // `<%` under per-transaction thresholds — never a `similarity()`
    // comparison (claude-docs/db/member-autofill.md, "The member's autofill").
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
    // The identity the reference seed gave the row, null on any other; never
    // changed after, so a reseed knows a row an admin has since edited (MB.171).
    seedKey: text('seed_key'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('zodiac_signs_seed_key_unique')
      .on(table.seedKey)
      .where(sql`${table.seedKey} is not null and ${table.deletedAt} is null`),
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
