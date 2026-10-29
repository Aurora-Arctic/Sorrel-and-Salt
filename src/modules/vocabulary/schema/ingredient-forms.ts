import { pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';
import { vocabularyColumns, vocabularyIndexes } from '../../../db/schema-parts';
import { FORM_GROUP_ICONS } from './form-group-icons';

export const formGroupIcon = pgEnum('form_group_icon', FORM_GROUP_ICONS);

// Form groups: global, admin-curated, a table rather than an enum so an admin
// can add one without DDL. No colour pair, as `category_groups` carries,
// because a group sections a dropdown rather than colouring a chip; but a
// group does carry the icon that stands for it, as data on the row the way a
// category group carries its chip colours, and every form filed under it
// shows that icon. A NULL `icon` is the generic icon, not a missing answer.
// An enum rather than a CHECK, because adding an icon is then `ALTER TYPE …
// ADD VALUE`, expand-only, where a CHECK would be dropped and re-added (M12.6,
// claude-docs/design-decisions/m12.6-form-icons.md). No order column, groups
// list alphabetically.
export const ingredientFormGroups = pgTable(
  'ingredient_form_groups',
  { ...vocabularyColumns(), icon: formGroupIcon('icon'), ...auditColumns },
  (table) => vocabularyIndexes('ingredient_form_groups', table, { trigram: false }),
);

// The vocabulary behind `ingredient_variants.form`, and deliberately not a
// foreign key target for that text: `groupId` can be a key because only an
// admin writes it, a variant's `form` stays text because a member must write
// `rhizome` before anyone curates it. A pick is keyed beside the text, as
// `ingredient_variants.form_id`. The slug is unique
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
