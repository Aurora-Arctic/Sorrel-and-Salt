## Categories, and the two group vocabularies (MB.35; tables M4.2, M4.2a)

DESIGN.md §5 specifies four tables here, and all four are now written: M4.2
added `category_groups` and `categories` in migration
`0007_even_wild_pack.sql`, and M4.2a added `ingredient_form_groups` and
`ingredient_forms` in `0008_unknown_lyja.sql`. MB.35
recorded the model first, after M4.2 had been built as a `category_group`
pgEnum that could not take a ninth group.

- **`categories`** — `groupId` an FK to `category_groups`; §6 seeds 52.
  **No colour of its own** — see below.
- **`category_groups`** — `color`; §6 seeds eight, and
  an admin may add more.
- **`ingredient_forms`** — as in the [identity section](identity-model.md), with `groupId`
  (FK to `ingredient_form_groups`) in place of the earlier `group` text.
- **`ingredient_form_groups`** — seeds §5's six; no colour (§5); each carries an `icon`, one of six icon names or NULL for the generic (M12.6).

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

**Both `groupId`s are foreign keys, and a variant's `form` is not — that is
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

**One builder declares a vocabulary's shared columns and indexes** (MB.207).
`src/db/schema-parts.ts`'s `vocabularyColumns()` is `id`, `name`, `slug`,
`description` and `seedKey`, and `vocabularyIndexes(prefix, table, options)`
is `<prefix>_seed_key_unique`, `<prefix>_slug_unique`,
`<prefix>_description_not_blank` and, with `trigram`, `<prefix>_trgm`, the
names the migrations created. All eight vocabulary tables — these four, the
two astrology tables and the two deity tables — spread the one and return the
other, adding only their own columns: a group's colour pair, an item's key
to its group. `db:generate` writing no migration is what proved the builder
reproduces the DDL. Drizzle's column order in the source changed with it, and
nothing reads that order: the database's is the migrations', where
`seed_key` is already the last column (migration 0045).

**On `ingredient_forms` that last sentence has a consequence the other three
do not have, and it is deliberate.** A category is referenced by **id**, so
two categories sharing a display name are only two similar chips.
A variant's `form` stores the **string**, so two live forms both called "Root"
— one an _animal_ part, one a _substance_ — are indistinguishable to
everything downstream: whichever the member picks, the same `Root` lands on
the variant, and the second curated entry can never be attributed to anything.
M4.2a's acceptance criteria originally asked for a partial unique index on
`name` here, which would have refused the second row outright. It was dropped
in favour of MB.35's slug-only rule for two reasons: a unique index on `name`
is case-sensitive, so it would still admit "Root" beside "root" — two
identical strings once `ingredient_variants_form_unique` lowercases `form` — and _wax_ is
legitimately both a part of the bee and a preparation of it, which the index
would force an admin to rename their way out of. **The disambiguation moved to
the autofill instead**, as §5 specifies: M4.7a returns each curated
suggestion's group and M5.10a renders it, and MB.165 keeps a pick, as
a variant's `form_id` beside the text. The schema test asserts the same-named pair is _accepted_, so
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

**Every vocabulary table goes one step further than NOT NULL on
`description`**, in `<prefix>_description_not_blank`: §5 asks for a
description that is required _and non-empty_, and `NOT NULL` alone accepts
`''` and `'   '` — a curated value that curates nothing, when the column
exists so that a curated value explains itself (§5). It is a CHECK rather
than input validation, unlike M5.6b's contrast floor, because "say
something" needs no ratio in its error message. The two category tables
shipped without it, since §5 first asked for non-empty only on the form
vocabulary, while their admin inputs refused a blank from the start; MB.214
added `categories_description_not_blank` and
`category_groups_description_not_blank` in migration
`0060_category-description-checks`, so the database holds all eight to one
rule however a row reaches them, and `vocabularyIndexes` builds the CHECK
unconditionally.

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
  name (`describeEntry`; no form since MB.222, as an entry may have several),
  then how many more: `"Protection" is filed on 5 compendium
entries — Bay Laurel (Laurus nobilis), … and 2 more. Take it off them
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
records them. Each write expires the `compendium` tag once it has committed (M8.7;
([`compendium-cache.md`](compendium-cache.md), "Expiring the tag")).

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
- **A delete is refused while a live compendium entry picks the form** on
  any of its forms, by a live variant's `form_id` (MB.220): `Forbidden`,
  naming the first three entries and how many more, through the compendium's
  own filter on the pick (`IngredientFilter.formId`, an `EXISTS` over the
  variants) and the shared `refuseWhileHeld` every vocabulary delete uses. A
  same-named form no entry picked deletes. A coven's pick, a dropped variant's
  and a deleted entry's never block it.
- **A rename carries the new name onto every live compendium variant picking
  the form, in the same transaction** (MB.220), through `write.carryFormRename`,
  one statement over `ingredient_variants`: each variant's `form` text, and
  nothing else. No slug moves and no retirement is written, since a form is no
  part of an entry's identity or address since MB.215. The ingredient row has
  no form of its own since MB.222, so nothing else is rewritten. A change of group alone rewrites no
  variant, which holds the form's name, not its group.
- **The rename is refused rather than half-carried.** Before the write it
  refuses, on `name`, a rename that would give an entry two forms of one
  name — the variant renamed beside another already spelt as the new name,
  which `ingredient_variants_form_unique` would refuse — naming each such
  entry, read by `findCompendiumFormRenameClashes`. A change of case clashes
  with nothing, the variant renamed being excepted. A clash the index finds
  inside the transaction, from a race, is read again and named the same way.
- **A coven's ingredient is never written.** One whose variant picked the
  form keeps its `form_id` and its text through a rename, and through a
  delete reads its form as no pick, its text moving into that coven's in-use
  values. An admin writes nothing of a coven's (M6.6). A pick whose row was
  renamed since is the member's to settle, on M8.17's modal.
- **The clash check reads before the transaction**, as the category delete's
  does; the carry itself matches `form_id` in its one statement, so a variant
  picking the form in the instant between is renamed with the rest, and one
  that picked another form since is not.

The owner's calls on the slug, the redirect and the stale pick are
[`design-decisions/m5.6a-admin-forms.md`](../design-decisions/m5.6a-admin-forms.md).
Each write expires the `compendium` tag once it has committed (M8.7;
([`compendium-cache.md`](compendium-cache.md), "Expiring the tag")).

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
  not a new writer method: each of the writer's methods is a decision argued
  for in its own PR, and a group holds a handful of rows. A deity tradition's
  delete moves its deities the same way (MB.132).
- **The rows are read before the transaction**, through the vocabularies' own
  page readers, so "live" means what their lists mean. One added under the
  group in the instant between is left under the deleted group, which every
  read drops or reads as uncurated, as a category's delete leaves an entry
  filed under it.

The owner's calls on the delete are
[`design-decisions/m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md).
Each write expires the `compendium` tag once it has committed (M8.7;
([`compendium-cache.md`](compendium-cache.md), "Expiring the tag")).

