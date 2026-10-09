## Categories, and the two group vocabularies (MB.35; tables M4.2, M4.2a)

DESIGN.md §5 specifies four tables here, and all four are now written: M4.2
added `category_groups` and `categories` in migration
`0007_even_wild_pack.sql`, and M4.2a added `ingredient_form_groups` and
`ingredient_forms` in `0008_unknown_lyja.sql`. MB.35
recorded the model first, after M4.2 had been built as a `category_group`
pgEnum that could not take a ninth group.

- **`categories`** — `groupId` an FK to `category_groups`; §6 seeds 52.
  **No colour of its own** — see below.
- **`category_groups`** — `colorDark` and `colorLight`; §6 seeds eight, and
  an admin may add more.
- **`ingredient_forms`** — as in the [identity section](identity-model.md), with `groupId`
  (FK to `ingredient_form_groups`) in place of the earlier `group` text.
- **`ingredient_form_groups`** — seeds §5's six; no colour (§5).

Each is global and admin-curated, carries the columns §5 lists, and lists
alphabetically by `name`.

A category reaches an ingredient through
[`ingredient_categories`](ingredient-categories.md) (M4.4) and a spell through
[`spell_categories`](spell-categories.md) (M10.4), both join tables and so both
hard-deleted — each has its own section.

**Groups are rows, not enums, because an admin mutation cannot run DDL** —
the argument, and why there is no order column, is §14's.

**Two group tables, not one with a `kind` column**, so a category pointing at
a form group is a foreign-key violation rather than an empty chip section
(§5, §14).

**Both `groupId`s are foreign keys, and `ingredients.form` is not — that is
a rule, not an inconsistency**: a member writes `form`, and only admins write
either side of a group link (§5, §14).

