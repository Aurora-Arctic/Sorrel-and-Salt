# Grimoire decisions

Spells, their steps, workings, visibility and the screens that edit them.

## The spell builder is a modal

**Decided (2026-10-27, the owner):** the spell builder is a wide modal over the grimoire's list, not a page of its own. The working summary is [`../components/spell-builder.md`](../components/spell-builder.md); the modal it sits in is [`../components/modal.md`](../components/modal.md).

### Why

- **The owner's call**, made on 2026-10-27 while M10.12 was being built as the page `/coven/[slug]/grimoire/new`.
- **Consistency with Add Ingredient.** A coven's other "make a new thing" form, Add Ingredient (M8.16), is a modal opened by the address over the page it was opened from. A spell made the same way reads the same way, and Close returns the person to the list they came from.
- **Ingredient forms will autosave too** (M13.24). Once both forms save as they go, both are drafts that are kept rather than thrown away, so both can share one way in and one way out.

### The four decisions

1. **A modal, opened by the address.** `?new=spell-<slug>` (or `?new=spell`) over the grimoire opens the builder empty, and `?edit=<id>` opens a saved spell. The modal was `size="wide"`; amended 2026-10-28 on the owner's "Use add ingredient modal as reference" to the default column, Add Ingredient's, with the fields in folding sections as Add Ingredient's are ([`../components/spell-builder.md`](../components/spell-builder.md), "Sections"). The page `/coven/[slug]/grimoire/new` and its test are removed.
2. **The first save swaps the address.** A create replaces `?new=spell-<slug>` with `?edit=<id>`, with `router.replace`, so Back goes to the grimoire rather than to an empty New Spell, and a reload opens the saved draft. The builder reports a create through `onCreated` whichever way the save was made, so M13.17's autosave moves the address the same way as Save does. The dialog keeps the same builder under the new address, so nothing typed is lost. A create made by Close skips the swap, since the dialog is closing.
3. **Edit uses the same modal.** A spell card's pencil and Quick Look's Edit open `?edit=<id>` (M13.10). The planned page `/grimoire/[id]/edit` is dropped. The recipe page hosts its own copy of the dialog at `?edit=<id>`, with the recipe page as the address Close returns to.
4. **Close saves, then closes, and asks nothing.** Close, Escape and a click outside save anything unsaved, then close (`useSaveOnClose`). This is the builder's exception to M13.14's Discard Changes question: a spell's draft is kept, never thrown away. A refused save keeps the dialog open with the refusal shown. Closing the tab or reloading still asks the browser's own question, which no page can answer by saving.

### The `?new` values

The owner chose on 2026-10-27 that `?new` takes a value naming what it opens, and on 2026-10-28 replaced the first scheme (`?new=ingredient`, `?new=<slug>`, `?new=spell`) with one that names the coven inside the value. In the owner's words: "The Add Ingredient button shouldn't change the page when selecting the coven. new=ingredient should be consistently the method on every page." Asked how to carry the coven: "Do a combo in new. i.e. new=ingredient-arctic-aurora. Make it new=spell-arctic-aurora too." And for the admin pages: "Name it new=ingredient-compendium and change the covens to new=ingredient-coven-arctic-aurora".

| Address                        | Opens                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `?new=ingredient-coven-<slug>` | Add Ingredient for the coven with that slug, on every page in the shell, admin pages included |
| `?new=ingredient`              | Add Ingredient for the default coven                                                          |
| `?new` (no value)              | Off the admin pages, the same as `?new=ingredient`; on an admin page, that page's own add     |
| `?new=ingredient-compendium`   | The compendium's New Entry on `/admin/compendium`                                             |
| `?new=spell-<slug>`            | That coven's New Spell, over its grimoire; from any other page, a replace to that grimoire    |
| `?new=spell`                   | New Spell for the grimoire the page is on                                                     |

Every link and button writes the long form: Add Ingredient writes `ingredient-coven-<slug>` with `pushState`, so choosing a coven from its menu never leaves the page; choosing the compendium navigates to `/admin/compendium?new=ingredient-compendium`; New Spell writes `spell-<slug>`. The short forms are still read, so a link saved earlier still opens. The old `?new=<slug>` form is no longer read. The admin list pages other than the compendium still open their own add on a bare `?new` alone, and while any `?new` is present an admin list page holds its `?edit` back, so two dialogs never stack.

**The spell value has no `coven-` part.** The owner wrote `spell-<slug>`, and it was taken literally: a spell has no compendium counterpart, so there is nothing for a `coven-` part to tell apart. It parses as cleanly as the ingredient form, by its prefix.

**Why only `spell`, `ingredient` and `new` are reserved coven slugs.** A value that names a coven is a fixed prefix, `ingredient-coven-` or `spell-`, followed by the whole slug, so a slug's own hyphens are never split and the prefix decides what the value opens. `ingredient-compendium` does not start with `ingredient-coven-`, and a coven slugged `ingredient-compendium` would be written `ingredient-coven-ingredient-compendium`, so it collides with nothing. The one place a slug could be read as something else is a bare word, which is why `isReservedCovenSlug` (`src/lib/coven-path.ts`) still refuses `spell` and `ingredient`, as it already refused `new`. Reserving every slug that starts with `spell-` or `ingredient-` was the alternative, and was not chosen: it would refuse ordinary names such as Spell Circle and buy nothing the prefix does not already give. The creation service gives a coven named Spell the slug `spell-2`.

### Opening with no skeleton

New Spell's press writes `?new=spell-<slug>` with the browser's `history.pushState`, as Add Ingredient's does, and the dialog reads the address itself (`useSearchParams`) and draws the empty builder at once. Opened the other way, through the server, the modal first showed its loading skeleton, 518px tall, and then the form at 720px; the dialog is centred, so its top jumped up the screen as the form arrived. That was the owner's report of a dialog that "does a weird scrolling thing and jumps size". Opening a saved spell still goes through the server, since only the server can read the spell.

## A draft's visibility moves either way; a complete spell's only widens

**Decided:** the one-way visibility rule (DESIGN.md §5) binds a **complete** spell only. A draft may be shared and made private again, as often as its author likes. Once a spell is complete, `private → workspace` is allowed and `workspace → private` is refused with the explaining error, as before.

### Why

The old rule locked a spell the moment it was saved shared. Since M13.17 the builder autosaves, so a new spell is saved within seconds of the first edit, and a spell shared by default would be locked before its author had finished writing it. A draft is not yet relied on: the coven can read it, but the reason for the rule (others have built on it, hiding it retracts something) belongs to a finished spell.

### How the lock is read

The service reads the status the row holds **before** the write (`assertWidens`, `src/modules/grimoire/services/visibility-rule.ts`). The save that marks a shared draft complete is therefore allowed to name any visibility, and the next save is the first one the lock refuses. `setSpellVisibility` and `updateSpell` share that one check.

In the builder, a draft's Share With the Coven switch changes either way with no question (sharing a draft is reversible, so "it cannot be made private again" would be untrue). A complete private spell still asks before sharing, and a complete shared spell's switch is disabled with the explaining note.

### The alternative not taken

Lock on first share, as before, and fix the autosave problem by creating spells private. That keeps one rule for every spell, but a person could never share a draft with a coven to read and then change their mind, and every spell shared early would be stuck however unfinished.

## A spell's recipe is one ordered list of steps

**Decided:** a spell's recipe is one ordered list of steps in one table, `spell_steps`. Each step is an instruction (`body`), an ingredient laid in the jar, or both, read back in `position` order (story 80). The table was `spell_ingredients`, every row a layer. Migration `0083_spell-steps-expand` renames it, adds `position` and `body`, adds `spells.note`, and leaves a view named `spell_ingredients` for the deploy that is still running. M13.9 is the contract half.

