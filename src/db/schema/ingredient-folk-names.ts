import { sql } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { ingredients } from './ingredients';

// DESIGN.md §5, story 21 — the regional and common names an ingredient also
// answers to, found without recalling that "Devil's Shoestring" is honeysuckle
// root.
//
// A child table rather than the `folkNames text[]` it replaces, for a verified
// reason: `array_to_string` is STABLE on Postgres 18
// (`pg_proc.provolatile = 's'`), so it is legal in neither an expression index
// nor a generated column. Indexing a flattened array would have needed a
// hand-written IMMUTABLE wrapper; as `text` rows the trigram index below is
// trivial. GraphQL still exposes them flattened as `folkNames: [String!]!`
// (§7), so nothing a client sees changes.
//
// No locale or region column: §5 records no regional requirement and nothing
// renders one. The full `...auditColumns`, unlike MB.34's three join tables —
// a folk name is content, not a link, so removing one leaves a tombstone, and
// the tombstone is what makes the partial index below necessary.
export const ingredientFolkNames = pgTable(
  'ingredient_folk_names',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    name: text('name').notNull(),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4: a folk name removed by mistake would
    // otherwise reserve its spelling on that ingredient forever. An index
    // rather than a unique constraint out of necessity — a constraint carries
    // no WHERE predicate, and none can be written over `lower(name)` either.
    //
    // `ingredient_id` leads, which is the decision: uniqueness is per
    // ingredient and **deliberately not global**, because several unrelated
    // plants claiming "Cat's Claw" is precisely what is being documented.
    // `lower(name)` folds a second spelling within one ingredient's own list,
    // where it is a mistake rather than a distinction.
    uniqueIndex('ingredient_folk_names_unique')
      .on(table.ingredientId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} is null`),
    // §9's common-name matching, given something to use. Not partial, unlike
    // the index above: a trigram index reserves nothing, and M4.6 owns the
    // threshold rule that makes the `%` operator reach it. pg_trgm itself is
    // enabled by migration 0000.
    index('ingredient_folk_names_trgm').using('gin', sql`${table.name} gin_trgm_ops`),
  ],
);
