import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// DESIGN.md §5's form groups: global, admin-curated, the shape
// `category_groups` has minus its colour pair. A table rather than an enum for
// MB.35's reason — `ALTER TYPE … ADD VALUE` is DDL and an admin mutation
// cannot run DDL at all. §5's six names are a starting set, seeded by M4.3a.
//
// No colour, unlike `category_groups`: a form group sections an autofill
// dropdown rather than being a chip, so there is no ground to contrast against.
// And no order column — groups render alphabetically by `name`, so an
// admin-added seventh lands where a reader would look for it.
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
    // Partial per CLAUDE.md rule 4: a plain unique constraint would let a
    // soft-deleted group reserve its slug forever. Uniqueness is on the slug
    // alone, never on the display name — the same rule MB.35 set for all four
    // vocabulary tables.
    uniqueIndex('ingredient_form_groups_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    // §5 asks for a description required *and non-empty*: NOT NULL alone
    // accepts '' and '   '. A CHECK rather than service-only validation
    // because "say something" needs no carefully phrased message, unlike
    // M5.6b's contrast floor.
    check('ingredient_form_groups_description_not_blank', sql`btrim(description) <> ''`),
  ],
);

// DESIGN.md §5's form vocabulary, global and admin-curated at `/admin/forms` —
// the third resource admins curate globally, alongside the compendium and
// categories.
//
// It is the vocabulary behind `ingredients.form` and deliberately **not** a
// foreign key target for it, which the whole identity design rests on and
// ingredient-forms-schema.test.ts asserts. Both directions of §5's rule sit in
// this file: `groupId` below is a foreign key because only an admin writes it,
// while `ingredients.form` stays text because a member must be able to write
// `rhizome` before anyone has curated it.
//
// `description` is required and non-empty so a curated value explains itself:
// `rootBark` can say "the bark of the root, not the stem".
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
    // Partial per rule 4, as above — and global rather than per group: the slug
    // is what M4.3a's idempotency key reads, and it carries no group alongside
    // it.
    //
    // The display name carries no index, which leaves one gap deliberately
    // open: two live forms may both be called "Wax", one an animal part and one
    // a substance. The autofill resolves that instead, M4.7a returning each
    // suggestion's group (claude-docs/db.md, "The form vocabulary seed").
    uniqueIndex('ingredient_forms_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    check('ingredient_forms_description_not_blank', sql`btrim(description) <> ''`),
  ],
);
