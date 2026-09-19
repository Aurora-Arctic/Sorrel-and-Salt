import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// Form groups: global, admin-curated, `category_groups` minus the colour pair —
// a table rather than an enum so an admin can add one without DDL (MB.35). No
// colour because a group sections a dropdown rather than colouring a chip; no
// order column, groups list alphabetically.
export const ingredientFormGroups = pgTable(
  'ingredient_form_groups',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4, and on the slug alone, never the display name.
    uniqueIndex('ingredient_form_groups_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    // Required *and non-empty*: NOT NULL alone accepts ''.
    check('ingredient_form_groups_description_not_blank', sql`btrim(description) <> ''`),
  ],
);

// The vocabulary behind `ingredients.form`, and deliberately not a foreign key
// target for it (ingredient-forms-schema.test.ts asserts so): `groupId` can be
// a key because only an admin writes it, `ingredients.form` stays text because
// a member must write `rhizome` before anyone curates it.
export const ingredientForms = pgTable(
  'ingredient_forms',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => ingredientFormGroups.id),
    ...auditColumns,
  },
  (table) => [
    // Partial per rule 4, global rather than per group. The display name is
    // deliberately unindexed: two live forms may both be "Wax", and the
    // autofill tells them apart by group (claude-docs/db.md, "The form vocabulary seed").
    uniqueIndex('ingredient_forms_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    check('ingredient_forms_description_not_blank', sql`btrim(description) <> ''`),
  ],
);
