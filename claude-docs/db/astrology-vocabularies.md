## The astrology vocabularies (MB.91; tables MB.92)

`planets` and `zodiac_signs` are the vocabularies behind the lists
`ingredients.planets` and `ingredients.zodiac_signs` (MB.136; the single
`planet` and `zodiac` before them), in
`src/modules/vocabulary/schema/astrology.ts`, migration
`0023_correspondence-vocabularies.sql`, seeded by `src/db/seed/astrology.ts`
(["The astrology vocabulary seed"](astrology-vocabulary-seed.md)), and read
by a member's autofill (["The member's autofill"](member-autofill.md)). They
replace a TypeScript constant of the same lists, deleted with the seed: a list
an admin cannot extend without a deploy is the shape `form` had before MB.35,
and wrong for the same reason. Files, scripts and functions say _astrology_
rather than _correspondence_, which in §5 names every property an ingredient
carries — element and deities too — not these two; the migration keeps the
name it shipped under, since its tag is in the journal.

- **`planets`** and **`zodiac_signs`** — each `id`, `name`, `slug`,
  `description` (NOT NULL, with a non-blank CHECK), + audit. Global,
  admin-curated, in the `vocabulary` module, both in one schema file as the
  form pair is. No group, no colour, no order column, no `workspace_id`.
  The only foreign keys are the audit stamps, and `ingredients.planets` and
  `.zodiac_signs` point none at either table — `astrology-schema.test.ts`
  asserts both from the schema and by scanning the shipped SQL per statement.

**They are `form`'s pattern, and the two lists stay free text.** A member
writes planets and zodiac signs, so by MB.35's rule each entry is text over a
vocabulary rather than a foreign key: a value off the list stays writable on
a coven's ingredient, and soft-deleting a row rewrites none of a coven's, its
value moving into the in-use bucket instead. A compendium entry holds curated
values alone, so a row one holds is not deleted and a rename carries onto it
([MB.162](../design-decisions/mb.162-compendium-holds-curated-values.md)).
`nomenclature` and `element` stay enums — closed
sets, and `nomenclature` is coupled to `canonicalName` by a CHECK that names
`none` and `unknown` and could not read a table (DESIGN.md §14).

**Two tables, not one with a `kind` column**, for the reason the group tables
are two: a suggestion query that forgot the `kind` predicate would offer a
sign for `planets`, and two tables leave no predicate to forget.

**Uniqueness is on `slug`, partial on `deleted_at IS NULL`**, as on the four
tables in the [categories section](categories.md), and the display name
carries no constraint. The description CHECK
is the form tables': a curated value explains itself, and here the description
is also search surface.

**One multicolumn `gin_trgm_ops` index per table over `(name, description)`**,
spelled as `ingredients_trgm` is, since the suggestion query matches both and
the set is admin-extensible. At nineteen and thirteen rows the planner will
never use it, so MB.94 asserts the query shape — `%` and `<%` under thresholds
set in the transaction — and not an index scan, where M4.7 and M4.7a assert
both. `gin_trgm_ops` answers `<%` as it answers `%`.

**Where they differ from the form precedent, and why:**

- **One tier.** Nothing groups a body or a sign, so the seed needs a flat
  helper over `insertMissing` rather than `seedTwoTierVocabulary`, which
  assumes a group table.
- **The DESIGN.md table sits outside `forms.test.ts`'s slice.** That test
  reads every table line between ``**`ingredient_forms`**`` and
  ``**`ingredient_form_groups`**`` as a form, so §5's planet and zodiac
  table is placed after the `ingredients.form` paragraph and before
  `categories`, and MB.93's test slices its own anchors.
- **`standard` seeds no uncurated planet.** Its compendium's planet values are
  all curated names in title case, which match case-insensitively. MB.94
  decided against one: its tests write their own against an emptied
  `ingredients`, and one in the shared template would reach every
  workspace's suggestions. Since MB.162 no compendium entry may hold one.
- **Curating a value is not one click.** `description` is required, so the
  admin writes one with the name (MB.95, and M5.6a for forms).

**The two readers are scoped differently.** A member's autofill (MB.94) offers
curated rows first, then uncurated values in use in the compendium and the
current workspace only, and since MB.162 every one of those is the
workspace's. The admin's read (MB.95) is the compendium tier only — the live
entries holding a value, which refuse its delete and take its rename
(MB.162) — since an admin reaches no workspace's ingredients (M6.6); its finder
joins `TIER_SEAM` in `tests/guards/module-boundaries.test.ts`, as the
autofill's does. A value is uncurated when `lower(btrim(value))` matches no
live row's `lower(name)`.

**The member's autofill** has a file of its own: [`member-autofill.md`](member-autofill.md).