### One table, not a table of instructions beside the layers

A recipe interleaves what you do with what goes in: "lay the salt, then speak the words, then the rosemary". Two tables would each hold half the order, and a reader would have to merge them back by a shared counter that neither table's unique index could guard. One table keeps one `position` per spell under one partial unique index, `spell_steps_spell_id_position_unique`, so two steps can never claim the same place.

The cost is that a row no longer always names an ingredient. MB.40's CHECK `spell_ingredients_ingredient_or_name`, `num_nonnulls(ingredient_id, name) = 1`, is replaced by two:

- `spell_steps_one_identity`, `num_nonnulls(ingredient_id, name) <= 1`: a step names at most one ingredient, linked or custom.
- `spell_steps_not_empty`, `num_nonnulls(ingredient_id, name, body) >= 1`: a step is never empty.

`spell_steps_amount_on_ingredient` refuses a `quantity`, `unit` or `note` on a step with no ingredient, because each of them describes an ingredient. `spell_steps_body_not_blank` keeps `body` non-blank like `name` and `form`.

### The rename happens now

Nothing above the schema reads the table yet: the repository and the seed are the only code that names it. Renaming it now changes those two and the tests. Renaming it after the services, the GraphQL types and the screens are built would change every one of them too. So the table, its indexes, CHECKs and foreign keys take the new name in `0083`, under MB.252's pattern for a table rename ([`mb.252-table-rename.md`](mb.252-table-rename.md)).

### The view comes after the new columns

`CREATE VIEW spell_ingredients AS SELECT * FROM spell_steps` fixes its column list when it is created. The view is created after the `ADD COLUMN`s, so it carries `position` and `body` too. The deploy before never names them, so this changes nothing for it, but the view and the table then have the same columns and a write through the view can never miss one. `tests/db/migrations/0083-spell-steps-expand.test.ts` reads the view's columns from `information_schema` and checks for `position`, `body` and `layer_order`.

### Two columns change name in two steps

Renaming a column breaks the deploy before, because it still names the old one. So:

- **`position` is added beside `layer_order`.** `0083` fills it from `layer_order`, and the code writes both, the same number, until M13.9. `position` is nullable until then, because the deploy before writes `layer_order` alone and a `NOT NULL` would refuse its inserts. `layer_order` keeps its `NOT NULL` and its own unique index meanwhile, so every live row still has a place and no two share one.
- **`spells.note` is added beside `spells.instructions`**, filled from it by `0083`, and written with it the same way.

The code reads `position` and `note`. The Drizzle schema declares the old columns too, as `layerOrder` and `instructions`, only so the code can write them.

### The drift test strips a pending name only when the code no longer declares it

`tests/db/schema-drift.test.ts` compares the migrated database with the Drizzle schema. `PENDING_DROPS` lists what is on its way out, and is empty when nothing is. The `spell_ingredients` view, `spell_steps.layer_order` and `spells.instructions` were listed there until migration `0089_drop-spell-steps-old-columns` dropped them. The test removes a pending name from the database side only when the code does not declare it. While the code still declares `layer_order` and `instructions`, both sides keep them and the test compares them like any other column. When a later change removes them from the schema before M13.9 drops them, the test strips them and stays green. Stripping them unconditionally would have made the test fail now, with each column present in the code and missing from the stripped database.

### What M13.9 must refill

The deploy before `0083` can write rows after the migration, during the rollout and after a rollback. Those rows hold `layer_order` and `instructions` and nothing in `position` or `note`, and a reorder from that deploy moves `layer_order` alone. So M13.9 refills `position` from `layer_order` wherever the two differ, not only where `position` is null, and refills `spells.note` from `instructions` the same way, before it makes `position` `NOT NULL` and drops the old columns and the view.

The backfill in `0083` is an `UPDATE` on every row, so the `set_updated_at` trigger moves `updated_at` on every step and every spell with instructions. Nothing reads `updated_at` on these tables yet.

## A working is the record of one making, in three tables

**Decided:** a spell is the recipe, and a working is the record of one time a coven made it. Three tables hold workings: `spell_workings`, `spell_working_participants` and `spell_working_deductions` (migration `0091_spell-workings.sql`). This task adds the tables only. The service is M13.5.

### The noun

A spell is the recipe and a working is one making of it. Before this task the docs said "a spell is a record of a working", which made the spell the record. The phrase is replaced everywhere it appeared, in the live docs, `.claude/rules/database.md`, a repository comment and test comments. The reason it was said, that what went into a spell's jar stays in it after an ingredient is deleted, still holds and is now worded as such.

### What the owner decided

A working is created as a draft and deducts nothing; completing it deducts. It names several participants: coven practitioners, observers included, plus typed names for anyone else. It carries one free-text `note` and its own `visibility`. A working is never wider than its spell, and the service enforces that, because a CHECK cannot read the parent row. The rest of the owner's table (units, shortfall, deleting) is the service's, M13.5.

### Why deductions and participants carry stamp columns only

`spell_working_deductions` is written once, at completion, and never edited. A deduction cannot be soft-deleted or restored, because deleting a complete working does not give stock back. It spreads `...auditStampColumns` (four stamps, no `deleted_at`). Participants spread the same. A participant row is hard-deleted when a participant is removed, and M13.5 decides how a list changes. Because neither table has a `deleted_at`, the participant unique indexes are plain, not partial, which CLAUDE.md rule 4 permits since the rule applies to tables that have one.

### A CHECK the entry did not name

`spell_workings_completed_at_with_status`: `(status = 'complete') = (completed_at IS NOT NULL)`. A complete working always says when it was completed and a draft never does. Without it the service is the only thing keeping the two columns in step. It costs nothing to read and rejects a row no code path should write.

### Other points taken while building

- The foreign key from `spell_working_deductions` to `inventory_items` is named by hand, because the generated name was past Postgres's 63-character limit and was truncated, which broke the schema-drift test.
- A working of a deleted spell is unreachable through `findManyInSpell`, which reads a table that has `spell_id` and `deleted_at` through the spell's filter. There is no cascade.
- The migration is expand-only, so `check:destructive-ddl` needs no sidecar.

## Long forms autosave, and edits of one row can conflict

**Decided:** the spell builder saves its draft by itself, and a save that lost a race to another editor is refused, not merged. The work is six tasks: M13.14 (leave warning on every long form), M13.15 (`spells.revision`, nullable draft title), M13.16 (the autosave module), M13.17 (the builder autosaves), M13.18 (edit conflicts), M13.19 (live refresh and presence). Story 81 is the new story.

### Autosave always, not a setting

A draft that lives only in an open tab is lost to a crash, a closed laptop or a dropped connection. A setting would leave most people on the unsafe default, and two paths (saved and unsaved) would each need testing. So the builder always saves: 3 seconds after the last edit, and at most 30 seconds after the first unsaved one. One save is in flight at a time, with one follow-up queued. A failed save retries after 2, 5 and 15 seconds. Meanwhile a copy of the draft sits in `localStorage` under `autosave:<entity>:<id|new>:<userId>`, and is cleared only after the server confirms.

### `revision`, not `version`

`spells.revision` is a counter that a trigger, `bump_revision()`, adds one to on every update. It exists only to detect a clash: a write names the revision it read, and `write.updateRevisioned(membership, table, id, expectedRevision, values)` refuses it with `StaleWrite` if the row has moved; a row the `Membership` proof cannot reach answers no row, never `StaleWrite`. The name `version` is kept free for v2's edit history, where a version is a saved snapshot a person can open. A counter that moves on every autosave is not that, and calling it `version` would make the two collide.

