import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';

// Form groups: global, admin-curated, `category_groups` minus the colour pair —
// a table rather than an enum so an admin can add one without DDL (MB.35). No
// colour because a group sections a dropdown rather than colouring a chip; no
// order column, groups list alphabetically.
export const ingredientFormGroups = pgTable(
  'ingredient_form_groups',
  { ...vocabularyColumns(), ...auditColumns },
  (table) => vocabularyIndexes('ingredient_form_groups', table, { trigram: false }),
);

// The vocabulary behind `ingredients.form`, and deliberately not a foreign key
// target for that text (ingredients-schema.test.ts asserts so): `groupId`
// can be a key because only an admin writes it, `ingredients.form` stays text
// because a member must write `rhizome` before anyone curates it. A pick is
// keyed beside the text, as `ingredients.form_id` (MB.165). The slug is unique
// globally rather than per group, and the display name is deliberately
// unindexed: two live forms may both be "Wax", and the autofill tells them
// apart by group (claude-docs/db/form-vocabulary-seed.md, "The form vocabulary
// seed"). The trigram index lets the autofill match a description as well as
// a name: typing `salve` offers Ointment.
export const ingredientForms = pgTable(
  'ingredient_forms',
  {
    ...vocabularyColumns(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => ingredientFormGroups.id),
    ...auditColumns,
  },
  (table) => vocabularyIndexes('ingredient_forms', table, { trigram: true }),
);
