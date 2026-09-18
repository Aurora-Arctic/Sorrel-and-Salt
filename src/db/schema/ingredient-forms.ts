import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// DESIGN.md §5: `id`, `name`, `slug`, `description`, + audit. Global only and
// admin-curated, the same shape `category_groups` has minus its colour pair.
//
// A table rather than an enum for the same reason MB.35 gave for category
// groups: organism part / preparation / matter is a set that has already grown
// twice, `ALTER TYPE … ADD VALUE` is DDL, and an admin mutation cannot run DDL
// at all. The three §5 names are a starting set, seeded by M4.3a.
//
// No colour, unlike `category_groups` — a form group sections an autofill
// dropdown, it is not a chip, so there is no ground to contrast against and
// nothing for M5.6b to validate. And no order column: groups render
// alphabetically by `name`, so an admin-added fourth lands where a reader would
// look for it rather than at the end.
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
    // §5 asks for a description that is required *and non-empty*: NOT NULL
    // alone accepts '' and '   ', which satisfies the column while explaining
    // nothing. A CHECK rather than service-only validation because there is
    // nothing to phrase carefully here — unlike M5.6b's contrast floor, "say
    // something" needs no ratio in its message.
    check('ingredient_form_groups_description_not_blank', sql`btrim(description) <> ''`),
  ],
);

// DESIGN.md §5: `id`, `name`, `slug`, `groupId`, `description`, + audit. Global
// only and admin-curated, managed at `/admin/forms` under the same gate as
// `/admin/categories`. This is the third resource admins curate globally,
// alongside the compendium and categories (CLAUDE.md).
//
// It is the vocabulary behind `ingredients.form` and deliberately **not** a
// foreign key target for it — the property the whole identity design rests on,
// asserted by test in ingredient-forms-schema.test.ts. Both directions of §5's
// rule sit in this one file: `groupId` below is a foreign key because only an
// admin writes it, while `ingredients.form` stays text because a member writes
// it and must be able to write `rhizome` before anyone has curated it. The
// curated set is a vocabulary, not a constraint.
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
    // open: two live forms may both be called "Root", one an organism part and
    // one a preparation. `ingredients.form` stores the string rather than an
    // id, so nothing downstream can tell the two rows apart — the autofill is
    // where that ambiguity is resolved instead, M4.7a returning each
    // suggestion's group and M5.10a rendering it, so the dropdown offers "Root
    // (organism part)" beside "Root (preparation)". Recorded in db.md with the
    // reasoning, and asserted by test so it stays a decision rather than an
    // oversight.
    uniqueIndex('ingredient_forms_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    check('ingredient_forms_description_not_blank', sql`btrim(description) <> ''`),
  ],
);
