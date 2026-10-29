import { pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';
import { FORM_GROUP_ICONS } from './form-group-icons';

export const formGroupIcon = pgEnum('form_group_icon', FORM_GROUP_ICONS);

// Form groups: global, admin-curated, a table rather than an enum. A group sections a dropdown, so it has no colour pair, but it carries its icon as data;
// a NULL `icon` is the generic icon. The icon is an enum so adding one is expand-only (claude-docs/design-decisions/m12.6-form-icons.md; claude-docs/db/categories.md,
// "Vocabulary schema details"). No order column: groups list alphabetically.
export const ingredientFormGroups = pgTable(
  'ingredient_form_groups',
  { ...vocabularyColumns(), icon: formGroupIcon('icon'), ...auditColumns },
  (table) => vocabularyIndexes('ingredient_form_groups', table, { trigram: false }),
);

// The vocabulary behind `ingredient_variants.form`, deliberately not a foreign key target for that text; a pick is keyed beside it as `ingredient_variants.form_id`.
// The slug is unique globally and the display name unindexed, so the autofill tells two "Wax" forms apart by group (claude-docs/db/form-vocabulary-seed.md, "The form vocabulary seed").
// The trigram index lets the autofill match a description as well as a name.
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
