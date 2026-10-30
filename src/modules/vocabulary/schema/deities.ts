import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';

// Traditions: global, admin-curated, `ingredient_form_groups` in shape: a people or a religion, never a region (claude-docs/db/deity-vocabulary.md).
// No colour, no order column and no trigram index (claude-docs/db/categories.md, "Vocabulary schema details").
export const deityTraditions = pgTable(
  'deity_traditions',
  { ...vocabularyColumns(), ...auditColumns },
  (table) => vocabularyIndexes('deity_traditions', table, { trigram: false }),
);

// The vocabulary behind an ingredient's deities, deliberately not a foreign key target for their text; a pick is keyed beside its name as `ingredient_deities.deity_id`.
// The slug is unique globally and the display name unindexed, so the autofill tells same-named gods apart by tradition. The description and
// `deity_other_names` are search surface (claude-docs/db/categories.md, "Vocabulary schema details").
export const deities = pgTable(
  'deities',
  {
    ...vocabularyColumns(),
    traditionId: uuid('tradition_id')
      .notNull()
      .references(() => deityTraditions.id),
    ...auditColumns,
  },
  (table) => vocabularyIndexes('deities', table, { trigram: true }),
);
