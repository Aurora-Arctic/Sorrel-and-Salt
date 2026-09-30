## Categories, and the two group vocabularies (MB.35; tables M4.2, M4.2a)

DESIGN.md §5 specifies four tables here, and all four are now written: M4.2
added `category_groups` and `categories` in migration
`0007_even_wild_pack.sql`, and M4.2a added `ingredient_form_groups` and
`ingredient_forms` in `0008_unknown_lyja.sql`. MB.35
recorded the model first, as MB.28 did for ingredients — and for a sharper
reason: M4.2 had already been built and verified as a `category_group`
pgEnum before the question "can an admin add a ninth group?" was asked. The
enum was a faithful transcription of §6's closed eight and had to be thrown
away.

- **`categories`** — `id`, `name`, `slug`, `description`, `groupId` (FK to
  `category_groups`), + audit. Global, admin-curated, no workspace scoping.
  §6 seeds 52. **No colour of its own** — see below.
- **`category_groups`** — `id`, `name`, `slug`, `colorDark`, `colorLight`,
  `description`, + audit. Global, admin-curated. §6 seeds eight; an admin
  may add more. Listed alphabetically by `name`.
- **`ingredient_forms`** — as in the identity section above, with `groupId`
  (FK to `ingredient_form_groups`) in place of the earlier `group` text.
- **`ingredient_form_groups`** — `id`, `name`, `slug`, `description`, +
  audit. Seeds §5's six groups. No colour: form
  groups section an autofill dropdown, not chips. Also alphabetical.

A category reaches an ingredient through `ingredient_categories` (M4.4) and a
spell through `spell_categories` (M10.4), both join tables and so both
hard-deleted — each has its own section below.

**Groups are rows, not enums, because an admin mutation cannot run DDL.**
`ALTER TYPE … ADD VALUE` is a migration, migrations here are forward-only and
CI-gated, and the whole point of the change is that adding a group needs no
deploy. As a table the group also gets what an open set needs and a closed
one could imply: a colour per row, below. It does _not_ get an order column
— groups list alphabetically by `name`, which needs nothing stored and puts
an admin-added group where a reader would look for it.

**Two group tables, not one with a `kind` column.** A shared table with a
discriminator would let `categories.groupId` point at a form group, and the
mistake would surface only when a chip section rendered empty. Two tables
make it a foreign-key violation — impossible rather than merely absent, for
the price of one more `CREATE TABLE`.

**Both `groupId`s are foreign keys, and `ingredients.form` is not — that is
a rule, not an inconsistency.** `ingredients.form` is written by a _member_,
who must be able to write `rhizome` before an admin has curated it, so it is
text over a vocabulary. A category, a form, and the groups they point at are
written only by admins, on both sides, so an FK blocks nobody — and a
typo'd group would otherwise silently empty a section. Generalised: a
vocabulary a member writes is text; a vocabulary only an admin writes is a
foreign key.

**A group's colour is two hexes on the row, one per theme, each validated on
write — not a build-time token.** M0.7 emits one `--group-<slug>` custom
property per key of `$category-groups` at Sass compile time, which is
exactly what a group created at runtime cannot have. So the map becomes the
**seed source**: it already carries a `dark` and a `light` value per group,
and M4.3 resolves each to a hex once and writes both onto the row, carrying
M0.7's hue rotation and per-theme contrast tuning across into data. From
then on the chip reads the row (MB.36 changes the mixin to take the pair).
Two columns rather than one because the grounds differ — M0.7 lifts a
dark-theme colour and darkens a light-theme one, and no single hex clears
4.5:1 on both soot and parchment without being mud on at least one. The
validation is M5.6b's, in the service and not a CHECK constraint, because
the failure needs a readable message and the ground to compare against:
`colorDark` is checked against the dark ground only, `colorLight` against
the light, so each floor is exact. What an admin adds is legible in both
themes but does not join the rotation — the accepted cost of an open set,
stated in §6 rather than glossed.

**The colour lives on the group only, and a category has none (M4.2).** §5,
§6 and this file all listed a `color` on `categories` until the table was
written, carried over from before MB.35 made a group's colour a _pair_ of
hexes — which a single category column cannot hold either half of, and which
M4.3 has nothing to seed a per-category counterpart from, since the
resolution it describes writes onto the group row. One source for a chip's
colour, rather than a per-category override shadowing a per-group value; §6's
grouping exists so 52 chips read as eight families in the first place. If a
per-category override is ever wanted it is addable as a widening.

**Uniqueness is on `slug`, partial on `deleted_at IS NULL`, on all four
tables** — `category_groups_slug_unique`, `categories_slug_unique`,
`ingredient_form_groups_slug_unique` and `ingredient_forms_slug_unique`, the
partial-index convention below. Slug uniqueness is global rather than per
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
the autofill instead**: M4.7a returns each curated suggestion's group and
M5.10a renders it, so the dropdown offers "Wax (animal)" beside "Wax
(substance)". The schema test asserts the same-named pair is _accepted_, so
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
section below).

**The two form tables go one step further than NOT NULL on `description`**, in
`ingredient_form_groups_description_not_blank` and
`ingredient_forms_description_not_blank`: §5 asks for a description that is
required _and non-empty_, and `NOT NULL` alone accepts `''` and `'   '` — a
curated value that curates nothing, when the whole point of the column is that
`rootBark` can say "the bark of the root, not the stem". It is a CHECK rather
than service-side validation, unlike M5.6b's contrast floor, because "say
something" needs no ratio in its error message. The two category tables carry
no counterpart: §5 asks for non-empty only on the form vocabulary, so M4.2
shipped NOT NULL alone and this is a difference in the specification, not a
gap in M4.2.
