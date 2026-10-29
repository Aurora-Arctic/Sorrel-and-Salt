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
which replaced the list MB.168 dropped
([`identity-model.md`](identity-model.md); MB.165), so Greek and Roman Hecate
stay told apart after a save, and the text stays the value. Soft-deleting a
row rewrites none of a coven's, its value moving into the in-use bucket instead. A compendium entry's
deities are each a pick of a curated row, so a deity one picks is not
deleted, a tradition's delete moves its deities rather than orphaning them,
and a rename carries onto it
([MB.162](../design-decisions/mb.162-compendium-holds-curated-values.md); on
the pick since [MB.167](../design-decisions/mb.167-read-and-write-the-pick.md)).
`tradition_id` can be a key because only an admin
writes it, as `ingredient_forms.group_id` is. MB.127 was minted to follow the
celestial body and zodiac vocabularies, which are flat; the owner then asked for
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

**`description` is required on both, as on the forms and the celestial bodies.** MB.127
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
  celestial bodies' values, but 216 deities with their descriptions are data, so §5
  states the model and points at the seed doc, whose two tables MB.129 parses.
- **`standard`'s compendium deities are curated picks** (MB.167), so every value the autofill offers before a member types one is curated; a
  test wanting an uncurated value writes its own on a coven's ingredient, as
  MB.94's do for celestial bodies, since a compendium entry may not hold one (MB.162).
- **Curating a value is not one click.** `description` and `tradition_id`
  are both required, so the admin writes both with the name (MB.132).

**The two readers are scoped as the forms' are.** A member's autofill (MB.130)
offers curated rows first, each with its tradition, then uncurated values in
use in the compendium and the current workspace only, and since MB.162 every
one of those is the workspace's. The admin's read (MB.132) is the compendium
tier only — the live entries picking a deity, which refuse its delete and
take its rename — since an admin reaches no workspace's
ingredients (M6.6). A value is uncurated when `lower(btrim(value))`
matches no live row's `lower(name)`, and a deity is curated only while its
tradition is live too, as a form is only while its group is.

### The admin's writes (MB.132)

`/admin/deities` and `/admin/deity-traditions` write the two tables through
`vocabulary`'s `services/deities.ts` and `services/deity-traditions.ts`, the
site admin's alone, on the forms' and form groups' rules
([`design-decisions/mb.132-admin-deities.md`](../design-decisions/mb.132-admin-deities.md)):

- **A deity's slug is its name and its tradition's**, `deitySlug(name,
tradition)` — `hecate-greek` — as a form's is its name and its group's, so
  a Greek and a Roman Hecate hold two addresses. It follows a rename and a
  move to another tradition; renaming a tradition re-slugs every live deity
  under it, and a move onto another live deity's address is refused, naming
  both. The seed slugs by the same rule and re-derives the slugs a database
  seeded before held, as the forms' seed does; the seed key stays the slug of
  the name. No ingredient is rewritten by any of it: a link holds a deity's
  name and id, never its slug.
- **A rename rewrites the link's name and nothing else.** Renaming a deity
  carries the new spelling onto every live `ingredient_deities` row linking it
  whose ingredient is a live compendium entry, in the same transaction, through
  the writer's `carryDeityRename` — the repository's, because `vocabulary` may
  not name `ingredients`' tables. A deity is no part of an entry's identity or
  slug, so no entry is re-keyed and no redirect is asked about. A coven's
  link, a deleted entry's and a typed name keep the old spelling; MB.167's
  save writes a kept pick's current spelling onto a coven's row the next time
  it is saved.
- **A delete is refused while a live compendium entry links the deity**, by
  `ingredient_deities.deity_id`, naming the first three entries and counting
  the rest, so Greek Hecate's delete is not refused by an entry that picked a
  namesake. The read is the compendium's own filter, `deityId`, which
  `ingredient_deities_deity_id_idx` answers: partial on live links, since a
  dropped link holds nothing.
- **A tradition's delete moves its live deities to a tradition the admin
  picks**, each re-slugged there, refused on `moveTo` when it has some and
  names no other live one, or when a moved deity would take another's
  address, then soft-deletes the tradition, in one transaction. The deities
  stay curated, so a compendium entry never refuses it.

