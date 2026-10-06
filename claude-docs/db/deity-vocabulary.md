## The deity vocabulary (MB.127; tables MB.128)

`deities` is the vocabulary behind an ingredient's deities, the rows of
`ingredient_deities` (MB.165, read and written since MB.167), and
`deity_traditions` groups it: Hecate under Greek, Brigid under Irish. Both are
in the `vocabulary` module, in `src/modules/vocabulary/schema/deities.ts`
(MB.128), seeded by `src/db/seed/deities.ts` (MB.129) from
["The deity vocabulary seed"](deity-vocabulary-seed.md), read by a member's
autofill, `deitySuggestions` (MB.130, on
[the member's autofill](member-autofill.md)), and curated at `/admin/deities`
and `/admin/deity-traditions` (MB.132). MB.131 puts that autofill on
the form's Deities box, so a member picks a curated spelling rather than
typing their own; a spelling the vocabulary lacks still needs someone to
curate it.

- **`deity_traditions`** — `id`, `name`, `slug`, `description` (NOT NULL, with
  a non-blank CHECK), + audit. Global, admin-curated, `ingredient_form_groups`
  in shape: no colour, since a tradition labels a suggestion rather than a
  chip, and no order column, since traditions list alphabetically.
- **`deities`** — `id`, `name`, `slug`, `description` (NOT NULL, with a
  non-blank CHECK), `tradition_id` (NOT NULL, a foreign key to
  `deity_traditions`), + audit. Global, admin-curated, `ingredient_forms` in
  shape. No order column, and no `workspace_id`.

**They are `form`'s pattern, groups and all, and the list stays free text.**
A member writes deities, so by MB.35's rule each entry is text over a
vocabulary rather than a foreign key: a value off the list stays writable on
a coven's ingredient. A pick records its curated row beside the text, in
`ingredient_deities`, which every reader and writer uses since MB.167 and
which replaces the list once MB.168 drops it
([`identity-model.md`](identity-model.md); MB.165), so Greek and Roman Hecate
stay told apart after a save, and the text stays the value. Soft-deleting a
row rewrites none of a coven's, its value moving into the in-use bucket instead. A compendium entry's
deities are each a pick of a curated row, so a deity one picks is not
deleted, nor the tradition over it, and a rename carries onto it
([MB.162](../design-decisions/mb.162-compendium-holds-curated-values.md); on
the pick since [MB.167](../design-decisions/mb.167-read-and-write-the-pick.md)).
`tradition_id` can be a key because only an admin
writes it, as `ingredient_forms.group_id` is. MB.127 was minted to follow the
planet and zodiac vocabularies, which are flat; the owner then asked for
deities grouped by tradition, which makes them two-tier like the forms, and
the forms are the closer precedent throughout.

**Grouped, because the tradition is what a reader needs beside the name.**
A suggestion reads "Hecate (Greek)", as a form's reads "Wax (Substance)": the
every tradition has its thunder god, its Moon and its Great Mother, so a
member choosing among 216 reads the tradition to choose, and an admin curating them reads the list by
tradition. One tradition per deity, by the same rule as one group per form: a
god several traditions honour is filed under one, and the description names
the others (Apollo is Greek, and his description says Roman too). A
tradition is a people or a religion, never a region — Irish rather than
Celtic, Akan rather than African — the owner's call, argued in
[the seed doc](deity-vocabulary-seed.md).

**Uniqueness is on `slug`, partial on `deleted_at IS NULL`**, on both tables,
as on the four tables in [the categories section](categories.md), and global
rather than per tradition, as `ingredient_forms_slug_unique` is. The display
name carries no constraint.

**`description` is required on both, as on the forms and the planets.** MB.127
was asked to settle it, given a seed of many deities across pantheons, and
the size of the seed is the argument for it, not against: a curated value
explains itself, and here the description is also search surface. The
suggestion query matches it as well as the name, so the other spellings a
reader types (_Hekate_, _Freyja_, _Guanyin_) and the words they reach for
(_crossroads_, _healing_, _Norse_) find the curated row. A bare name would
leave the vocabulary's one-spelling promise to exact matches. The seed's
descriptions are written in MB.127's list, not invented by the seed task.
`deity_traditions.description` is required for the reason the form groups'
is: a curated value explains itself.

**One multicolumn `gin_trgm_ops` index on `deities` over
`(name, description)`**, spelled as `ingredient_forms_trgm` is. At 216 rows
the planner still prefers a sequential scan, measured on MB.130's match, so
MB.130 asserts the query's shape, as MB.94 does at nineteen rows, rather than
an index scan, as M4.7a does for the common names. `deity_traditions` takes none: the autofill
returns a tradition's name, and never searches it.

**Where it differs from the form precedent, and why:**

- **An ingredient's deities are a table of rows.** The in-use scan reads
  `ingredient_deities`' live rows beside their ingredient (MB.167), where it
  unnested the `ingredients.deities` list before (MB.130, on MB.136's scan),
  and a value counts once however many rows hold it.
- **The list lives outside DESIGN.md.** §5 carries the forms' and the
  planets' values, but 216 deities with their descriptions are data, so §5
  states the model and points at the seed doc, whose two tables MB.129 parses.
- **`standard`'s compendium deities are curated picks** (MB.167), so every value the autofill offers before a member types one is curated; a
  test wanting an uncurated value writes its own on a coven's ingredient, as
  MB.94's do for planets, since a compendium entry may not hold one (MB.162).
- **Curating a value is not one click.** `description` and `tradition_id`
  are both required, so the admin writes both with the name (MB.132).

**The two readers are scoped as the forms' are.** A member's autofill (MB.130)
offers curated rows first, each with its tradition, then uncurated values in
use in the compendium and the current workspace only, and since MB.162 every
one of those is the workspace's. The admin's read (MB.132) is the compendium
tier only — the live entries picking a deity, which refuse its delete or its
tradition's and take its rename — since an admin reaches no workspace's
ingredients (M6.6). A value is uncurated when `lower(btrim(value))`
matches no live row's `lower(name)`, and a deity is curated only while its
tradition is live too, as a form is only while its group is.