### A draft title may be empty

`spells.title` loses `NOT NULL`. An autosave can fire before anyone has typed a name, and a placeholder written into the column would be mistaken for a real title. The column is nullable, and a CHECK requires a title only when `status = 'complete'`. A blank draft title shows as "Untitled Spell". This is an expand step: loosening a constraint refuses nothing the deploy before it writes (rule 10).

### Cancel is removed; Save stays

With autosave, Cancel has nothing to cancel: the draft is already stored. Save stays, because NN/g says autosave does not replace an explicit action. It flushes the pending autosave at once and is disabled when there is nothing to save, as for every form.

### Polling only through `useLiveRow`

The app has no push channel and v1 does not get one. One hook, `useLiveRow`, may poll: every 10 seconds on a visible tab, with `staleTime` 10 seconds and refetch on window focus. It also reports who else has the row open, over a 2-minute presence window. Any other component that polls is a bug, so a guard can name the one allowed caller.

### Not built

- No merge of two people's edits; the later save sees the conflict and chooses.
- No edit history or restore (v2; `revision` is not it).
- No websockets, server-sent events or cursors.

## A new spell starts private

Decision (owner, 2026-10-28): "New spells shouldn't automatically be shared."

### The clash

The builder opened a new spell with Share With the Coven on. M13.17's autosave saves the spell
3 seconds after the first keystroke. Visibility only widens (DESIGN.md §5), so once that first save
had stored `workspace`, the switch shut and the spell could never be made private. A person could
only keep a new spell private by finding the switch in those 3 seconds.

### What changed

- The builder starts a new spell with `visibility: 'private'`. The switch is off and enabled.
- Turning it on asks "Share With the Coven?" and saves at once, as it does for any saved private spell.
- The service, the one-way rule and the `spells` column default (`workspace`) are unchanged. Every
  write sends `visibility`, so the column default is never what decides.

### Not taken

Letting a draft go back to private. It would change the widens-only invariant (a draft nobody has
read is the only case where narrowing costs nothing, but the service has no way to know that nobody
has read it). Starting private needs no change to the invariant.

## A custom, one-off spell ingredient is a row in `spell_ingredients`, not a table of its own

**Status:** decided; superseded in part by MB.110 (2026-09-30), which soft-deletes the table and keys it on a surrogate `id`

Story 57: a spell may call for something the workspace will never stock — a
pinch of dust from the garden path — without that thing being added to the
workspace's ingredients or its stock. M10.2 shipped `spell_ingredients` with
`ingredient_id NOT NULL` and a `(spell_id, ingredient_id)` primary key, so every
layer in a jar had to be an `ingredients` row, and a workspace-local row shows
up on the ingredients page and takes part in local-beats-compendium suppression.
This record is the shape chosen for the exception, and why it was taken now.

### Decided

**Columns on `spell_ingredients`.** `ingredient_id` becomes nullable and keeps
its foreign key; `name` and `form` are added as free text;
`CHECK (num_nonnulls(ingredient_id, name) = 1)` makes a row exactly one kind or
the other; `CHECK (ingredient_id IS NULL OR form IS NULL)` keeps `form` off a
linked row; both text columns are checked non-blank. The primary key moves to
`(spell_id, layer_order)` — the pair `(spell_id, ingredient_id)` no longer
exists on every row, and the layer is the one thing every row has. What that
key used to guarantee, one ingredient per jar, is now a partial unique index
over the linked rows; its mirror, one custom name per jar on `lower(name)`,
covers the custom rows. The table stays hard-deleted with the four stamps
(superseded by MB.110: it is soft-deleted, with the full six).

**One-off, not reusable.** A custom row belongs to one spell, shares its
visibility, and is never listed at workspace level. A _reusable_ custom
ingredient is already what a workspace-local `ingredients` row is — story 29's
one-field stub — so making this one reusable would have been a second way to
say the same thing, plus a flag to keep it off the ingredients page and out of
suppression, plus a leak: its name would live in a workspace-level list rather
than inside a possibly-private spell.

**Now, in Wave 4, not as a fast-follow.** The table is inert until Wave 13, so
the contract migration ran against zero rows, and every Wave 13 task adopts the
null-ingredient branch in its own PR rather than retrofitting it. The same task
after Wave 13 would have cost the same ~2h plus a retrofit across ten to twelve
files — service, mutations, Zod, builder, reorder, derived categories, the
out-of-stock pass, recipe and print views, the loader, every fixture that
builds a layer — and a breaking change to `SpellIngredient.ingredient`'s
nullability in the snapshot-tested SDL. Nullable from the first line, it is a
branch every consumer has always had.

### What makes this safe

- **The exclusive-or is a CHECK, not a convention.** `num_nonnulls` is the
  idiom §14 already blesses for the deferred notes model, and the schema test
  proves both refusals — neither and both — by `constraint_name`, beside the
  inserts that show why each could have succeeded.
- **Nothing lost its guarantee, and nothing gained a gap.** One ingredient per
  jar moved from the key to a partial index; one layer per depth moved from an
  index to the key; each is asserted by name in
  `spell-ingredients-schema.test.ts`, with the cross cases — a custom name at
  a linked row's depth, two custom rows at one depth — covered too.
- **Hard delete still holds, and for MB.34's own reason.** The deciding
  argument there was the `deleted_at IS NULL` a service joining _through_ the
  table must remember by hand, which is exactly how derived categories (M10.7)
  reach `ingredient_categories`. A custom row carries content, but content
  addressable only through its spell — unlike a folk name, which is addressed
  on its own and so keeps the six columns. **Superseded by MB.110:** M5.3 made
  a spell a recipe that keeps what went into its jar, so a removed layer is a tombstone, and what
  reads through the table does so by `existsIn`, which ANDs the layer's filter
  by construction.
- **The migration is expand-then-contract in one file, reordered by hand.**
  Columns, indexes and checks first; then the old key goes, the new key is
  added, `ingredient_id` is made nullable (the key had to go first — a key
  column cannot be nullable), and the redundant index is dropped last.
  `drizzle-kit migrate` applies the file in one transaction; the order
  documents intent. `DROP CONSTRAINT` and `DROP INDEX` carry rule 10's
  acknowledgement line — the first in the repo — and `DROP NOT NULL` widens.
- **The trigger sweep needs no edit.** `0016` already attaches
  `set_updated_at` to `spell_ingredients`, a key swap does not detach it, and
  `updated-at-trigger.test.ts` applies every migration, so it doubles as the
  proof that `0017` applies on top of `0016`.

### Rules this sets

- A layer is `{ ingredientId }` or `{ name, form? }`. MB.8's Zod schema holds
  the exclusive-or and rejects `form` beside `ingredientId`, so the CHECK is
  never what a user sees; M10.10 validates before it inserts.
- A custom row contributes nothing to derived categories (M10.7, M10.9):
  `ingredient_id IS NULL` is skipped, asserted by test.
- A custom row is never an `ingredients` row. It does not appear on the
  workspace's ingredients page, does not enter local-beats-compendium
  suppression, has no safety note (M10.18), and is neither held nor not held —
  M10.19 renders it as a third state, one-off, rather than folding it into
  either.
- A custom row's visibility is its spell's (M10.5). It has no scope of its
  own, exactly like a linked row.
- `SpellIngredient.ingredient` is nullable in the SDL from its first
  definition (DESIGN.md §7); `name` and `form` resolve from the linked
  ingredient when there is one.
