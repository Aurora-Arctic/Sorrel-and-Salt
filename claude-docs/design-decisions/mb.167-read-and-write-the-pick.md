# MB.167 — Reading and writing the picked form and deities

**Status:** decided · **Date:** 2026-10-06

MB.165 gave the pick a place: `ingredients.form_id` beside `form`, and
`ingredient_deities`, a name per row with the curated deity picked beside it
([`mb.165-record-the-picked-vocabulary-row.md`](mb.165-record-the-picked-vocabulary-row.md)).
MB.166 filled the table from `ingredients.deities` as unlinked names. This
task switches every reader and writer to them, and moves MB.162's compendium
rule for the form and the deities from a spelling onto the pick. The scoping
plan is [`mb.167-plan.md`](mb.167-plan.md). DESIGN.md §5 and §7 carry the model;
this record carries the calls and the alternatives.

## The owner's calls, in scoping

**The GraphQL names follow the table: `IngredientDeityInput` and
`IngredientDeity`.** The task text named them `DeityInput` and `DeityRef`, but
MB.132 already plans a `DeityInput`, with its tradition, for the admin's deity
CRUD.

- `IngredientDeityInput { deityId, name }` is exactly one of the two, held by
  the shared schema as `SubstituteInput` is.
- `IngredientDeity { name, deity: Deity }` reads as `Substitute` does.
- _Taking the task's names (turned down):_ MB.132 would then rename its
  input, and an ingredient-shaped type would hold the vocabulary's name.

**A `formId` needs text that is its row's name.** The `form` sent beside a
pick must fold (trimmed, lower-cased) to the picked form's name. Anything else
is a field error at `form`, and a match is written in the row's spelling.
MB.169's box drops the pick when the text is edited, so only an API caller can
send a mismatch.

- _The pick wins (turned down):_ it would replace whatever text was sent, so
  a caller sending "Root" beside Wax's id would save Wax without being told.
  Refusing rather than guessing is the `unitConvert` idiom (§11).

**`Deity` is built with its tradition.** `Deity { id, name, slug,
description, tradition: DeityTradition! }`, the tradition through a
`deityTraditionsById` loader, as `IngredientFormValue.group` is read. It is
what MB.169's "Hecate (Greek)" pill reads.

**A held deity link is kept, as a substitute's is** (decided on the plan's
review). The question was what a save does with a pick whose deity an admin
has since retired.

- A deity row the ingredient already holds is kept whether or not its deity is
  still curated: no refusal, no tombstone, its stored name unchanged. Only a
  pick made _anew_ must name a curated deity.
- The read shows such a row as a typed name (`deity: null`), so the form sends
  back its text. The service matches a sent name to a held pick of exactly that
  text whose deity is no longer curated, and keeps that row. A re-sent
  `deityId` matches its row too.
- _Convert it to a typed name (turned down):_ every save after the retirement
  would tombstone the row and insert an unlinked twin at the same position,
  losing a link an admin's restore (v2) would otherwise bring back.

## The calls made in the plan

**"Curated" means one thing everywhere: a live row under a live group or
tradition.** The write check, `formChoice` and `IngredientDeity.deity` all read
it, as `findCuratedRowsByName` and the suggestions already did. A pick whose row
or whose group is retired reads back as its text with no link.

- _The row alone (turned down in review):_ a form whose group is retired
  would read as a pick whose non-null `IngredientFormValue.group` could not
  resolve.

**A deity entry is exactly one of `deityId` and `name`.** A blank entry is
refused rather than dropped, as a substitute's is, so a refusal's path counts
the entries sent.

**The form's pick is not kept as a deity's is.** A `formId` sent must name a
curated form, held or not, and a save sending none clears the column. The
keep rule exists because dropping a deity link tombstones a row. `form_id` is
a column, so clearing it removes nothing: the text stays, and the read had
already shown `formChoice: null`.

**A kept pick of a curated deity takes its current spelling.** If the deity was
renamed since it was picked, the next save writes the new spelling onto the
row, in place. A kept pick of a retired deity keeps its stored name.

**The reorder moves rows through a scratch offset.**
`ingredient_deities_position_unique` is checked per row, so a swap written in
place collides with itself. The save goes in four steps:

1. Soft-delete the dropped rows.
2. Move each kept row whose position changes to `scratch + newPosition`, where
   `scratch` is one past the highest live position.
3. Move each of those rows to its new position.
4. Insert the new rows.

No row is tombstoned for moving, and no 23505 can occur. A list that changes
nothing writes nothing.

**The picks are read before the write**, on another connection, as MB.162's
spelling check already is. An admin retiring a row at the instant a member
picks it can see that pick written; MB.148 is what moves reads into the write's
transaction.

**Repeats are refused at the repeat, in the shared schema.** That covers a deity
picked twice and a typed name repeated case-folded. It also covers a planet,
zodiac sign or colour listed twice, folded as folk names are, on either tier, so
neither unique index, nor a silently doubled list, is what a member sees.

**Only form and deity suggestions carry an `id`.** It is the curated row's,
null for a value only in use, and it is what a pick sends. Planets and signs
record no pick, so `CorrespondenceSuggestion` gains nothing.

**The in-use deities are `ingredient_deities`' live rows**, joined to their
ingredient, in place of the unnested list.

## MB.162's rule moves onto the pick

A compendium entry's form, and each of its deities, must be a pick of a curated
row, held or not. Text that names a curated row but was typed is refused beside
the field, as an uncurated value is. Planets and signs keep the spelling match,
since they record no pick. The coven tier is untouched: a pick there must be
curated when made, and typed text stays free.

MB.162's delete and rename rules for forms and deities are not built yet; they
are M5.6a's, M5.6b's and MB.132's. "Following the link" is therefore a
correction to those tasks, made here:

- A delete is refused while a live compendium entry **links** the row, and so
  is deleting a group or tradition with a row under it so linked. Amended by
  M5.6b for form groups, whose delete moves its forms to another live group
  instead, so no link is orphaned
  ([`m5.6b-admin-groups.md`](m5.6b-admin-groups.md)).
- A rename rewrites the text of the entries **linking** the row. A form's
  rename re-keys and re-slugs each.
- The "last live spelling" clause goes for forms and deities: a link names one
  row, so deleting one of two same-named forms is refused if an entry picked
  that one. Planets and signs keep the clause.
- The reverse indexes those reads want, on `ingredient_deities.deity_id` and
  `ingredients.form_id`, are M5.6a's and MB.132's to add. MB.165 left the index
  to this task's plan, which finds no read here that wants it.

## What it leaves open

- **One identity for two picks**, as MB.165 left it: two entries with one
  formal name, one picked as each Wax, share a `canonicalKey`.
- **A typed name beside a retired pick of the same text** reads as two typed
  "Hecate"s. Sent back, the second is refused as a repeat, and the member
  removes one.
- **A database seeded before this task** keeps its compendium forms unpicked
  and MB.166's unlinked deities. The seed inserts only what is missing, and
  keys a deity on its name for that reason, so it never puts a pick beside its
  typed twin at a taken position. Fresh databases and the test template are
  picked throughout.

## What it changed

- **Code:**
  - The shared schema: `formId`, deity entries, repeats.
  - `resolvePicks` and `replaceDeities` in `ingredient-rows.ts`, used by both
    services.
  - The compendium's curated check.
  - `findCuratedRowsByIds`, `findDeitiesOfIngredients` and the deities' in-use
    scan.
  - `deitiesOf`, `formChoicesOf`, `deityTraditionsOf` and their three loaders.
  - On `Ingredient`: `formChoice` and `deities: [IngredientDeity!]!`.
  - Both inputs' `formId` and `deities: [IngredientDeityInput!]`.
  - The suggestions' `id`.
  - The Drizzle schema stops declaring `ingredients.deities`, which MB.168
    drops.
  - The `standard` seed picks its compendium forms and deities.
  - `IngredientForm` sends its deities as names.
- **Docs:**
  - DESIGN.md §5 and §7.
  - `db/identity-model.md`, `db/ingredient-children.md`,
    `db/member-autofill.md`, `db/deity-vocabulary.md` and
    `db/compendium-writes.md`.
  - `validation.md`, `graphql/schema.md`, `graphql/loaders.md` and
    `modules.md`.
- **Task text:**
  - MB.167: the names.
  - M5.6a, M5.6b and MB.132: the delete and rename rules follow the link, and
    the reverse index is theirs.
  - MB.169: the types it reads.