**A group's colour is §5's pair of hexes on the row, not a build-time
token**, and §14 says why one per theme. M0.7 emitted one `--group-<slug>` custom
property per key of `$category-groups` at Sass compile time, which is
exactly what a group created at runtime cannot have. So the colours became
**seed data**: M4.3 writes each group's two hexes onto the row, and since M5.6b
those hexes are the owner's hand-tuned pairs in
`src/db/seed/category-groups.ts`, their only source — they keep M0.7's hue
rotation but not its one-saturation-per-theme formula, and the Sass map is
retired ([category-seed.md](category-seed.md)). The chip reads the row: MB.36 changed `chip()` to take the pair and
removed the per-slug properties ([`styling.md`](../styling.md), "Chips, badges
and the solid-fill rule").
The validation is M5.6b's, in the shared input schema the service parses and
not a CHECK constraint, because the failure needs a readable message and the
ground to compare against:
`colorDark` is checked against the dark card only, `colorLight` against
the light page, the harder of each theme's two surfaces, so each floor is
exact and holds wherever a chip sits (MB.36). What an admin adds is legible in both
themes but does not join the rotation — the accepted cost of an open set,
stated in §6 rather than glossed.

**The colour lives on the group only, and a category has none (M4.2)** — a
single category column could hold neither half of the pair; §14 has the rest
of the argument.

**Uniqueness is on `slug`, partial on `deleted_at IS NULL`, on all four
tables** — `category_groups_slug_unique`, `categories_slug_unique`,
`ingredient_form_groups_slug_unique` and `ingredient_forms_slug_unique`, the
[partial-index convention](soft-delete.md). Slug uniqueness is global rather than per
group on both child tables: the slug is what a chip filter and M4.3/M4.3a's
idempotency keys read, and none of them carries a group alongside it. Display
names carry no constraint: two groups may each want a "Protection", and the
slug is what tells them apart.

**On `ingredient_forms` that last sentence has a consequence the other three
do not have, and it is deliberate.** A category is referenced by **id**, so
two categories sharing a display name are only two similar chips.
`ingredients.form` stores the **string**, so two live forms both called "Root"
— one an _animal_ part, one a _substance_ — are indistinguishable to
everything downstream: whichever the member picks, the same `Root` lands on
the row, and the second curated entry can never be attributed to anything.
M4.2a's acceptance criteria originally asked for a partial unique index on
`name` here, which would have refused the second row outright. It was dropped
in favour of MB.35's slug-only rule for two reasons: a unique index on `name`
is case-sensitive, so it would still admit "Root" beside "root" — two
identical strings once `canonicalKey` lowercases `form` — and _wax_ is
legitimately both a part of the bee and a preparation of it, which the index
would force an admin to rename their way out of. **The disambiguation moved to
the autofill instead**, as §5 specifies: M4.7a returns each curated
suggestion's group and M5.10a renders it, and MB.165 keeps a pick, as
`ingredients.form_id` beside the text. The schema test asserts the same-named pair is _accepted_, so
the gap stays a recorded decision. A form's slug names its group,
`formSlug(name, group)`, so the pair can be written through the admin's page
and not only by a test (M5.6a). Adding the index later is the reversible
direction — `CREATE UNIQUE INDEX` is expand-direction DDL that only fails if
duplicates already exist, where dropping one is a `DROP` needing a PR
acknowledgement (rule 10).

**NOT NULL on every remaining §5 and §6 field** — `name`, `slug` and
`description` on all four tables, both hexes on a category group, and
`groupId` on a category and on a form (FKs
`categories_group_id_category_groups_id_fk` and
`ingredient_forms_group_id_ingredient_form_groups_id_fk`). Constraining now is
the reversible direction: dropping a `NOT NULL` later is a widening, where
adding one is destructive DDL needing a PR acknowledgement (rule 10, and the
[destructive-DDL check](expand-contract.md)).

**The two form tables go one step further than NOT NULL on `description`**, in
`ingredient_form_groups_description_not_blank` and
`ingredient_forms_description_not_blank`: §5 asks for a description that is
required _and non-empty_, and `NOT NULL` alone accepts `''` and `'   '` — a
curated value that curates nothing, when the column exists so that a curated
value explains itself (§5). It is a CHECK rather
than input validation, unlike M5.6b's contrast floor, because "say
something" needs no ratio in its error message. The two category tables carry
no counterpart: §5 asks for non-empty only on the form vocabulary, so M4.2
shipped NOT NULL alone and this is a difference in the specification, not a
gap in M4.2.

## Category writes (M5.6)

`src/modules/vocabulary/services/categories.ts`. The reads are public
reference data like every curated vocabulary (MB.80). The writes are the site
admin's alone, each opening on `assertSiteAdmin` before it reads the input.

- **`listCategories(filter, page)`** pages the live categories under a live
  group by the group's name, then the category's, then id — the picker's
  order, the owner's call during MB.126, read through a join on the groups
  for the name alone — through `findCategoryPage`, and
  **`countCategories(filter, start)`** counts them, and those before a page's
  first row, through `findCategoryCount`, which shares the page's filter and
  key. The `CategoryFilter` narrows both in SQL (MB.178): `query` to a name
  holding it, case-insensitively, through the repository's `containsText`,
  which reads `%`, `_` and `\` literally; `groupId` to that group's
  categories. The service trims the query, so a blank one is no query, and
  answers a group id that is not a uuid with an empty page and a zero count
  without reading, since it names no group and would be a driver error at the
  comparison. **`getCategoryBySlug`**
  reads one by its address through `findOneBySlug`, for the admin page's
  `?edit=`, and throws `NotFound` for none.
- **`createCategory` and `updateCategory` write the row whole**, from the
  shared `CategoryInput`, and set the slug from the name with `slugify` (M4.3).
  A rename moves the slug. It leaves `seedKey` alone, so the next reseed still
  knows a renamed seeded row as its own and does not reinsert the original
  beside it (MB.171).
- **The group is checked live before the write.** The foreign key admits a
  soft-deleted group, so the service reads the group first and refuses a
  retired or unknown one as `VALIDATION` on `groupId`.
- **A slug collision is `VALIDATION` on `name`**, read off
  `categories_slug_unique` once the write has rolled back, and naming the
  category holding the address. The slug has no field of its own (MB.43). A
  deleted category's slug is free, by the partial index.
- **`deleteCategory` soft-deletes, and is refused while a live compendium
  entry is filed under the category.** The refusal is `Forbidden`, naming the
  first three entries by name, each told apart from a namesake by its formal
  name and form, then how many more: `"Protection" is filed on 5 compendium
entries — Bay Laurel (Laurus nobilis, Leaf), … and 2 more. Take it off them
first.` The entries are read through the compendium's own category filter,
  `findCompendiumPage` and `findCompendiumCount`, so "filed under" means what
  the compendium's list means by it. A deleted entry's link does not hold
  the category.
- **A coven's links never block the delete, and the delete removes no link.**
  The links in `ingredient_categories` and `spell_categories` belong to the
  covens, and an admin writes nothing of a coven's (M6.6). Every read already
  drops a deleted category: `categoriesOf` reads the link, then the category
  through `findManyByIds`, which filters it. A coven's ingredient therefore
  stops showing the chip and keeps the link, which a v2 restore would bring
  back. A spell's categories (M10) must read the same way.
- **The in-use read happens before the transaction.** An entry filed under
  the category in the instant between is left holding a deleted one, which
  every read drops. That is the same race `updateCompendiumEntry` accepts for
  the slug it reads first.

The owner chose the delete rule over two others, and
[`design-decisions/m5.6-admin-categories.md`](../design-decisions/m5.6-admin-categories.md)
records them. Revalidating the `compendium` tag after each write is M8.7's.

## Form writes (M5.6a)

`src/modules/vocabulary/services/ingredient-form-values.ts`, in the shape of
the category writes above, for `/admin/forms`. A compendium entry's form is a
pick of a curated row (MB.162, on the pick since MB.167), and these writes
keep it one after the write.

- **The reads.** `listIngredientFormValues(filter, page)` pages the live forms
  under a live group by `(name, id)`, and
  `countIngredientFormValues(filter, start)` counts them through
  `findIngredientFormValueCount`, on the page's own filter and key. The
  `IngredientFormValueFilter` narrows both in SQL as `CategoryFilter` narrows
  the categories: `query` to a name holding it, case-insensitively, through
  `containsText`, which reads `%`, `_` and `\` literally; `groupId` to that
  group's forms. The service trims the query, so a blank one is no query, and
  answers a group id that is not a uuid with an empty page and a zero count
  without reading. `getIngredientFormValueBySlug` reads one form by its
  address for the page's `?edit=`, `NotFound` for none.
- **A form's slug is `formSlug(name, group)`**, its name and its group's,
  `wax-substance`, so two live forms may share a name under two groups (§5).
  It follows a rename and a regrouping, and keeps `seedKey` as it was
  (MB.171). The group is checked live first, as a category's is, and a slug
  collision is `VALIDATION` on `name`, naming the form at the address.
- **A delete is refused while a live compendium entry picks the form**, by
  `form_id`: `Forbidden`, naming the first three entries and how many more,
  through the compendium's own filter on the pick (`IngredientFilter.formId`)
  and the shared `heldBy` the category delete now uses too. A same-named form
  no entry picked deletes. A coven's pick never blocks it.
- **A rename carries the new name onto every live compendium entry picking
  the form, in the same transaction**, through `write.carryFormRename`: each
  entry's `form` text, so its `canonical_key`, and its slug,
  `ingredientSlug(name, newForm, canonicalName)`, the old slug retired to
  redirect for 180 days as `updateCompendiumEntry` retires one, and the
  tier's lapsed retirements cleared in the same write. A case-only rename
  rewrites the text and moves no slug. A change of group alone rewrites no
  entry, which holds the form's name, not its group.
- **The rename is refused rather than half-carried.** Before the write it
  refuses, on `name` and naming both entries, a rewrite that would give an
  entry another live entry's identity or address. A collision an index finds
  inside the transaction, from a race, is read again and named the same way.
  A rewrite onto an address another entry's redirect runs from is refused on
  `endRedirect`, naming each entry and when its window closes, until the
  admin confirms (MB.82).
- **A coven's ingredient is never written.** One that picked the form keeps
  its `form_id`, its text and its slug through a rename, and through a delete
  reads its form as no pick, its text moving into that coven's in-use values.
  An admin writes nothing of a coven's (M6.6). A pick whose row was renamed
  since is the member's to settle, on M8.17's modal.
- **The entries are read before the transaction**, as the category delete's
  are. An entry picking the form in the instant between keeps the old
  spelling through a rename, or holds a deleted form through a delete. The
  writer matches `form_id` again, so an entry that picked another form since
  is not rewritten.

The owner's calls on the slug, the redirect and the stale pick are
[`design-decisions/m5.6a-admin-forms.md`](../design-decisions/m5.6a-admin-forms.md).
Revalidating the `compendium` tag after each write is M8.7's.

## Group writes (M5.6b)

`src/modules/vocabulary/services/category-groups.ts` and
`ingredient-form-groups.ts`, in the shape of the writes above, for
`/admin/category-groups` and `/admin/form-groups`. Each write opens on
`assertSiteAdmin` before it reads the input.

- **The reads.** `listCategoryGroups(page)` and
  `listIngredientFormGroups(page)` page the live groups alphabetically by
  name through `findPage`, the order every group list takes (§5), and
  `getCategoryGroupBySlug` and `getIngredientFormGroupBySlug` read one by
  its address for the page's `?edit=`, `NotFound` for none.
- **The inputs are the shared schemas** `CategoryGroupInput` and
  `IngredientFormGroupInput` ([`validation.md`](../validation.md),
  "Categories"). A group's slug is `slugify(name)`, following a rename, its
  `seedKey` kept as it was (MB.171). A slug collision is `VALIDATION` on
  `name`, read off `category_groups_slug_unique` or
  `ingredient_form_groups_slug_unique` and naming the group at the address.
- **The contrast floor is the schema's**, so the form refuses a colour
  before the request and the service refuses it again. `src/lib/contrast.ts`
  holds WCAG 2.1's relative luminance and contrast ratio, `chipContrast`,
  which measures a column against its own ground, `CHIP_GROUNDS` — the dark
  card, `$soot-raised` `#1f1c16`, and the light page, `$parchment`
  `#efe9da`, written out because nothing at runtime can import a Sass value
  and pinned to `_variables.scss` by `tests/lib/contrast.test.ts` — and
  `MIN_CHIP_CONTRAST`, 4.5. A refusal names the theme, the surface and the
  ratio, `The dark theme colour reads 2.16:1 on the dark card — it needs at
least 4.5:1`, pathed to `colorDark` or `colorLight` (MB.43). The ratio is
  cut to two places, never rounded, so a refused 4.499 never reads as 4.50.
  Every seeded pair passes, so a seeded group saves back unchanged.
- **Renaming a category group touches no category**, since a category's slug
  is its name alone. **Renaming a form group re-slugs every live form under
  it**, `formSlug(name, newGroupName)`, in the same transaction, since a
  form's slug names its group. It touches no ingredient, which holds a form's
  name and `form_id`, never its slug. A re-slug onto another live form's
  address refuses the rename on `name`, naming the form, the address and
  the form holding it, and asking that one of them be renamed first.
- **A delete moves the group's live rows to the group `moveTo` names, then
  soft-deletes it, in one transaction.** A moved category keeps its slug and
  every link, a compendium entry's or a coven's. A moved form is re-slugged,
  `formSlug(name, target.name)`, and stays curated, so no compendium entry's
  pick or coven's is orphaned and none is rewritten; a form group's delete is
  therefore not refused for the compendium, as MB.162 first had it. A group
  with no live rows needs no `moveTo`.
- **The delete's refusals are `VALIDATION` on `moveTo`**, beside the
  page's picker. A group with live rows and no `moveTo`: `Choose a group to
move its 3 categories to`. A `moveTo` naming the group itself, a deleted
  group or nothing: `Choose another live group to move its 3 categories
to`. The form group's say "form" and "forms". A moved form that would take
  another live form's address: `Moving "Wax" would give it the address
"wax-substance", which "Wax" already has — rename one of them first`. A
  collision an index finds inside the transaction, from a race, is read again
  and named the same way.
- **The rows are moved one at a time** through the writer's `updateById`,
  not a new writer method: `tests/db/repository/write.test.ts` caps the
  writer's methods, and a group holds a handful of rows. A deity tradition's
  delete moves its deities the same way (MB.132).
- **The rows are read before the transaction**, through the vocabularies' own
  page readers, so "live" means what their lists mean. One added under the
  group in the instant between is left under the deleted group, which every
  read drops or reads as uncurated, as a category's delete leaves an entry
  filed under it.

The owner's calls on the delete are
[`design-decisions/m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md).
Revalidating the `compendium` tag after each write is M8.7's.