- M1.23's demo scenario seeds one custom row beside linked ones, so Wave 13
  tests against a real row of each kind rather than a fixture it invents.

## Design review of the workspace ingredients page

The design review of a coven's Ingredients section: the list of cards, its
filters and empty states, the Edit Stock dialog, the Quick Look window, and the
entry page with its shelf of jars. It records what was changed, what was only
mocked, what the accessibility audit found, which repeated code was merged, and
the research each change rests on. The task is MB.121 in
[`tasks/mb.md`](../tasks/mb.md); the review method is
[`styling.md`](../styling.md), "Designing a section".

The owner answered the review's questions on 2026-10-23; each answer is written
where the question was, and listed in "The owner's answers", below. The
owner chose P1 on 2026-10-23, and **signed off the review as a whole on
2026-10-23**, after looking it over live, including the side column standing
outside the Details section. The design sync (`/design-sync`) is the owner's to
run, not an agent's. The work is committed on
`feature/mb.121-design-review-the-workspace-ingredients-page`.

### The owner's answers (2026-10-23)

| Question                                        | Answer                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Keep the focus-ring commit                      | Keep it                                                                          |
| Wrap Tab inside the Edit Stock dialog by script | No: keep the browser's own behaviour                                             |
| An observer's empty cupboard                    | Add "A practitioner or steward of this coven can add them." Built in this branch |
| The empty page announcing its state three times | Leave it; noted for the M9.1 story audit                                         |
| Remove the mocks                                | Yes: removed 2026-10-23                                                          |
| Proposal P1, the symbol on the shelf            | P1, the symbol                                                                   |
| Stock set apart more clearly                    | C plus A, 2026-10-23: Stock first, and a rule under every section heading        |

### What was changed

| Change                                                                                            | Kind                          | Can be dropped alone |
| ------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------- |
| The entry page's Stock section loses its `.panel` box                                             | Required by MB.121            | No                   |
| Stock is the first section, above Details, and the jump menu follows (option C)                   | Owner's answer                | Yes                  |
| Every section's h2 stands over a `$hairline` rule, `entry-heading-rule` (option A)                | Owner's answer                | Yes                  |
| The rule is the heading text's width plus 1rem, 0.25rem under the text                            | Owner's answer                | Yes                  |
| The side column stands beside the first section, dropped by `space(1)`                            | Owner's answer                | Yes                  |
| Icon buttons, the stock dialog's jar picks and the dialog's Close draw the shared focus ring      | Accessibility fix             | Yes                  |
| The amount text, the stock tip button and the Low and Out inks are shared (the DRY merges, below) | Repetition                    | No                   |
| Proposal P1: the shelf draws the card badge's Low or Out symbol before a jar's amount             | Proposal, chosen by the owner | Yes                  |
| Mocks of the options not built, as Storybook stories under `Proposals / MB.121`                   | Mocks, removed 2026-10-23     | Removed              |
| A viewer's empty cupboard says which roles can add                                                | Owner's answer                | No                   |

Behaviour is unchanged by all of them: no press, route, name or saved value
differs. The viewer's added line changes what an observer reads, nothing else.

### The Stock section without its panel

The Stock section on the entry page sat in a `.panel` box, the only section
there that did. The box is gone, because no other section is boxed and the
jar's shine is drawn in the card colour, so it faded on a card-coloured panel.
Without it, Stock looked like every other section: the same heading, the same
spacing, and the smallest content on the page (two jars about 160px wide),
between Details and Forms, which are both tall. The owner asked for a more
obvious way to set it apart, in a way the page's other sections can share.

**What sets it apart now** (the owner chose options C and A on 2026-10-23):

- **C, Stock comes first.** It is the first section, directly under the title
  block and above Details, at every width. The jump menu lists it first. Where
  an entry has no Stock section (the public compendium, or a compendium entry
  the coven does not hold) nothing else changes order. NN/g's eye-tracking
  work finds people read "usually across the upper part of the content area"
  and give the first lines more gazes than later ones.[^pernice]
- **A, a rule under every section heading.** Stock, Details, Forms and
  References each have a `$hairline` rule under their h2, from one mixin
  (`entry-heading-rule` in `_mixins.scss`). GOV.UK's section break is "a
  thematic break between sections of content", and can show "a separator
  line".[^govuksection] NN/g warns that boxes added out of caution "can result
  in busy, cluttered designs", and that whitespace and proximity are often
  enough; a rule is the lighter cue.[^harleyregion] The rule ends where its
  heading does, so on a tablet or wider it stops at the text column and never
  runs under Details' side column; the Forms heading spans the whole body, so its
  rule does too; References, since the owner's later call, keeps to the text column.
- **The rule is short** (owner, 2026-10-23). It is as wide as the heading's own
  text plus `space(4)` (1rem) past it, starting at the heading's left edge, and
  never wider than the column, so a long heading wraps and the rule keeps to the
  column. It sits `space(1)` (0.25rem) under the text. For Stock it follows the
  "Stock" h2 and not the head row, so the Edit Stock button stays where it was.
  Measured at 1280, 1024, 768 and 375px: each rule is the text's width plus 16px.