## Category group service details

`src/modules/vocabulary/services/category-groups.ts` holds the category groups: public reads, and writes for a curator or an admin alone (claude-docs/design-decisions/m5.6b-admin-groups.md).

- Each colour is held to 4.5:1 against its own theme's harder surface by the input schema, on its own column.
- A category's slug is its own name alone, so a group's rename touches no category. A group is deleted only once its live categories have somewhere to go: the admin names a group (`moveTo`) and they move there in the same write, since a category under a deleted group is read by nothing yet still holds its address. Their slugs and every link to them, a compendium entry's or a coven's, stay as they were. A group with no live category needs no `moveTo`.
- The categories are read before the transaction, so one filed under the group in the instant between is left under a deleted one, which every read drops, as a category's own delete leaves an entry filed under it.
- A rewrite leaves `seedKey` as it was.

## Vocabulary schema details

Facts the comments in `src/modules/vocabulary/schema/` and `validation/` cite.

- **Not foreign key targets.** The astrology, deity and form vocabularies are deliberately not foreign key targets for the ingredient text columns that draw on them: a member must be able to write `Eris`, a god or `rhizome` before anyone curates it. A pick is keyed beside its text (`ingredient_deities.deity_id`, `ingredient_variants.form_id`). A parent key such as `traditionId` or `groupId` can be a real key because only an admin writes it.
- **Astrology.** Two tables rather than one with a `kind`, so a suggestion query has no predicate to forget. One tier, no colour, and a nullable `position` that sets where a facet lists a row: calendar order for signs, Sun outward for bodies, null for any a curator adds, which sort after by name. The description is search surface served by the trigram index: Lilith's carries "Black Moon".
- **Category groups.** A table rather than an enum so an admin can add a ninth without DDL. Two colours, because one hex cannot clear 4.5:1 on both grounds; stored as hexes because a runtime group has no build-time Sass token. No CHECK on the contrast: the service (and the form, before the request) validates, so the refusal can name the column and the ratio. Refused, never corrected, as `unitConvert` refuses. No order column: groups list alphabetically. The slug is unique alone because two groups may both display "Protection". A category's slug is unique globally rather than per group, because a chip filter and the seed's idempotency key both read the slug alone; it carries no `workspaceId` and no colour of its own, which makes assigned-versus-derived comparable.
- **Deity traditions and deities.** A tradition is `ingredient_form_groups` in shape: a people or a religion, never a region; no colour (it labels a suggestion, not a chip); no order column; no trigram index. A deity's slug is unique globally rather than per tradition, and its display name is deliberately unindexed: one god honoured under two traditions is two rows, and the autofill tells them apart by tradition. The description and `deity_other_names` are search surface. Other names are rows rather than `text[]` because a `text` row takes a trigram index; full `auditColumns`, so removing one leaves a tombstone. The deity input's `otherNames` is the whole list the form shows, each trimmed, an absent list read as empty, because a save brings the stored names to the list sent; the schema has no refinement so the form can still `omit` and `extend` it.
- **Forms and form groups.** A form group sections a dropdown rather than colouring a chip, so it has no colour pair; it carries the icon that stands for it, as data on the row, and a NULL `icon` is the generic icon. The icon is an enum rather than a CHECK because adding one is then `ALTER TYPE … ADD VALUE`, expand-only. The form slug is unique globally rather than per group, and the display name is unindexed: two live forms may both be "Wax". The trigram index lets the autofill match a description as well as a name: typing `salve` offers Ointment. The icon list is written once in `schema/form-group-icons.ts`, which imports nothing, so a client component can reach it; the generic icon is not in it. A group's input takes the icon as one of the six or none (null and absent both mean none, since the service writes the group whole).