The deities page lists the curated deities by their tradition's name, then
their own (`findDeityPage`, the categories' key), narrowed by a name query and
a tradition. The traditions page lists the live traditions by name
(`findGroupPage`, the finder every group vocabulary can page through),
narrowed by a name query, a case-insensitive fragment matched in SQL, as the
deities' is (MB.115).

### Other names (M14.22, M14.23)

A deity's other names are the spellings and by-names a source uses for the
same deity, such as Woden for Odin. They are rows of `deity_other_names`
(M14.22; its columns are DESIGN.md §5's), read and written since M14.23:

- **The deity form writes them as one list**, as the ingredient form writes an
  entry's common names. A save brings the live rows to the list sent: a kept
  name keeps its row, a dropped one is soft-deleted, a new one is added. Only
  a curator or an admin writes them, through `services/deities.ts`.
- **A name is refused twice on one deity, or on two live deities of one
  tradition**, in any case, and the refusal names the deity holding it. The
  same name under two traditions is allowed, since one god honoured under two
  traditions is two rows.
- **The deity picker finds a deity by an other name** and says which name
  matched. The entry page and the admin deities list show a deity's other
  names beside its name.
- **The admin deities list's filter finds a deity by an other name** as well
  as by its own: "Ganish" finds Ganesha. A soft-deleted other name finds
  nothing, and a deity two of whose other names match is one row, in the
  page and in its count alike (`deityArms` in
  `src/db/repository/vocabularies.ts`).
- **The seed loads them** from `DEITIES[].otherNames`, never re-adding a name
  an admin removed ([the seed's doc](deity-vocabulary-seed.md#other-names)),
  and a compendium entry file may name a deity by one of them
  ([the compendium seed's rule](compendium-seed/README.md)).

## Deity service details

`src/modules/vocabulary/services/deities.ts` holds the curated deity vocabulary: public reads, like every curated vocabulary, and writes for a curator or an admin alone.

- A compendium entry's deities are picks, so a deity a live entry links holds: its delete is refused (the message names the entries) and its rename is carried onto the entry's link in the same write. A deity is no part of an entry's identity or slug, so the rewrite touches the link's name alone. A change of tradition alone rewrites nothing, since a link holds the deity's name and not its tradition's.
- A deity's slug is its name and its tradition's, as a form's is its name and its group's. A collision is cured by changing either.
- A coven's link never holds a deity and is never rewritten: what it picked stays, and an admin writes nothing of a coven's. Deleting a deity moves its name into that coven's in-use values.
- The linking entries are read before the delete's transaction, so an entry linking the deity in the instant between is left holding a deleted one, which reads as its name.
- The list reads treat a blank query as no query, and a tradition id that is not a uuid names no tradition, so lists nothing.
- Other names: each is refused if the list repeats it or another live deity of the tradition holds it; the refusal sits on the name's row in the list sent, so a blank row still counts. Names are compared as written, so a change of case is a new name, and a dropped name is soft-deleted before a new one is written so the per-deity index never sees both.

## Deity tradition service details

`src/modules/vocabulary/services/deity-traditions.ts` holds the deity traditions, in the form groups' shape: public reads, and writes for a curator or an admin alone (claude-docs/design-decisions/mb.132-admin-deities.md).

- A deity's slug is its name and its tradition's. A rename therefore moves every live deity's slug under the tradition, and a delete first moves its live deities to the tradition the admin names (`moveTo`), each re-slugged there. A tradition with no live deity needs no `moveTo`.
- The deities stay curated either way, so neither a compendium entry's pick nor a coven's is orphaned, and no ingredient is rewritten: a link holds a deity's name and id, not its slug or its tradition.
- A rename or delete that would move a deity onto another deity's address is refused on `name` or `moveTo`, naming both. A rewrite leaves `seedKey` as it was.
- The deities are read before the transaction, so one added under the tradition in the instant between keeps the slug it was given (rename) or is left under a deleted tradition, which reads as uncurated (delete).
- The admin's list narrows the traditions by a name fragment; every other reader passes no filter.