- **The side column stands beside the first section** (owner, 2026-10-23). The
  side column (Correspondences, Folk Names, Categories, Substitutes, and "In the
  Compendium" when shown) lines up with the top section, Stock if shown and
  Details if not. The body is now a grid from the tablet width up; the side column
  spans both rows in column 2, and row 2 is `1fr` so a long side column does not
  push Stock or Details. To do this the side `div` moved out of the Details
  `<section>` to stand after it in the body. **Cost:** the Details region no longer
  contains the side blocks; they are plain blocks in the body, which screen readers
  read straight after Details. The gap between Details and the side column on a
  phone is `space(6)` (the body's gap), where it was `space(4)`. On a phone, and
  below the tablet width generally (768px included), the page is one column: Stock,
  Details, the side column, then the forms.
- **A small drop** (owner, 2026-10-23, after seeing it live). The side column has
  `margin-block-start: space(1)`, 0.25rem (4px), and the skeleton's side part takes
  the same value through `entry-body`. Measured in Chromium, text bottom to text
  bottom of the side column's first heading against the first section's h2, the
  h2's text bottom is 2.0px lower at 1280 and at 1024px, with Stock ("In the
  Compendium" first, and Correspondences first) and without Stock (Details' h2
  against Correspondences). With no drop it was 6.0px lower, so 0.25rem leaves 2px
  of the 6px; the owner chose it.

Options not chosen: a tinted full-bleed band (it either fades the jar's shine
or needs a new token, and it would be one different section again), and a
leading icon in every heading (it adds a mark but little weight). NN/g also
warns that full-width bordered sections can create "false floors" that make
people stop scrolling.[^harleyregion] The reasons given here are the design
judgement of the person who built it, not findings of those sources.

### Proposal P1: a symbol beside a Low or Out amount

**The problem.** On the shelf, a Low jar and an Out jar were told from a full
one chiefly by colour: an amber or red jar, and its amount in the same colour.
The jar's shape differs a little (a dashed mark at the threshold, an empty
outline for Out), but at the shelf's size the difference is a thin line. A
person who cannot tell amber or red from the ink beside it reads three plain
jars. The capture `audit/zoom-shelf-light.png` (in the review's screenshots)
shows it.

WCAG's success criterion 1.4.1 asks that colour is "not used as the only visual
means of conveying information", and its advice is to "use information in
addition to color, such as shape or text".[^wcag141] GOV.UK's Tag component
says the same of status labels: "Do not use colour alone".[^govuktag]

**The options.**

| Option                 | What it draws                                              | Told without colour?                        |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| Before (as it was)     | Amber or red jar and amount                                | Barely: a thin dashed mark or outline       |
| **P1, symbol (built)** | The card badge's own Low or Out drawing, before the amount | Yes: a shape, the one the card already uses |
| P1b, word              | "Low" or "Out" written under the amount                    | Yes: a word                                 |
| P1c, heavier mark      | The threshold mark and outline drawn thicker               | Partly: still a line, still mostly colour   |

**I recommend P1.** The symbol is the one the ingredient card's `StockBadge`
already draws, so a person who has learned it on a card reads it on the shelf
with nothing new to learn. Its name is spoken already, since the amount button
is named "5 g, Low Stock". Harley advises that "icon labels should be visible
at all times";[^harley] on the shelf the visible label is the amount beside the
symbol, and the tip names the state in words. P1b would be clearer to a newcomer
but adds a line of text under every flagged jar. P1c does not meet 1.4.1 by
itself.

**The owner's answer (2026-10-23): P1, the symbol.** The owner first asked for
a mock at phone width, then chose P1. This replaces the owner's call of
2026-10-21, which ruled out "an extra word and an icon" on the shelf: the
icon is now in, and the word (P1b) stays out.

**The mocks were removed on 2026-10-23, at the owner's word.** The Storybook
stories under `Proposals / MB.121` (`.storybook/mb121-proposals.stories.tsx`
and its stylesheet) showed the shelf before P1, P1, P1b, P1c and an observer's
empty cupboard. They are deleted, with `$mb121-mock-mark-stroke`, the token
only P1c used. P1 is shown by the real `JarShelf`, `StockBadge` and
`IngredientEntry` stories, and the viewer's line by the `CovenCards` story
`Empty For A Viewer`. The removed options can still be seen in two places:

- the phone-width mock the owner decided from,
  <https://claude.ai/artifact/81JdeTVeFUT2Vk93TYVaVT>, a private page on
  claude.ai;
- the review's screenshots of the mocks, the `proposals-mb-121--*.png` files
  in both themes at 1280px and 375px, in the review's screenshot folder
  `mb.121/proposals/`, listed in that folder's `index.md`. The folder sits
  in the reviewing session's scratch space, outside the repository.

### The accessibility audit

#### How it was run

- **Automated checks:** axe, through `@axe-core/playwright`, on every page and
  dialog of the section: the list, the filters, the Edit Stock dialog (opened,
  and with an unsaved change), Quick Look, the edit dialog, the delete
  question, the entry page (a compendium entry and the coven's own), the empty
  cupboard and its Add dialog, a search with no match, and an observer's list and
  entry page. Each in the light and the dark theme, at 1280px and 375px wide:
  56 runs.
- **Sideways scroll:** the same 56 runs measured the page's scroll width
  against its client width.
- **Keyboard:** a Tab walk through the list, the Edit Stock dialog (before
  and after an unsaved change) and the entry page, recording each stop, its
  name and whether it drew a ring.
- **Screen reader:** **not a run with a real screen reader.** It was a reading
  of the accessibility tree, the names, roles, states and descriptions a
  screen reader is given, through Playwright's `ariaSnapshot()` and the
  accessible-description queries. What a given screen reader then speaks
  (VoiceOver, NVDA, JAWS) was not heard.

#### What it found

- **axe:** no violations in any of the 56 runs, contrast included. Contrast at
  4.5:1 for text holds in both themes.
- **Sideways scroll:** none in any run, at 375px included.
- **Focus rings:** the icon buttons, the stock dialog's jar picks and the
  dialog's Close drew Chromium's own default ring, since nothing set one.
  Fixed: each now draws the shared focus ring
  ([`styling.md`](../styling.md), "The focus ring"). Icon links keep the
  accent ring every link has. **The owner's answer (2026-10-23): keep it.**
  Every other control already draws the shared ring.
- **Names a screen reader can tell apart:** every jar button is named for the
  ingredient, its formal name and the form, "Edit Stock, Rosemary, Salvia
  rosmarinus, Herb". A flagged amount is its own button, named for the
  amount and the state, "5 g, Low Stock", and described by its threshold,
  "Low Stock at 10 g or less". An Out amount, "0 ml, Out of Stock", has no
  description, by design, since its name says all there is.
- **The edited jar:** in the Edit Stock dialog, the chosen jar has the green
  fill and `aria-current="true"`, and a jar with an unsaved change reads
  "Herb, Edited, 12 g", with "Edited" shown in italics beside it. Flaherty's
  guidance puts an indicator beside the item it describes, which this
  does.[^flaherty]
- **The shelf by keyboard:** each jar is one Tab stop, and a flagged amount is
  the next; Enter or Space opens the dialog or the tip, as on any button.
  Nothing on the shelf needs a pointer. A jar's ring is drawn on its stretched
  `::after`, inside the cell, so the Tab walk's reading of the button's own
  outline said "no ring" there; the captures in `audit/focus/` show the ring.
- **The empty page speaks its state three times:** a hidden count "No
  ingredients", the search sentence's status "No ingredients", and the region
  "No Ingredients" holding "There are no ingredients here yet." and the Add
  Ingredient button. **The owner's answer (2026-10-23): leave it**, and note
  it for the M9.1 story audit, the audit of the story suite still owed. The
  three come from three components, each correct alone, so the audit is where
  to judge whether one should go.

#### The dialog and the Tab key

The Edit Stock dialog is a native `<dialog>` opened with `showModal()`. Tab past
its last control goes out to the browser's own controls (the address bar) and
back in, rather than wrapping to the dialog's first control. The ARIA Authoring
Practices Guide's dialog pattern says Tab should wrap inside the
dialog.[^apg] Lawson records the disagreement: some
accessibility experts side with the guide, while Scott O'Hara calls the native
behaviour "good behavior, not a bug".[^lawson] It is not a keyboard trap under WCAG 2.1.2, since focus can
always leave and return.

**The owner's answer (2026-10-23): keep the browser's own behaviour.** The page behind is inert, so focus never reaches it, and
wrapping by hand is the trap code the Modal deliberately does without
([`modal.md`](../components/modal.md), "Contracts").

#### A viewer's empty cupboard

An observer, who may add nothing, sees only "There are no ingredients here yet."
Kaplan's first guideline for empty states is to "tell the user what could be
displayed, and how to populate the area".[^kaplan] An observer cannot populate it,
but can be told who can. A mock, since removed, added "A practitioner or steward of
this coven can add them."

**The owner's answer (2026-10-23): add the line.** It tells an observer the empty
cupboard is not a fault and who to ask. Built: `CovenCards/empty.tsx` draws it
in the `No Ingredients` region in place of the Add Ingredient button when the
viewer cannot add, and the `Empty For A Viewer` story shows it
([`coven-cards.md`](../components/coven-cards.md), "The empty and no-match
states"). The test checks that an observer's region names the roles that can add
and a member's does not: the roles named are the only thing that tells the
state apart, which is the exception in
[`layer-ownership.md`](../testing/layer-ownership.md), "What a test may
assert", rule 2.

#### Tags that are buttons

GOV.UK's Tag says "Do not make a tag interactive".[^govuktag] The `StockBadge`
and the shelf's flagged amount are buttons, since each opens a tip. That was
the owner's earlier call, so it is recorded here and not changed.

### The DRY merges

Three things were written more than once across `StockBadge`, `JarShelf`,
`JarLines` and `StockDialog`. Each now has one home.

| Shared now                                                     | Home                        | Used by                               |
| -------------------------------------------------------------- | --------------------------- | ------------------------------------- |
| `amountText(quantity, unit)`, "250 g" or "Unmeasured"          | `StockBadge/stock-words.ts` | `JarLines`, `StockDialog`, `JarShelf` |
| `StockTip`, the button that opens a Low or Out tip             | `StockBadge/index.tsx`      | `StockBadge`, the shelf's `AmountTip` |
| `$stock-low-ink` and `$stock-out-ink`, the Low and Out colours | `_variables.scss`           | `StockBadge`, `JarShelf`              |

P1 then shared a fourth, `StockIcon`, the badge's drawing, with the shelf.

### Filters

The filters keep the search sentence ("No ingredients, matching Knitbone") as
their summary of what is applied. Baymard advises showing the applied
filters together in one overview, and finds that 28% of the sites it reviewed do
not;[^baymard] the sentence is that overview. No change.

### The acceptance criteria

| Criterion                                                                 | How it is met                                                                                                                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A jar being edited reads differently, and an unsaved change shows         | The chosen jar's fill and `aria-current`; "Edited" beside a changed jar                                                                                   |
| The empty state says what to do next                                      | "There are no ingredients here yet." with the Add Ingredient button; an observer is told which roles can add                                              |
| The Stock section has no `.panel`, and the record says what sets it apart | Removed; it is the first section and every section's h2 has a short hairline rule, with the side column beside it ("The Stock section without its panel") |
| The DRY merges are listed                                                 | "The DRY merges", above                                                                                                                                   |
| Each jar and amount button has a distinct name and description            | "Names a screen reader can tell apart", above                                                                                                             |
| The shelf works by keyboard alone                                         | "The shelf by keyboard", above                                                                                                                            |
| Low and Out are never shown by colour alone                               | In words to a screen reader; by sight, the symbol before the amount (P1)                                                                                  |
| Contrast holds at 4.5:1, and nothing scrolls sideways at 375px            | axe in 56 runs, both themes, 1280px and 375px                                                                                                             |
| Each change names its source in Chicago form                              | The notes below                                                                                                                                           |

### Defects to mint

None found that needs a task of its own. The focus rings were under an hour
and are fixed in this branch.

## Design review: the grimoire

**Status:** decided and built; the owner has run no full test suite yet (Q0) and runs `/design-sync` at the end

This record wins where the two differ.

### 1. Context

MB.123 reviews the grimoire as built: the card list, the spell builder with its step editor, the Record a Working dialog, and the recipe page with its print layout ([`tasks/mb.md`](../tasks/mb.md), MB.123). The review ran in two stages. First, read-only Opus lanes audited the list, the builder, the recipe page and the whole site's shared pieces, researched published guidance on 14 topics, and photographed 188 screens in an isolated database. Then build lanes, one per area, made the changes in their own git worktrees, and the main session merged each lane's head into the review branch `feature/mb.123-design-review-the-grimoire`.

The owner chose per decision on a private sign-off page (Q0 and D1 to D42), not in a chat thread. Where the owner answered a decision twice, the later answer is the one recorded here. A separate agent updated the Storybook stories; the owner runs `/design-sync`.

Sources are numbered notes in section 6. A decision with no note has "no external source; owner's call".

### 2. Decisions

**Q0. Run the full test suites at the end?** Owner: option c, not yet. The owner then said to run individual tests only until told otherwise. Built: lanes ran only the Vitest files and Playwright specs they touched, once each. No full suite (`test:coverage`, `test:stories`, `e2e`) has run on this branch. No external source; owner's call.

**D1. Two solid green buttons on the grimoire page: keep both?** Owner: "Why is this an issue now? This happens elsewhere too", then "leave it". Not built. The admin compendium also has green add buttons, so this belongs to the whole-site review (MB.124). No external source; owner's call.

**D2. How much should a spell card show?** Owner: cut the intent clamp and the foot line down, but keep the Draft badge. Built: the intent is clamped to three lines, and the foot reads "Edited 5 minutes ago · Made 3 times", with "Made once" or "Made N times" in sentence case. The Draft badge is unchanged. Sources: [1], [3].

**D3. Cauldron and jar icons: one colour or two?** Owner: option b, keep both green. Not built. No external source; owner's call.

**D4. The verbs New, Add and Create: unify them?** Owner: option c, keep as they are. Not built. No external source; owner's call.

**D5. Card hover.** Owner: option a. Built: every burn value is a `$burn-*` token at the end of `_variables.scss`, and the four hover animations run three rounds and stop (`forwards`). Test: `tests/components/SpellCard/smoulder.test.ts`. Not built: `SpellPreview`'s own animations still run `infinite`. Source: [2].

**D6. Plural filter names.** Owner: option a. Built: "Moon Phases", "Days of the Week", "Coven Members". `FacetCombobox/typeahead.tsx` no longer passes a pluralised noun. Sources: [18], [19].

**D7. Load the Record a Working data when the dialog opens?** Owner: option a. Built: `SpellCard/record-working.tsx` runs one `RecordWorkingSetup` query on open, through a new GraphQL field `Query.workspace(id: ID!): Workspace!` backed by the `workspaceById` service (`src/modules/coven/services/workspace-by-id.ts`). Limit: the dialog reads only the first 100 members. No external source; owner's call.

**D8. Save footers.** Owner: option a, and Add Ingredient loses its Cancel button. Built: "Save Stock" and "Save Working"; no Cancel on the ingredient form, the spell builder or Annotate. Cancel stays on Record a Working and Edit Stock. The recovery Keep button and the conflict Reload Latest button are small outline buttons. Source: [14].

**D9. Confirm questions: bold name, no quotes?** Owner: option a. Built: `DeleteSpellWords` (exported from `SpellRecipe/delete-spell.tsx`) for the grimoire, and the same shape in the Edit Ingredient delete question. Not built: the admin group forms (`GroupForm`, `GroupedValueForm`) still quote names. Source: [5].

**D10. Hide the Category Match panel when it is empty?** Owner: option b, keep the sentence. Not built. No external source; owner's call.

**D11. Where does the visibility switch live?** Owner: option b, the builder footer beside Mark Complete, labelled "Shared". Built: `VISIBILITY_LABELS.workspace` is "Shared"; `VisibilitySwitch` gained `label` and `brief` props. Source: [11].

**D12. Mark Complete on a shared draft asks first?** Owner: option a. Built: the question appears before a shared draft is completed, because completing locks it from going private. Source: [5], [6].

**D13. Are the section names final?** Owner: option a. Not built. No external source; owner's call.

**D14. Name of the side column.** Owner: option b, "The Cupboard". Built. The first recipe-lane brief wrongly said "no change"; the lane built it after the correction. No external source; owner's call.

**D15. The inventory word.** Owner: option a. Built: "In the Cupboard". Not changed: the wording in `AddIcon/` and `IngredientEntry/` ("Add to My Ingredients", "Your Cupboard"). No external source; owner's call.

**D16. Record a Working buttons and the row bin.** Owner: option c, then revised: keep both buttons and remove the row bin. Built: Delete Working is in the Edit Working dialog only. Sources: [7], [8].

**D17. Quick Look eye on the side column only?** Owner: option a. Built. The spell Quick Look modal keeps its step eye, since it has no side column. Source: [4].

**D18. Bare verbs in menus.** Owner: option a. Built: Duplicate, Print and Delete; the dialog is titled "Delete Spell"; the completion dialog title is "Complete Working". Sources: [9], [10].

**D19. Spell Quick Look head.** Owner: as now, plus badges. Built: Draft and Private badges through `SpellMarks`. D37 then removed the head's bin, so the head holds Edit only. Sources: [12], [13].

**D20. Warning and note placement.** Owner: option a. Built. Sources: [15], [16].

**D21. Words of the completion step.** Owner: option a. Built: "needs 3 g · have none · short by 3 g", and buttons "Mark Complete" and "Keep as Draft". A shortfall is told in words, not by colour alone. Sources: [17], [20].

**D22. "Steps", not "Instructions".** Owner: option a. Built. No external source; owner's call.

**D23. Printed head.** Owner: option a. Built: badges in the head, no "Edited" line. Test: `tests/e2e/spell-print.spec.ts`. Source: [21].

**D24. Phone jump menu after the intent.** Owner: option a. Built with `display: contents` and `order`. Left open: the menu is visually after the intent but still first in DOM order, so keyboard order differs from visual order. Fixing it needs a restructure or rendering the menu twice. No external source; owner's call.

**D25. Decorative drawings.** The owner first asked to see what it would look like. Built as an experiment with 16 screenshots. The owner then said: change nothing, look later, no new task. It stays as built (commit fd7550f2d) and is left for the owner to review. No external source; owner's call.

**D26. Label "Taken From the Jars".** Owner: option a. Built. No external source; owner's call.

**D27. Page heads.** Owner: option a. Public pages keep an eyebrow and a lede; app lists stay plain; all are drawn by `PageHeader`. Built: 13 files converted and dead selectors removed. A guard fails any `<h1` in `src/**/*.tsx` (section 3). No external source; owner's call.

**D28. Run knip in CI?** Owner: option a, non-blocking, with a comment. Built: knip 6.44.0 (knip 5 needs TypeScript below 7 and the repo is on 7.0.2), `knip.json`, the script `lint:unused`, and a CI leg "Unused Code (Non-Blocking)" (section 3). It reported 78 findings; clearing them is not part of D28. Not proved in CI, because no PR exists yet. No external source; owner's call.

**D29. `CovenSwitchTargets` has no story.** Owner: option a. Built: it is named as the one component without a story in `.claude/rules/components.md` and `claude-docs/workshop.md`. No external source; owner's call.

**D30. Empty Spells tab line for an observer.** Owner: option a. Built, and the same for the Drafts tab. Source: [22].

**D31. Step control names.** Owner: option a, keep. Not built. No external source; owner's call.

**D32. Open-step badges.** The owner first said to keep both badges, then chose option a: one badge per row, Toxic wins, the note beneath. Built through `SafetyMark`. Sources: [17], [12].

**D33. "See Entry".** Owner: option a. Built. Source: [23].

**D34. Icon strokes at 24 and 32 units.** Owner: option b, keep. Not built. No external source; owner's call.

**D35. The Complete flask icon.** Owner: option b, stroke 1.5. Built. Source: [23].

**D36. DateField disabled opacity.** Owner: option a. Built: the token `$opacity-disabled`, 0.55. Raw rems elsewhere in `DateField` are left as they were. No external source; owner's call.

**D37. Delete on cards and Quick Look.** Owner: option a. Built: no bin or Delete on a card or a Quick Look where an edit dialog holds it. A More menu that already holds other choices may still list Delete or Remove. Story 25 now deletes through the Edit Ingredient dialog. `menu-button.md` and M9.10 in `tasks/m9.md` were amended. Sources: [7], [8].

**D38. Coven-creation Revoke.** Owner: option b, only in the user modal. Built. Source: [8].

**D39. Removing a sign-in method.** Owner: option a, it asks first. Built. Source: [5].

**D40. Row Remove and Revoke.** Owner: option a, drawn plain; the confirm keeps `btn--destructive`. Built, plus the member Remove column made neutral and the user modal's Revoke made plain. Sources: [8], [5].

**D41. Impersonate.** Made plain first (4689e3ea1), then the owner chose red again and the change was reverted (064c7aba3). Built: the rule gained a high-risk clause (section 3). Source: [8].

**D42. Pause Keeper Changes.** Owner: stays red. Not built. Source: [8].

#### Rule-driven changes (no owner question)

These followed from rules already in force.

- `readableVariantParent` deleted. The docs were wrong: M12.24 had replaced its caller.
- Dead types and `@babel/parser` removed from the removal list.
- `ModalButton` takes `ref` and `onOpen`.
- The `Skeleton` `line` shape honours `count`.
- The wide dialog size removed.
- The axe check moved to Playwright.
- Line icons drawn at stroke 1.5.
- Stylelint token rules (section 3).
- A sub-hour fix, named without an `MB` id: the coven Overview now lists Grimoire.
- The card's last-edit tip can be hovered (WCAG 1.4.13).
- `tests/db/graphql-query-scopes.test.ts` and `graphql-workspace-ids.test.ts` probe six grimoire fields.

### 3. Rules changed

- **Destructive controls.** `.claude/rules/components.md`, section "Destructive controls": Delete and Remove live in the edit dialog, not on a card (a lone bin is the carve-out); a row's Remove or Revoke is drawn plain (`btn btn--quiet btn--small`) and the red belongs to the confirm; red also marks a high-risk control that destroys nothing, and only two exist: Impersonate (row, user modal, confirm) and Pause Keeper Changes (Pause, Resume, confirm). The same clause is in `claude-docs/styling.md`. The `CovenSwitchTargets` story exemption is in the same file.
- **Page heads.** `claude-docs/styling.md`, "Designing a section", and `claude-docs/components/page-header.md`. The guard is `tests/guards/page-heads.test.ts`; its one named exemption is the hidden "Loading" heading in `SectionBody/index.tsx` and `AppShell/main-body.tsx`.
- **Stylelint.** `.stylelintrc.json` gained `declaration-property-value-allowed-list` (font-family, font, font-size, z-index) and `declaration-property-value-disallowed-list` (number-first colour functions). `_variables.scss` is cleared. Docs: `claude-docs/styling.md` and `claude-docs/commands.md`.
- **knip in CI.** `.github/workflows/checks.yml` has an `unused` leg, labelled "Unused Code (Non-Blocking)", that comments on the PR (`pr-comment`, minimize mode) and uses `continue-on-error`. `checks / unused` must never be a required check. Docs: `claude-docs/commands.md` and `claude-docs/ci/reusable-checks.md`. The lint filter in `pr-gate.yml` now includes `knip.json`.

### 4. Not built, and why

- D1, D3, D4, D10, D13, D31, D34, D42: the owner chose to keep what exists.
- D25: the owner will look later.
- `SpellPreview` animations still run `infinite`, and it passes raw rim values to `card.ember-rim()`.
- The builder's discard question names no thing.
- The admin group forms still quote names (D9).
- Low-priority labels from the sweep (S13).
- "Add to My Ingredients" and "Your Cupboard" in `AddIcon/` and `IngredientEntry/` (D15).
- The builder's inventory eye is 21px.
- Raw `1.5rem` in the `SpellPreview` glow and `DateField`.
- knip's 78 findings.

#### Built after the review proper, on 2026-10-30

The owner asked for three findings to be fixed in the review rather than filed.

- **The recipe page's reading order matches its phone layout.** The On This Page menu is rendered after the intent and category chips, and The Cupboard side column before Workings, so a keyboard and a screen reader meet them in the order a sighted reader sees them (WCAG 2.2 SC 2.4.3). From a tablet up the grid places them by explicit row instead of the `order` rules that used to move them. Two Playwright tests at 375px prove the Tab order, in `tests/e2e/spell-recipe-layout.spec.ts`.
- **The Record a Working participant box searches the server.** `Workspace.members` takes an optional `query`, narrowed by name in SQL under the membership check, and the box asks `/api/graphql` as the user types from the card and from the recipe page alike, so no roster is fetched up front and no cap exists. An empty box suggests nobody until text is typed.
- **Contents-list links are drawn in body ink** on the admin and coven overviews whether or not visited, so the two pages read the same regardless of browser history.

### 5. Follow-ups

The owner chose on 2026-10-30 to build the two stylesheet findings inside this review rather than mint tasks for them.

- **One shared `ConfirmDialog`** for the five hand-written confirm modals (R39 and S30): not a task of its own. MB.124 already owns one shared row of confirm and safe buttons, and its entry in `tasks/mb.md` now names the five dialogs.
- **Split the builder panels' styles** (R44): built. Category Match's and In the Cupboard's rules moved unchanged into `src/components/SpellBuilder/panels.scss`, which the builder's stylesheet and `SpellRecipe/aside.tsx` both import; the aside no longer imports the builder's whole stylesheet. The rendered CSS was compared rule by rule before and after and is the same set. The recipe page still loads the builder's CSS through the Edit dialog it mounts, so the change removes a wrong import and saves that page no bytes.
- **One mixin for the Recipe Card's step styles** (R47): withdrawn. The audit's premise did not hold: the step rules exist once, in `SpellRecipe/index.scss`; `_recipe-columns.scss` and `SpellPreview/index.scss` lay out the steps section and have never held a step-row rule; the preview renders `SpellRecipeBody`, which imports that stylesheet, so nothing can drift. The only other step rule is the paper font size in `_print.scss`, which is deliberate. `spell-preview.md` now says so.
- **Left as found, for the owner:** a dead `@container spell-column` rule for `.spell-inventory .jar-line__name` in `panels.scss` (no ancestor on the recipe page is that container, and the builder no longer renders In the Cupboard); knip's 78 findings; `DateField`'s raw rems. None is minted.

Board syncs owed: MB.123 (estimate and entry) and M9.10 (amended by D37).

## A spell may lay one form in several steps

No task id: the change rides in PR #1308 (the spell builder's step list) at the owner's request.

### The rule before

A spell held each form once. `spell_steps_spell_id_variant_id_unique`, a partial unique index on `(spell_id, variant_id)` over live rows, enforced it (MB.217 moved it from the ingredient to the form). The shared Zod check `distinctSteps` refused a repeated `variantId` with the same message, and the builder's picker listed a form already in the jar as "Already in the jar" and disabled it.

### The owner's call

2026-10-28: "You should be able to select an ingredient multiple times for different steps in the jar." The owner asked for it in this PR, not as a separate task.

### Why

A working can use the same form at two points of the recipe: some salt in the first step, more at the end. One row per form forced the cook to merge them into one step and lose the order.

### What changed

- **Index.** Migration `0087_spell-steps-repeat-forms.sql` drops the index. The custom-name index stays: a one-off name is still once per jar. `position` and `layer_order` stay unique per spell.
- **Zod.** `distinctSteps` (`src/modules/grimoire/validation/spell.ts`) no longer refuses a repeated `variantId`.
- **Service.** `writeRecipe` moves a step aside only when it changes to or from a custom name. `lockStepsOfVariants` and `moveSteps` needed no change.
- **Picker.** A form already in the jar is pickable again. A one-off name already in the jar is still refused.
- **Supply.** Coven Inventory judges a form on the sum of what all its steps need, converted through `unitConvert`. If any step cannot convert, each line of that form reads Units Differ. Each step keeps its own line.
- **Docs.** DESIGN.md §5 and the decisions table, `db/grimoire.md`, `db/demo-scenario.md` and `components/spell-builder.md`.

### Departure from rule 10

CLAUDE.md rule 10 says an index drop is two PRs, each its own task: remove the code that relies on it, then drop it. Here the code and the drop are one PR, at the owner's instruction. This is safe because dropping a uniqueness rule cannot break a deploy still running: the old code only ever writes sets of steps that satisfy the stricter rule. The sidecar `0087_spell-steps-repeat-forms.ack.md` records this.

## The step note is retired (PR #1308)

**Decided by the owner, 2026-10-28:** "Delete note and keep body. Have it replace note in the form."

### What changed

`spell_steps.note`, the short per-ingredient line from before M13.1, is retired. `spell_steps.body` (the Instruction field) is the one text on a step. The builder already showed the Instruction field on a step with an ingredient, so the form gained nothing: it stopped carrying `note` through.

- Migration `0088_spell-steps-note-into-body` copies each live step's note into its body: the note alone becomes the body, a body alone stays, and both become `body`, a blank line, `note`. A removed step is left as it was. The notes themselves stay in the column.
- The same migration rewrites the CHECK `spell_steps_amount_on_ingredient` without `note` (DROP CONSTRAINT and ADD CONSTRAINT, acknowledged in `0088_spell-steps-note-into-body.ack.md`).
- The GraphQL `SpellStep` and `SpellStepInput` types, the Zod schema, the recipe service, the builder, the seeds and the tests no longer name it. A client that still sends `note` has it ignored.
- The Drizzle column stays declared, commented as retired.

### What is owed

Rule 10 asks for a column drop in its own PR. Migration `0089_drop-spell-steps-old-columns` drops `spell_steps.note`, with `layer_order` and `spells.instructions`. The column is gone from the database and the schema, and `PENDING_DROPS` in `tests/db/schema-drift.test.ts` is empty.

`spells.note`, the spell-level note, is a different field and stays.

## Wave 13 review: workings, editing and deleting spells

**Status:** decided. Live home: `claude-docs/design/` (spell and working sections) and `src/modules/grimoire/`.

### Decision

- **Story numbers 65–69 are taken** by earlier bug-report and sign-in tasks, and stories 67 and 68 had no text anywhere. The grimoire workings stories are renumbered to 76–80 (record a working, step units, complete and deduct, workings on the recipe page and the count, steps). Each owning task writes its story's one-line text, the `story-sections.ts` row (`'Coven - Spells - Workings'`) and the count statements in `CLAUDE.md`, `claude-docs/testing/acceptance.md` and `claude-docs/ci/reusable-checks.md`. `tests/guards/story-sections.test.ts` fails on an unmapped story.
- **Editing a saved spell is its own task**: `/coven/[slug]/grimoire/[id]/edit` reusing the spell builder, an Edit control on the recipe page for practitioners and stewards and never observers, and `updateSpell` in the data-access list. (A complete spell is later refused by `updateSpell` and edited through a draft copy: `CLAUDE.md`, "Domain invariants".)
- **Deleting a spell is its own task**: a service under `spell: ['delete']`, a soft delete that carries the spell's steps and workings with it, a mutation, and a Delete control on the recipe page that follows the existing destructive pattern (`.btn--destructive`, `ConfirmQuestion`).
- **A working pins the revision it was made from**, so an existing working keeps its record and deductions. No new working can be recorded until the spell is complete, with an explaining error.
- **The working permission is its own statement.** `access-control.ts` gains `working` (`read create update delete` for practitioner and steward, `read` for observer), so observers write nothing and the check reads as what it is.

### Why

A permission is a per-role statement, never a rank. Reusing `spell: ['update']` for recording a working would read as editing the recipe, which a working is not. Folding delete into the edit task would break one task per PR.

### Rules out

- Reusing `spell: ['update']` for workings.
- Refusing a reopen merely because a working exists.
- Moving the bug-report and sign-in stories instead of renumbering the new ones.
