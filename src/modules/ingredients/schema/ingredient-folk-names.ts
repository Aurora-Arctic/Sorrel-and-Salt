import { sql } from 'drizzle-orm';
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { ingredients } from './ingredients';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// The regional and common names an ingredient also answers to (story 21).
// A child table rather than `folkNames text[]`: `array_to_string` is STABLE on
// Postgres 18, so it is legal in neither an expression index nor a generated
// column, where `text` rows take a trigram index trivially. Full
// `auditColumns`, unlike the join tables — a folk name is content, not a link.
export const ingredientFolkNames = pgTable(
  'ingredient_folk_names',
  {
    id: idColumn(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    name: text('name').notNull(),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4, an index because no constraint takes a
    // WHERE or `lower(name)`. Per ingredient and deliberately not global:
    // several plants claiming "Cat's Claw" is what is being documented.
    liveUnique(
      'ingredient_folk_names_unique',
      table,
      table.ingredientId,
      sql`lower(${table.name})`,
    ),
    // Not partial: a trigram index reserves nothing. The threshold rule that
    // makes `%` reach it is ingredients.ts's (claude-docs/db/fuzzy-matching.md, "Fuzzy matching").
    index('ingredient_folk_names_trgm').using('gin', sql`${table.name} gin_trgm_ops`),
    // Folded through `unaccent_immutable` for the compendium search, beside
    // the raw one as ingredients.ts's is (migration 0026).
    index('ingredient_folk_names_unaccent_trgm').using(
      'gin',
      sql`unaccent_immutable(${table.name}) gin_trgm_ops`,
    ),
  ],
);
