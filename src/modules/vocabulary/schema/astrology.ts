import { integer, pgTable } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';

// The vocabularies behind `ingredients.celestialBodies` and `ingredients.zodiacSigns`, and
// deliberately not foreign key targets for them (ingredients-schema.test.ts
// holds the table's own keys to its workspace and form pick): a member must be able to write `Eris` before anyone curates it.
// Two tables rather than one with a `kind`, so a suggestion query has no
// predicate to forget; one tier, no colour, and a nullable `position`
// that sets where a facet lists a row: calendar order for signs,
// Sun outward for bodies, null for any a curator adds, which sort after by
// name (claude-docs/design-decisions/m12.52-facet-sort-order.md; claude-docs/db/astrology-vocabularies.md, "The astrology vocabularies").
// The description is search surface, which the trigram index serves: Lilith's
// carries "Black Moon".
export const celestialBodies = pgTable(
  'celestial_bodies',
  { ...vocabularyColumns(), position: integer('position'), ...auditColumns },
  (table) => vocabularyIndexes('celestial_bodies', table, { trigram: true }),
);

export const zodiacSigns = pgTable(
  'zodiac_signs',
  { ...vocabularyColumns(), position: integer('position'), ...auditColumns },
  (table) => vocabularyIndexes('zodiac_signs', table, { trigram: true }),
);
