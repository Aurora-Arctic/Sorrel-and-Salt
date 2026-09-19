import { sql } from 'drizzle-orm';
import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { ingredients } from './ingredients';

// DESIGN.md §5: `id`, `ingredientId`, `name`, + audit. The regional and common
// names an ingredient also answers to — story 21's "Devil's Shoestring", found
// without recalling it is honeysuckle root.
//
// A child table rather than the `folkNames text[]` column it replaces, and for a
// verified reason rather than a stylistic one: `array_to_string` is STABLE on
// this repo's Postgres 18 (`pg_proc.provolatile = 's'`), so it is legal in
// neither an expression index nor a generated column. Indexing a flattened array
// would have needed a hand-written IMMUTABLE wrapper whose honesty depends on the
// column never changing type; as `text` rows the trigram index below is trivial.
// Folk names were unindexed under the array design, which §9's common-name
// matching could not have used at all.
//
// GraphQL keeps exposing them flattened as `folkNames: [String!]!` (§7), so this
// changes nothing a client sees — that is M8.5's resolver, not this task's.
//
// No locale or region column. Deliberate: §5 records no regional requirement and
// nothing renders one, and CLAUDE.md forbids a hook for what the design doc does
// not name.
//
// The full `...auditColumns`, unlike MB.34's three join tables: a folk name is
// content, not a link. "Uña de Gato" is a thing someone wrote down, so removing
// one leaves a tombstone — and the tombstone is what makes the partial index
// below necessary rather than decorative.
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
    // Partial per CLAUDE.md rule 4: without `deleted_at is null` a folk name
    // removed by mistake would reserve its spelling on that ingredient forever,
    // and no call site could get it back. An index rather than a unique
    // constraint out of necessity — a constraint carries no WHERE predicate, and
    // none can be written over `lower(name)` either.
    //
    // `ingredient_id` leads, which is the whole design decision: uniqueness is
    // per ingredient and **deliberately not global**, because several unrelated
    // plants claiming "Cat's Claw" — Uncaria tomentosa, Acacia greggii, and a
    // literal claw — is precisely the thing being documented. `lower(name)`
    // folds "Cat's Claw" onto "cat's claw" within one ingredient's own list,
    // where a second spelling of one name is a mistake rather than a
    // distinction. `catsclaw` is left to the autofill, exactly as §5 leaves
    // `rootbark` to it.
    uniqueIndex('ingredient_folk_names_unique')
      .on(table.ingredientId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} is null`),
    // §9's common-name matching, given something to use. Not partial, unlike the
    // index above: a trigram index answers "what is this called" rather than
    // reserving anything, and the `%` operator's planner choice is not worth
    // complicating over rows a finder already filters out (M4.6 owns the
    // threshold rule that makes the operator use it). pg_trgm itself is enabled
    // by migration 0000.
    index('ingredient_folk_names_trgm').using('gin', sql`${table.name} gin_trgm_ops`),
  ],
);
