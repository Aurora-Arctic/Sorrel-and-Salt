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
token**, and §14 says why one per theme. M0.7 emits one `--group-<slug>` custom
property per key of `$category-groups` at Sass compile time, which is
exactly what a group created at runtime cannot have. So the map becomes the
**seed source**: M4.3 resolves each group's `dark` and `light` value to a hex
once and writes both onto the row, carrying
M0.7's hue rotation and per-theme contrast tuning across into data. From
then on the chip reads the row (MB.36 changes the mixin to take the pair).
The validation is M5.6b's, in the service and not a CHECK constraint, because
the failure needs a readable message and the ground to compare against:
`colorDark` is checked against the dark ground only, `colorLight` against
the light, so each floor is exact. What an admin adds is legible in both
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
the gap stays a recorded decision. Adding the index later is the reversible
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
than service-side validation, unlike M5.6b's contrast floor, because "say
something" needs no ratio in its error message. The two category tables carry
no counterpart: §5 asks for non-empty only on the form vocabulary, so M4.2
shipped NOT NULL alone and this is a difference in the specification, not a
gap in M4.2.
