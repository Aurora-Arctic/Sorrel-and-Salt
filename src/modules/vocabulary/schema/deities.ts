import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';

// Traditions: global, admin-curated, `ingredient_form_groups` in shape — a
// people or a religion, never a region (claude-docs/db/deity-vocabulary.md,
// "The deity vocabulary"). No colour, since a tradition labels a suggestion
// rather than a chip; no order column, traditions list alphabetically; no
// trigram index, since the autofill returns a tradition's name and never
// searches it.
export const deityTraditions = pgTable(
  'deity_traditions',
  { ...vocabularyColumns(), ...auditColumns },
  (table) => vocabularyIndexes('deity_traditions', table, { trigram: false }),
);

// The vocabulary behind an ingredient's deities, and deliberately not a foreign
// key target for their text (ingredient-deities-schema.test.ts asserts so): `traditionId`
// can be a key because only an admin writes it, as `ingredient_forms.group_id`
// is, while a member must be able to write a god before anyone curates one. A
// pick is keyed beside its name, as `ingredient_deities.deity_id` (MB.165).
// The slug is unique globally rather than per tradition, and the display name
// is deliberately unindexed: one god honoured under two traditions is two
// rows, and the autofill tells them apart by tradition. The description is
// search surface: it carries the other spellings a reader types (_Hekate_,
// _Freyja_).
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
