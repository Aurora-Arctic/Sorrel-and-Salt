import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../../identity/schema/users';

// Traditions: global, admin-curated, `ingredient_form_groups` in shape — a
// people or a religion, never a region (claude-docs/db/deity-vocabulary.md,
// "The deity vocabulary"). No colour, since a tradition labels a suggestion
// rather than a chip; no order column, traditions list alphabetically; no
// trigram index, since the autofill returns a tradition's name and never
// searches it.
export const deityTraditions = pgTable(
  'deity_traditions',
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
    uniqueIndex('deity_traditions_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    // Required *and non-empty*: NOT NULL alone accepts ''.
    check('deity_traditions_description_not_blank', sql`btrim(description) <> ''`),
  ],
);

// The vocabulary behind an ingredient's deities, and deliberately not a foreign
// key target for their text (deities-schema.test.ts asserts so): `traditionId`
// can be a key because only an admin writes it, as `ingredient_forms.group_id`
// is, while a member must be able to write a god before anyone curates one. A
// pick is keyed beside its name, as `ingredient_deities.deity_id` (MB.165).
export const deities = pgTable(
  'deities',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    traditionId: uuid('tradition_id')
      .notNull()
      .references(() => deityTraditions.id),
    ...auditColumns,
  },
  (table) => [
    // Partial per rule 4, global rather than per tradition. The display name
    // is deliberately unindexed: one god honoured under two traditions is two
    // rows, and the autofill tells them apart by tradition.
    uniqueIndex('deities_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    // The description is search surface: it carries the other spellings a
    // reader types (_Hekate_, _Freyja_).
    check('deities_description_not_blank', sql`btrim(description) <> ''`),
    // The autofill matches a description as well as a name, by `%` and `<%`
    // under per-transaction thresholds (claude-docs/db/member-autofill.md,
    // "The member's autofill").
    index('deities_trgm').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
      sql`${table.description} gin_trgm_ops`,
    ),
  ],
);
