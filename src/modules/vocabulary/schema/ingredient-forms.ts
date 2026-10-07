import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';

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
    // The identity the reference seed gave the row, null on any other; never
    // changed after, so a reseed knows a row an admin has since edited (MB.171).
    seedKey: text('seed_key'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('ingredient_form_groups_seed_key_unique')
      .on(table.seedKey)
      .where(sql`${table.seedKey} is not null and ${table.deletedAt} is null`),
    // Partial per CLAUDE.md rule 4, and on the slug alone, never the display name.
    uniqueIndex('ingredient_form_groups_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    // Required *and non-empty*: NOT NULL alone accepts ''.
    check('ingredient_form_groups_description_not_blank', sql`btrim(description) <> ''`),
  ],
);

// The vocabulary behind `ingredients.form`, and deliberately not a foreign key
// target for that text (ingredient-forms-schema.test.ts asserts so): `groupId`
// can be a key because only an admin writes it, `ingredients.form` stays text
// because a member must write `rhizome` before anyone curates it. A pick is
// keyed beside the text, as `ingredients.form_id` (MB.165).
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
    // The identity the reference seed gave the row, null on any other; never
    // changed after, so a reseed knows a row an admin has since edited (MB.171).
    seedKey: text('seed_key'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('ingredient_forms_seed_key_unique')
      .on(table.seedKey)
      .where(sql`${table.seedKey} is not null and ${table.deletedAt} is null`),
    // Partial per rule 4, global rather than per group. The display name is
    // deliberately unindexed: two live forms may both be "Wax", and the
    // autofill tells them apart by group
    // (claude-docs/db/form-vocabulary-seed.md, "The form vocabulary seed").
    uniqueIndex('ingredient_forms_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    check('ingredient_forms_description_not_blank', sql`btrim(description) <> ''`),
    // The autofill matches a description as well as a name — typing `salve`
    // offers Ointment — by `%` and `<%` under per-transaction thresholds
    // (claude-docs/db/member-autofill.md, "The member's autofill").
    index('ingredient_forms_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.description} gin_trgm_ops`,
    ),
  ],
);
