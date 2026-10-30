import { integer, pgTable } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';

// The vocabularies behind `ingredients.celestialBodies` and `ingredients.zodiacSigns`, deliberately not foreign key targets for them, so a member can write
// `Eris` before anyone curates it. Two tables, one tier, a nullable `position` for facet order (claude-docs/design-decisions/m12.52-facet-sort-order.md;
// claude-docs/db/categories.md, "Vocabulary schema details"). The description is search surface.
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
