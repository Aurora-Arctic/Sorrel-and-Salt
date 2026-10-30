# SpellBuilder

`src/components/SpellBuilder/` is the form that writes a spell's own fields
(M10.12, story 47): its title, intent, jar description, seal wax colour, moon phase,
day of the week and note, the categories it is assigned (M10.14, story 48),
and its jar of ingredients (M10.15, stories 49, 50, 57 and 77). It is a client component, drawn in a modal
over the grimoire's list, at the default column and laid out as Add Ingredient is (`SpellDialog`, `spell-dialog.tsx`; the owner's call,
2026-10-27, [`design-decisions/m10.12-spell-builder-modal.md`](../design-decisions/m10.12-spell-builder-modal.md)).
The address opens it, as it opens Add Ingredient: `?new=spell-<slug>` draws it empty,
reached from New Spell at the Grimoire's heading, which only an owner or a
member is shown, and `?edit=<id>` draws it with a saved spell, reached from a
spell card's pencil, the recipe page's Edit (M13.10, where the dialog opens over the recipe page and closes back to it) and Quick Look's Edit (M13.21). Only a role that may update a spell is offered either control, and a viewer's `?edit` opens nothing; on the recipe page it opens only when it names that page's own spell. There is no page of its
own. `?new=spell` is the same for the grimoire the page is on, and `?new=spell-<slug>`
on any other page is sent to that coven's grimoire with a replace
(`NewSpellElsewhere`; the owner's call, 2026-10-28). New Spell's press writes
`?new=spell-<slug>` in the browser, with no server
request, and the dialog draws the empty builder from the address itself, so
it opens at its full size at once, with no skeleton before it
([`modal.md`](modal.md), "A form the browser can draw skips the skeleton"). Its head names the coven the spell lands in, as Add Ingredient's does: the coven's name over the title, and the dialog named "New Spell to Whitethorn Coven" (`ModalHeading.destination`, [`modal.md`](modal.md)); a saved spell's stays "Edit Spell" over its title. Reordering the steps (M10.16), instruction steps (M13.3) and Mark Complete (M10.20) are built. The comparison panel (M10.17) sits in the Jar section, beneath the steps. There is
no `instructions` field: the ritual is the spell's steps (M13.1).

## Delete

On a saved spell, `SpellDialog` given `canDelete` (a role that may delete; the grimoire list and the recipe page's edit dialog both give it) passes the builder a `deletedHrefOf(title)`; the builder then draws Delete Spell as the shared bin icon (`BinButton`, accessible name "Delete Spell <name>") in `FormActions`' `aside` slot, at the row's far end (M13.11, owner's call 2026-10-29, as the ingredient Edit dialog has Delete Ingredient). It opens a `ConfirmQuestion` asking the recipe page's question (`DeleteSpellWords`, in `SpellRecipe/delete-spell.tsx`): the name in bold, then one sentence read from the saved visibility. A private spell's is "It is gone for good, and nothing in stock changes."; a shared one's is "It leaves the grimoire for every member of the coven, and nothing in stock changes." Confirmed, `useDeleteSpell` (`SpellRecipe/delete-spell.tsx`, the same write the recipe page runs) sends `deleteSpell` and replaces the address with the list plus `?deleted=<name>` (from `deletedFromHref` when given, as the recipe page does with its list, else `closeHref`; `deletedHrefOf` in `SpellRecipe/deleted-href.ts`, shared with the card and Quick Look). A refusal shows in the `Notice`. The hook's `pending` (true from the request to the arrival of the list) is `removed`, and turns off the autosave (its timers, focus-out and page-hide flushes) and the save on close, so nothing writes to the deleted spell; a refusal lifts it. The question stays `ConfirmQuestion` over the form: a second `Modal` (the recipe page's `DeleteSpellDialog`) cannot stack over this one.

## Props

`SpellBuilderProps` (`types.ts`):

| Prop            | What it is                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspaceId`   | The coven the spell belongs to, sent with every save                                                                                                                        |
| `covenSlug`     | Optional: the coven's URL segment, for a step's Quick Look to link the entry's page. Left out, the steps have no Quick Look                                                 |
| `spell`         | Optional: a saved spell, its `id`, `revision`, `visibility`, `steps`, the seven fields (null for one not set) and its `categoryIds` (left out, none). Without it, all empty |
| `userId`        | Optional: the signed-in person, which keys the browser copy the autosave keeps. Left out, no copy is kept                                                                   |
| `stepsRead`     | Optional: `loading` while `spell`'s steps are on their way, `failed` when they could not be read. Left out, `spell.steps` are its steps                                     |
| `onCreated`     | Optional: called with the spell the builder's first save created, whichever save that is (the autosave's, Save's, Close's or Mark Complete's)                               |
| `deletedHrefOf` | Optional: where the dialog goes once the spell is deleted, given its title. Left out, the form has no Delete. Shown only once the spell exists                              |
| `copiedHrefOf`  | Optional: where Duplicate goes, given the copy's id. Left out, a complete spell's form has no Duplicate. Shown only once the spell exists                                   |

## Saving

**It autosaves** (M13.17, story 81) through the shared engine
([`autosave.md`](autosave.md)): three seconds after the last change, thirty at
most while typing, with the status (`SaveStatus`) beside Save. Every way of
saving (the autosave, Save, Close, Mark Complete and Share) goes through one
function, `persist` in `index.tsx`, which checks the form, calls
`saveSpell` (`autosave.ts`) and rebases the form on the answer. A refusal
skips the engine's retries, so the status stops at "Could not save" with Retry.
Save flushes at once, is off when nothing is unsaved, and spins while saving.
The autosave is held back while a step's unit is refused or a saved spell's
steps are still being read.

The autosave never sends a blank instruction (owner decision 2026-10-28). A
new blank instruction step (no saved id) is left out of what the autosave
sends and of what makes the form unsaved, so the rest of the spell saves and
the blank row stays in the form with no error, until it is written, removed,
or Save or Close checks the whole form (the resolver checks it only while a
save the person asked for runs). A saved instruction whose text has been
cleared is not left out, since that would delete it: the autosave is held back
for it, as for a refused unit, and Save or Close shows the error beside it.

- **The adapter** (`autosave.ts`) takes a target: `{ kind: 'new' }` calls
  `createSpell`, once, and the engine then carries the id;
  `{ kind: 'spell', id, revision }` calls `updateSpell` with that
  `expectedRevision`. The builder never sends null (the unconditional write):
  after a conflict it names the revision the refusal reported, as "Two people,
  one spell" below sets out. A later edit to a complete spell can name
  another target when spell history arrives. Beside the save, `readLatestSpell`
  reads the spell as the server has it now (`SpellBuilderReload`), for Reload Latest.
- **The browser copy.** Every change is mirrored to localStorage, keyed
  `autosave:spell:<id|new>:<userId>`, until the server confirms. If a copy
  newer than the spell's `updatedAt` exists when the builder opens, a banner
  (`RecoveryNotice`, from [`SaveStatus`](save-status.md)) reads "Restored unsaved changes from 2:02 pm." with Keep (load the copy into
  the form, unsaved) and Discard (forget it). In the dialog it sits under the
  title, in the modal's header note ([`modal.md`](modal.md), "A control in the
  header"), as the conflict notice does, so it is in view however far the form
  has scrolled; outside a modal it is above the fields. It is a warning notice, with Keep
  the one solid button and Discard quiet (the owner's calls, 2026-10-29), and takes the
  conflict notice's room so the two line up. The notice is a wrapping flex row with a
  `space(2)` gap between the sentence and the buttons (the same gap as the save status's notices), so
  at a narrow width the buttons drop to their own line. An older copy is removed without
  a word.
- **Typing in flight is kept.** A save's answer becomes the form's new start
  with `reset(..., { keepValues: true })`, so what was typed meanwhile reads
  as the next change.
- **Mark Complete** flushes first; a missing title refuses
  inline on the title field and the status goes back.

- **No field is required.** A draft saves with any one field, or all of them.
  Only marking a spell complete needs a title (the `spells_complete_has_title`
  CHECK, M13.15), and that is M10.20's control, so no label is marked required.
- **Save Spell stays disabled until there is something to save**: a field
  that reads differently from the last save. Blank and spaces alike read as
  none, as the shared schema (`SpellInput`) reads them. The row is
  `FormActions` ([`field.md`](field.md)) with `noun="Spell"`: Save Spell,
  busy as Saving Spell with the spinner from the press to the answer. It has
  no Cancel: the modal's Close leaves, saving first (see "Closing" below).
- **Created once, then updated.** With no `spell`, the first Save calls
  `createSpell`. The builder then holds the new spell's id and revision, and
  every later Save calls `updateSpell` on that spell with `expectedRevision`
  set to the revision the last save answered. Opened with a `spell`, every
  Save is an update. This is the shape M13.17's autosave adapter takes.
- **What it sends.** The seven fields, trimmed, and null for a blank one, so
  an emptied field is cleared rather than left as it was, `visibility`
  (below), and every step, as "Steps" below sets out. The steps are the whole
  recipe: on an update the service keeps the steps sent by id, adds the new
  ones and removes the rest, so a step the builder does not send is deleted. A
  saved instruction step is read in and sent back unchanged for that reason.
  The categories go as `categoryIds` only when the picks differ from the last
  save, as a set in any order; left out, the service keeps the spell's set as
  it is, and an empty list clears it ([`../db/grimoire.md`](../db/grimoire.md),
  "Saving its categories"). A changed pick turns Save on like a changed field.
- **After a save the form starts again from the answer**, so Save goes
  disabled until the next change.
- **The first save moves the address to the draft.** A create replaces
  `?new=spell-<slug>` with `?edit=<id>`, with `router.replace` so Back goes to the
  grimoire rather than to an empty New Spell, and a reload opens the saved
  draft. The builder reports the create through `onCreated`, whichever way the
  save was made, so M13.17's autosave moves the address the same way. The
  dialog keeps the same builder under the new address, so nothing typed is
  lost. A create made by Close skips the move and closes.
- **A saved spell's steps are read after it opens.** The grimoire page's
  server read for `?edit=<id>` (`readEditedSpell`) gives the fields alone, and
  the dialog reads the steps through /api/graphql (`SpellBuilderSteps`, in
  `steps/documents.ts`) once it opens, afresh each time. Until they land the
  builder holds them as `stepsRead`: the jar shows its loading state, Save is
  off, and nothing is sent, since an update's steps are the whole recipe and
  one sent now would delete the steps not yet shown. A Close pressed meanwhile
  saves once they land, then closes. Fields typed meanwhile are kept. If the
  read fails the jar says so and opens its section, nothing can be saved, Close
  closes without saving, since the save would be refused, and a reload tries again.
  A draft the dialog created needs no read: its save's answer holds its steps.
- **A saved step's selection is written out three times, not shared as a
  fragment.** The steps read and both save mutations each list a step's
  fields in full. Through a fragment spread, the jar's `stock { variant { id } }`
  and the form's `formChoice { group { icon } }` were 8 levels deep, past the
  API's limit of 7 (DESIGN.md §7; [`graphql/protections.md`](../graphql/protections.md)),
  and every save was refused. The answers are all typed as `SpellBuilderStep`
  (`types.ts`, off the steps read) where the builder reads them, so a copy
  missing a field fails the type check.

## Two people, one spell

Two members can have one spell open at once, and each save names the
revision it was read at (`expectedRevision`; M13.15, M13.16). The second of two
saves written against the same revision is refused by the service with
`StaleWrite`, which reaches the builder as a `STALE_WRITE` answer carrying the
spell's revision now ([`autosave.md`](autosave.md), "The server's half").
Nothing of the refused save lands: the service and resolver tests in
`tests/modules/grimoire/` prove the row is as the first save left it. The
builder then (M13.18, story 81):

- **Pauses the autosave** and shows the conflict notice, "This spell was
  changed elsewhere.", with Reload Latest and Keep My Version (`SaveStatus`'s
  `conflict` state). It sits under the dialog's title, through `conflictInto`
  and the modal's header note, not in the footer beside Save, where it went
  unnoticed under a long form (the owner's call, 2026-10-29); the saved line
  stays beside Save. Typing goes on, into the form, but nothing is sent until
  one is pressed.
- **Reload Latest** reads the spell as the server has it now (`readLatestSpell`
  in `autosave.ts`: the fields, the categories and the whole recipe) and puts
  it in the form in place of what was typed, which is discarded, with the
  browser copy. The form starts clean from it, so Save goes off, and the
  engine carries the revision the refusal reported. A save made by someone
  else between the refusal and the read is met as the next conflict. If the
  read fails, the conflict and the typing stay and the form says "The latest
  version couldn't be loaded. Try again." above the fields.
- **Keep My Version** sends the form again, naming the revision the refusal
  reported as `expectedRevision`, so it writes over the other person's save.
  Their open builder then meets the conflict in its turn on its next save. The
  version written over is kept nowhere (v2's revisions table would keep it).

There is no merge of the two texts, no diff and no history. A conflict is
settled by one of the two buttons, never by a page reload: the engine's
`resolveConflict` ([`autosave.md`](autosave.md)) is what moves the status on.
A draft and a complete spell meet it alike, since both save to the one row.

## Visibility

Who can see the spell (M10.13): `SpellVisibilityField`, in
`visibility-field.tsx`, drawn in the footer's row (`FormActions`' children) after
Mark Complete and before the save status, so it is in reach with every section
shut (the owner's call in the MB.123 review, D11). It wraps `VisibilitySwitch`
(`Field`, shared with the Record a Working dialog, [`field.md`](field.md)) in its
`brief` form, labelled **Shared**: `VISIBILITY_LABELS.workspace` in
`GrimoireList/params.ts`, the word the grimoire list uses for a shared spell, and
the one constant the tests read. On is the coven (`workspace`), which every member
can see, and off is private (`private`), which only its author can. A short line
under the label, its `note`, says what the state means: "Only you can see it." off,
"The coven can see it." on. The rest is in an InfoTip beside the line, which is in
the switch's accessible description. The toggle comes first, its label to its right
and the line under the label, a control's height in all, so it stands level with
the buttons (`index.scss`, `.spell-builder .form__actions > .switch`). Below 28rem
the footer stacks and the switch takes its own line, at the start.
The rule it follows is DESIGN.md §5's: a complete spell's visibility only widens, and a draft's moves either way (M10.20, [`m10.20-draft-visibility.md`](../design-decisions/m10.20-draft-visibility.md)).

- **A new spell** opens with the switch off, private (the owner's call, 2026-10-28: the
  autosave saves it 3 s after the first keystroke, and a shared spell never goes back; the
  database's column default stays `workspace`, since every write sends the value). It may be turned either way. The choice goes out with the first save. A choice alone is
  something to save (the owner's call, 2026-10-27): a visibility other than
  the last save's makes the form dirty, so Save Spell enables, Close saves
  it, and the browser asks before the tab closes.
- **A saved draft** keeps the switch open both ways, with no question: sharing
  it is reversible. Shared, its note says "The coven can see it.", with "Once the
  spell is complete, it stays shared." in its tip. The change is saved with the rest.
- **A saved complete private spell** keeps the switch open. Turning it on asks
  "Share **<name>**? Every member of the coven will see it, it cannot be made
  private again, and your other changes are saved with it." (`ConfirmQuestion`,
  Share or Keep It Private; the name is the title the form holds), and
  Share saves the whole form with `visibility: workspace` at once, so the
  spell is shared in one action. Any other unsaved changes go with it, which
  the question says. A refusal lands in the `Notice` and the spell stays
  private.
- **A shared draft** keeps the switch open. Switching it off is a pending
  change like a new spell's, saved with the rest of the form. The lock binds only
  once the stored status is complete (M10.20).
- **A complete spell shared with the coven** shows the switch on and disabled, with
  the note "The coven can see it." and, in an InfoTip beside it, "It cannot be
  made private again. Duplicate makes a private copy." The tip's text is in
  the switch's accessible description. Duplicate is M13.20. A new spell saved for
  the coven stays open while it is a draft, and shuts once it is complete.

Which state shows is read from the form's starting values (the last save's,
status and visibility) and whether the spell has been created, so the builder passes only
`created` and its `send`. Every save carries the visibility the form holds.
A save from a stale page, after the spell was shared elsewhere, therefore
says `private` and, if it is complete, is refused by the service (`assertWidens`, M10.6); the
refusal's words, which explain the rule and name Delete, show in the
`Notice`, never a bare "Forbidden".

## Draft and complete

Whether the spell is finished (M10.20, story 55): `SpellStatusField`, in
`status-field.tsx`, drawn in the form's action row (`FormActions`) beside Save Spell, outside every section.
A spell is a `draft` until it is marked `complete`. A draft shows one button,
Mark Complete, with a line saying what the state means, visually hidden and read as the button's description. Like Share
With the Coven, a click saves the whole form with the status `complete` at once, so
the status is never a pick left pending. A complete spell shows no Mark Complete and
no sentence (the owner, 2026-10-29); the locked Visibility switch carries the state. Once
complete, its workings are recorded against it and its visibility lock has
started, so reopening would undo both. In Mark Complete's place, a member who may create a spell sees Duplicate
([Status and visibility controls](#status-and-visibility-controls)), the way to vary a complete
spell; the service refuses complete to draft too.

- **A new spell** is a draft (`valuesOf` reads a missing status as one).
- **A blank title** is refused before anything is sent: the form holds the asked-for status while it validates, so the schema's rule shows it on the title field,
  with `COMPLETE_NEEDS_TITLE` (validation/spell.ts), the words for the
  database's `spells_complete_has_title` check (M13.15). Focus goes to the title.
- **Autosave:** Mark Complete sets the status, then flushes the autosave, so the one save it
  sends carries the status and every unsaved change. Duplicate flushes the same way before it
  copies, and shows itself busy as Duplicating until the copy opens, so a second press cannot run.
- **The list** shows status already: the Drafts tab, and a Draft badge on each
  draft's card (M10.11).
- The stock check's `unitConvert` refusals are shown as text by the stock
  check itself (M10.19), not by this control.

## Two error surfaces

As in the ingredient form (M5.9): the shared schema runs as the form's
resolver, so a field it refuses shows its error beneath that field before
the save, and a `VALIDATION` answer's `fieldErrors` for one of the seven
fields, or for a pick at `['categoryIds', index]`, show beneath that field after, through the same element (`aria-invalid` and
`aria-describedby`), as does an issue the server places on a step's
quantity or unit (`steps.<i>.quantity`, `steps.<i>.unit`). Anything else, such as a viewer's `FORBIDDEN`, goes to
the `Notice` above the fields, in the server's words. The reading is
`placeServerIssues`, and a section holding a refused field opens (`openErred`). Beside Save,
`SaveStatus` says the save failed ([`save-status.md`](save-status.md)). The schema's one rule a
field can break in the browser is the title a complete spell needs.

## Closing

Close, Escape and a click outside the dialog flush the autosave, then
close, and ask nothing (`useSaveOnClose`, `save-on-close.ts`). This is the
builder's exception to M13.14's Discard Changes question, by the owner's call
on 2026-10-27: a spell's draft is kept, never thrown away. The close waits for
the save. A refused save keeps the dialog open with the refusal in the
`Notice`, so nothing typed is lost. With nothing unsaved, Close closes at once.
Closing the tab or reloading still asks the browser's own question, which no
page can answer by saving. Undo and redo are the shared `FormHistoryButtons`
(M12.9). Undo writes the `steps` array back whole with `setValue`, which makes react-hook-form give every row a new id; so the list keys its rows, drag ids and open row by each step's `rowKey` (a value carried in the step, stable across an Undo), not by the field array's `id`. Every path that writes stored steps back goes through `restoredSteps` (`steps/values.ts`): Undo and Redo (`prepare`) and a recovered draft (`keepRecovered`). It sets a saved id the server's current steps do not hold to none, so the next save adds the step as a new one and the service never sees a dead id (a draft kept before a save removed a step would otherwise be refused on every save), and it gives a step with no `rowKey` one. A save's answer setting a new step's `stepId` is bookkeeping and not a history step (`skip`).

## Sections

The fields sit in four `CollapsibleSection`s at `h3`
([`collapsible-section.md`](collapsible-section.md)), wrapped in
`.collapsible-sections`, as Add Ingredient's are (M8.16; the owner, 2026-10-28,
"Use add ingredient modal as reference"):

| Section         | Fields                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Purpose         | Title, Intent, Categories (M10.14)                                                                 |
| Jar             | The jar details (Seal Wax, Jar Description), What Goes In (the steps, M10.15), then the comparison |
| When to Work It | Moon Phase, Day                                                                                    |
| Notes           | Note                                                                                               |

A new spell opens with every section open, to be filled in order; a saved
spell opens with every section shut. Shut, a section's line names the values
it holds, each on one line and joined by a middle dot ("Waxing Moon ·
Monday"), or reads "Nothing yet". The visibility switch is the footer's, not a
section's, so Notes reads its note alone. The categories read by name, joined by
commas, once the categories are read (`useCategoryIndex`), so the line never
shows an id, and the steps as a count of the ingredients laid ("3 ingredients",
an instruction step not counted). Each section's values are its entry in
`SECTIONS`, which flags the section holding an error, and `lineOfField`
reads each value for the line. A save refused on a field opens that
field's section, flagged "Has an error to fix", and leaves the rest as they
were. What is typed in a shut section is kept. Open All / Close All
(`FoldAll`) sits in the dialog's head before Undo and Redo, reading Close All
while any section is open. The section names are this pass's, for the owner
to confirm.

## The fields

Each field has a one- or two-word placeholder and no info tip, since none
states a rule a person could trip on
([`info-tip.md`](info-tip.md), "When a field gets a tip"). Every value is
stored as typed: the columns are free text
([`../db/grimoire.md`](../db/grimoire.md)).

- **Moon Phase and Day** sit together under When to Work It.
  They are the recipe's timing, meaning when to work the
  spell, not a record of when it was worked. A working's own day and moon
  phase follow from its `workedOn` date (M13.4). Both are comboboxes
  ([`combobox.md`](combobox.md)), `SpellSuggestField` in
  `suggest-field.tsx`. Each suggests a fixed list from `constants.ts`,
  narrowed to what is typed: the eight phases of Wikipedia's "Lunar phase",
  New Moon to Waning Crescent, then Dark Moon (Wikipedia's "Dark moon": the
  span around the new moon when no crescent shows), Waxing Moon and Waning
  Moon (the two halves of the cycle, for a recipe that asks for a half rather
  than one phase); and the seven days, Monday first, with no planet beside
  them (the owner, 2026-10-27). A pick fills the box with the name; anything
  else typed is kept as typed, so a value saved before the lists existed ("Full") opens
  unchanged. The lists are constants rather than vocabulary tables: each set
  is closed, and adding a name is a one-line change, unlike the celestial
  bodies (MB.91), which keep growing (the owner, 2026-10-27).

  Each moon phase shows a small drawing of the moon beside its name, in the
  open list and in the closed box (`MoonPhaseIcon`, in
  `src/components/MoonPhaseIcon/`). The drawings follow the northern
  hemisphere, where a waxing moon is lit on its right and a waning one on its
  left. The lit part is always the paler of the two in either theme, from
  three theme tokens: `--moon-lit`, `--moon-shadow` and `--moon-mare`. On
  the lit part sit the near side's seven largest maria, the dark lava plains,
  as simple ellipses placed from their published centres and diameters by an
  orthographic projection; `icons.tsx` holds the table, its sources and the
  formula, so the shapes can be drawn again. Mare Nectaris and the craters
  Tycho and Copernicus are left out, as each is under 1.5px across at a 20px
  icon. A thin outline at half the text's ink closes the disc. The drawings
  are hidden from screen readers, since the name always stands beside them.
  New Moon is the shadowed disc; Dark Moon is the outline alone, with no
  shadow inside, so the two read apart. Waxing Moon and Waning Moon each stack
  their half's three lit parts, bottom to top: the gibbous at 25% strength,
  the quarter at 40% and the crescent at full strength, each with its maria at
  the same strength, so the light reads as spreading from the side it grows
  from (`HALVES` in `icons.tsx`). The crescent is the lit part and is the
  same colour as Full Moon's lit part; only the bands beyond it, the shadow,
  step darker: the quarter band about 55% lit, the gibbous band 25%, and the
  rest of the disc in shadow (the owner, 2026-10-27). A phase typed outside the list, such as "Dark",
  shows its words with no drawing (the owner, 2026-10-27).

- **Categories** (`categories-field.tsx`, after Intent) are what the spell
  is meant to do: the categories its author assigns it, never the ones its
  ingredients bring, which are read from them and shown apart (DESIGN.md,
  "Two kinds of spell category"). The field is the ingredient form's
  `CategoryPicker` ([`category-picker.md`](category-picker.md)) on the same
  `PickerCategories` query (`CategoriesDocument`, exported from
  `IngredientForm/categories.tsx`): a box named Category in a group headed
  Categories, each pick a chip in its group's colour with a × to remove it.
  A pick the service refuses (a category deleted since the builder loaded) is
  marked invalid, and its message names it. The builder shows its picks
  as the picker's chips; the grimoire's spell card shows the saved ones with
  `CategoryChips`. A saved spell opens with its categories picked: the
  `?edit=<id>` read (`readEditedSpell`) loads them with `assignedCategoriesOf`.
- **Jar Description and Seal Wax** stay plain text boxes, with no list, by
  the owner's decision (2026-10-27).
- **Intent and Note** are multi-line. Title, Jar Description and Seal Wax are
  `autoComplete="off"`.

## Steps

The Jar section is one column (the owner's call, 2026-10-29: with In Coven Inventory gone, one column in the default-width dialog; it was two columns, owner's design, 2026-10-28, option C2). In order: the jar details ([the jar details](#the-jar-details)), "What Goes In" (`steps/`), then the comparison (Category Match). "What Goes In" holds a summary line, the list of steps, then one add row beneath the list: the picker and
Add Instruction. The add row sits below the list because a new step lands at the end of the list (owner's call, 2026-10-29, on the second design review's second question): the control that adds an item belongs where the item appears, a pick is followed by a short move to the new step rather than a trip down the list and back, and Shift+Tab from the picker reaches the new step's last field instead of going through every closed row. With no steps the list takes no space, so the add row sits directly under the heading. The default dialog is 32rem of content, so the section is one column at every width (gate spec `tests/e2e/spell-dialog-size.spec.ts`). While a saved spell's steps are still
being read the column is a skeleton, and if the read fails, an error in its place.

- **Summary** reads how many steps and how many ingredients the jar holds.
- **Add to Jar** (`picker.tsx`, story 49) is one combobox over `ingredientSuggestions`: the coven's
  own ingredients under Your Ingredients and the compendium's under Compendium, one row per
  form, since a step lays a form and not a whole ingredient. A row reads the cupboard's label
  (or the ingredient's name) with the form in brackets, its form's icon, and the formal name as
  its second line: the formal name in italics (`.spell-steps__formal`), then " · " and the form's categories (the form's own, else the ingredient's) as `CategoryChips` with no separator between chips (the combobox's `meta`; see "Folded categories" below). The box is a `FieldShell` field ([`field.md`](field.md)): the label "Add to Jar" above its frame, the hint "Type to search your ingredients and the compendium." behind the label's ⓘ and as the box's description, the placeholder "Add an ingredient", and the field's error directly under the frame. A retired ingredient is not offered. A form already in the jar is listed and
  can be picked again, for another step (owner, 2026-10-28; before it a form could be in the jar once). Picking a row appends the step and clears the search, and
  the focus stays in the search for the next ingredient: the append passes
  `shouldFocus: false`, since react-hook-form would otherwise move the focus to the new step's
  Quantity a render later and close the list of whatever was typed meanwhile.
- **A one-off ingredient** is the combobox's first row, `Add "<typed>" as a one-off ingredient`
  (the Combobox's `action`). It makes no ingredients row: the step saves its `name` with no
  ids, is marked One-Off, and its Form is typed in the open row. A name already in the jar as a
  one-off, trimmed and ignoring case, is refused beneath the box.
- **What a step saves.** A step picked from the type-ahead sends its
  `ingredientId` and `variantId`, never the cupboard entry or the coven's
  jar it was found through (`stepInputOf` in `values.ts`); a one-off sends
  its `name` and `form`. A saved step sends its `id`. Quantity is sent as a
  number, and a blank quantity or unit is left out.
- **Each row** (`step-row.tsx`'s `BuilderStepRow`, stories 50 and 80) is [`StepRow`](step-row.md), an
  open or a closed card. Closed, it shows the handle, the position, the form's icon, the name with
  its form, a summary of amount and instruction, a pencil to open it and Remove.
  Open, it also shows Name (one-offs only, required, editable: the header follows it, a blank is refused as "Give the ingredient a name" and a repeat as the picker does, both in the field; a linked ingredient's name is read-only), Form (one-offs only), Quantity and Unit on one line, and Instruction full width on a line beneath. One row is open at a
  time: a new step opens, opening another closes the one before, and a step whose unit breaks the
  rule is forced open so its error is seen. An open row also closes when a click or tap lands outside it or the focus leaves it; a new step stays open while the focus is in Add to Jar and closes on the next click or focus outside the box and the row. What was typed in a closed row is kept. An instruction-only step is the same
  card: closed, its text on one line (a muted "Add an instruction" when empty) with a pencil and Remove, as tall as a closed ingredient row; a click on it or the pencil opens it, a text area in place of
  the text, and the pencil becomes the Close chevron at the right with Remove hidden.
- **One name per row.** A step's handle, pencil and Remove name it the way the drag messages do: an
  ingredient with its form ("Move Fixture Rosewort (Dried Leaf)", "Edit …", "Remove …"), an
  instruction by its opening words ("Edit Light the candle"), and "New Instruction" while blank.
- **Add Instruction** (M13.3) is on the add row, after the picker: a `.btn` on wide, and on narrow the
  dashed numbered last line, beneath the picker. It appends an instruction-only step, opens it and puts the
  focus in its Instruction field. Until something is written the step is named "New Instruction"
  where it is read out. The Instruction field is a two-row text area; its placeholder is
  "Add an instruction" on both kinds of step. A step with an ingredient needs no instruction: a cleared one is
  left out of the save. An instruction-only step with a blank one is refused
  at its own field, "Write the instruction, or remove it", before anything is
  sent (`stepInputOf` keeps the blank body on that kind of step so the schema
  says it, rather than a step that says nothing). The step `note` is retired: `body` is the one text on a
  step, and the Instruction field edits it
  ([`pr1308-step-note-retired.md`](../design-decisions/pr1308-step-note-retired.md)).
- **After a Remove** the focus goes to the handle of the row now in that place
  (the one before it for the last), and to Add Instruction when the list is empty.
- **The starting unit** (story 77): a form the coven keeps a jar of is added with that jar's unit already in the Unit field (`newStep` reads `jarUnit`, which the picker's lookup already returns in `stock`); a form with no jar, or a jar with no unit, starts blank. It is set once, as the step is added, so it never replaces a unit the member has chosen.
- **The unit rule** (story 77, `unitIssues`) is the service's, from
  `src/modules/grimoire/validation/step-unit.ts`: when the coven holds a jar
  of that form, the step's unit must be one the jar can be measured in (the
  same unit, or weight with weight, volume with volume; a count only matches
  itself). It is checked as the unit is chosen, its error shows on the step's
  Unit, and Save Spell stays disabled while any step breaks it. A step with no
  unit, a form the coven holds no jar of, and a saved step whose unit is
  unchanged all pass, as on the server.
- **Derived Categories** (the intended categories are assigned, M10.14, and the two are never mixed,
  DESIGN.md §5) is drawn with the comparison, below.
- **Safety (M10.18, story 53).** A step carries the ingredient's and the form's
  `toxic` and `safetyNotes`, from the picker row or the saved spell, and draws
  `SafetyMark` beside its name and `SafetyNote` (heading level 5) beneath
  it, as the ingredient card does: Toxic, else Caution, else nothing. Only the
  form laid is shown. Adding a step announces "Warning: Toxic." or "Caution:
  has safety notes." in the live region. The warning never blocks the add or
  the save. A one-off, or an instruction, has no safety value (null) and draws
  nothing: it is not called safe either.

### Add to Jar: categories on the rows and the filter

- **Folded categories.** A row draws its categories through the site's own `CategoryChips` (compact size, group colours, [`category-chips.md`](category-chips.md)) with `limit` set to `ROW_CATEGORY_CAP` (1): the first in its group colour, the rest behind the same `CategoryMore` "+N" button and floating panel the ingredient cards and the admin table have (hover after the tip delay, click pins, Escape closes). The cap is a fixed count, not a measured fit, because measuring needs the row's laid-out width. The panel is `position: fixed`, so the list's scrolling does not clip it. A category whose colours have not landed draws neutral grey. The chips swallow the option's click and press, so using them never picks the row or closes the list.
- **In Jar.** A row whose form is already a step in the form shows a compact neutral "In Jar" badge (`badge--muted`) flush right at the row's inline end on its first line (the label line is a flex row and the badge has `margin-inline-start: auto`, so no width is fixed), and the option's name gains "already in the jar" (visually hidden text). It is information only: the row stays pickable, since a form may be laid again. The set comes from the same watched `steps` the Missing sort reads, by `variantId`; every row is one form, so there is no whole-ingredient row to match.
- **Order.** In three runs: the spell's assigned categories that Category Match counts Missing (carried by no step in the jar yet), then its other assigned ones (Carried), then the rest in the order the server sent. The Missing set comes from `compareJar` in `comparison-panel.tsx`, the derivation the panel itself uses. This decides which one is drawn.
- **Filter.** When the spell has categories, a tray sits inside the box's own border: one frame (`.spell-steps__frame`) wraps the search input and the tray, with a hairline between them, so the filter reads as part of the search. The tray has two lines. The first is the muted caption "Filter By Category", with no InfoTip; the sentence "Show only ingredients in any of the pressed categories." sits beneath the caption line as a hint and describes the chip group. A quiet "Clear" button sits at the right end of that line, level with the caption (the owner, 2026-10-29); it exists only while a chip is pressed and unpresses them all. The second is the group of chips (`role=group`, named by the caption), one toggle each. A chip is a toggle: at rest a neutral hairline border, primary ink and a small dot in its group colour; pressed, a solid fill in the group colour, card-coloured ink and a leading check that takes the dot's place in the same 12px slot, so the chip keeps its width in both states (the app's shared `CheckIcon` from IconTip, sized 12px by the stylesheet; the dot is an 8px circle drawn inside a 12px box), so the state is not carried by colour alone. The pressed chip is not bold; the fill and border ease over 150ms, off under reduced motion (`aria-pressed`). The open list is layered over the tray (its z-index, see Combobox). None pressed is no filter. One or more keeps ingredients carrying any of them. A pressed category the spell no longer has drops out of the filter. While any are pressed, the list's heading names them: "Your Ingredients · In Protection", joined with ", " for several. The filter is sent as `categoryIds` on `ingredientSuggestions`, not applied after fetching, because that query is paged at ten rows and a client-side filter would miss matches beyond the page. "Add Instruction" sits in the box's row with its top edge level with the top of the box's frame (`align-self: start`, offset below the label row, which holds the hint's ⓘ, by that row's height), so the filter tray grows below it without moving it; it is drawn flat, with no shadow.

## The jar details

`jar-details.tsx` (`JarDetails`, once `jar-aside.tsx`, the right-hand column) is the block at the top of the Jar section, above the step list (the owner's call, 2026-10-29: with In Coven Inventory gone, one column in the default-width dialog). It is a `group` named Jar Details. The first line is the jar drawing at the left, then the Seal Wax field taking the remaining width, the jar spanning the whole Seal Wax field, its label and input together (the owner's call, 2026-10-29: level with the Seal Wax label and input together). The row stretches its items, so the jar's top lines up with the label's top and its bottom with the input's; the drawing keeps its aspect ratio inside that box, so it is never distorted. The Jar Description is a plain full-width field on its own line beneath (`space(5)` below). The DOM order is the jar, Seal Wax, Jar Description. The section's order is the jar details, the step list with its add row (What Goes In), then the comparison (Category Match, shown once the steps are read). The drawing is `JarDrawing` and `pickJarShape` from the jar shelf
([`jar-shelf.md`](jar-shelf.md)), drawn empty and tinted by the seal wax.

**The jar fills as ingredients are added.** `JarDrawing` takes `bands`, one entry per ingredient step (one-offs count, instructions do not), each entry the one group colour of the step's first category (or null). Each band is the same height, stacked from the base and clipped to the vessel's body so it follows the shape. Eight bands fill the jar (`BANDS_FULL`, a typical spell); past eight the bands shrink so they keep fitting. A band with no known group colour is the jar's ink (`$text-primary`) in two alternating tints, 8% and 18% opacity. No line is drawn between layers (the owner’s call, 2026-10-29). Each boundary between two layers is a smooth wave of four full periods across the jar (quadratic curves of 6 units, joined on the same slope), drawn once and used both as the band above's bottom and the band below's top, so bands tile with no gap. The wave lies above its boundary, so the top layer keeps its full thickness, and the bands are sized so the highest wave still stays under the jar's full line. Each boundary has its own phase (1 unit for each step up, a sixth of the half period) and an amplitude of 0.65 or 0.8 in turn, rising 1.3 to 1.6 units (about 1.5 to 2px in the aside), so neighbouring edges run nearly parallel with a slight drift (the owner's call), the same on every render; the lowest band is flat on the base. The highest band's top edge is drawn as the level line of a held jar (`$accent`, 1.2 wide), lifted 0.6 so the whole line sits above the top layer's fill and none is drawn across it (the stroke is centred on its path; checked in a render, 2026-10-29). A band that has group colours takes them instead, with no line between layers (the top band keeps the level line) (MB.35: the colours are data on the group row, so they reach the drawing as the custom properties `--band-dark` and `--band-light`, never as tokens). It is the group colour of the step's first category in listed order (the ingredient's, then the form's), skipping any whose group is not loaded: one colour for each layer, never stripes (the owner's call, 2026-10-28). The colour is mixed 55% in the light theme and 65% in the dark with `color-mix`, picked by `light-dark()`, so the top line stays legible. A step with no categories, or none whose group is loaded yet, keeps the muted tint. The group colours come from the categories the Category Match panel already reads (`useCategoryColors`), so the Jar adds no request. A band moves by a `transform` transition (none under reduced motion). The drawing stays `aria-hidden`, and an empty jar draws no band.

**The Quick Look eye** stands in each ingredient step of What Goes In, after the row's badges and safety mark, before Edit, in one tight group with Edit and Remove (three fixed slots, so badges line up across rows), closed and open alike, and on no one-off or instruction-only step (the owner's call, 2026-10-29). It is `QuickLookButton`, the icon-only button the Add Ingredient form's duplicate rows use, named "Quick Look <name>", opening `DuplicateQuickLook`, the entry's details in a modal over the builder, so nothing typed is lost to a navigation. It needs the coven's id and URL segment, so `SpellBuilder` takes an optional `covenSlug` (the dialog passes it) and a builder given none draws no eye. It is drawn small (`size="small"`: the mark at 1rem in a 24px box); `StepQuickLook` (`step-quick-look.tsx`) holds the modal and the focus return, and `SpellSteps` takes the `look`. While the entry loads, the modal's head reads only the step's name, with a one-line skeleton where the formal name goes (the step carries no formal name, so it passes none: `DuplicateQuickLook` draws the skeleton when the entry has no `canonicalName`, and the loaded head is built from the loaded entry). The Add Ingredient form's duplicates list knows the formal name and shows it at once.

**The builder shows no stock** (the owner's call, 2026-10-29; [`design-decisions/m10.19-stock-off-the-builder.md`](../design-decisions/m10.19-stock-off-the-builder.md)). The builder no longer draws In Coven Inventory, and no step row carries a verdict. Whether the coven holds enough of an ingredient shows on the spell's page, its Quick Look and in workings (M13.21). `inventory.tsx`, `verdict-mark.tsx` and `steps/supply.ts` stay in `SpellBuilder/`, though the builder draws none of them; the recipe page and its Quick Look render them ([`spell-recipe.md`](spell-recipe.md)), and nothing in the builder does.

**Decision record:** on 2026-10-29 the owner chose icon-only verdicts with tooltips over the second design review's finding 3 (show the verdicts as words). Do not read the review as current on this point.

## The comparison panel

`comparison-panel.tsx` (M10.17, story 52) sets what the spell intends beside what its jar
carries, so a mismatch shows while the spell is built. It is a region named Category Match
in the Jar section beneath the steps, drawn as rows of a `dl` (Carried, Missing, Extra) whose values are
the site's own `CategoryChips` ([`category-chips.md`](category-chips.md)), each in its category's group colours (read by id through `useCategoryIndex`, below; a category whose colours have not landed is left out until they do). The chips are the compact size, the one the admin Compendium table's Categories column uses. The row's label alone says Carried, Missing or Extra: the Missing row alone draws its chips hollow (CategoryChips' `absent` prop: no fill, a dashed border and text both in `$text-muted`, so the chip is wholly grey; the owner's call), so they read as absent while still naming the category; Carried keeps the full fill and Extra is unchanged. Every chip carries a tip, through `CategoryChips`'s `tipOf` prop: "From <the ingredients carrying it, in the jar's order>" on a Carried or Extra chip, and "Assigned to this spell, and nothing in the jar carries it" on a Missing one. It opens by hover, focus and tap (the M12.43 rule) and rides on the chip as its accessible description. Carried and Missing draw every chip (`showAll`); Extra folds past eight, below. The Extra row has no line of its own beneath the chip: the tip is where the ingredients are named. It reads the form's values as they stand, saved or not, so a pick or an ingredient added or
removed moves it at once. The comparison is M10.8's `compareSpellCategories` over M10.7's
`summarizeSpellCategories`, run in the browser on the steps' categories; a one-off or an
instruction brings none. It also lists Derived Categories, the union of the steps' categories,
once each and sorted by name.

- **Carried** is each intended category the jar carries; **Missing** each assigned category nothing
  in the jar carries; **Extra** each category the jar carries that was not assigned. The row is its chips and nothing
  else: no line beneath names the ingredients that bring an extra category (the owner's
  call, 2026-10-28); each chip's "From …" tip names them. The Extra row has no bound, so it draws its first eight chips and folds the rest into one +N chip, `CategoryChips`' own (`limit={EXTRA_CHIP_LIMIT}`, 8; the owner, 2026-10-30): the +N opens the panel of the remaining chips on hover, focus or tap, as it does on the ingredient card. Carried and Missing keep every chip, since each is bounded by the spell's assigned categories. The panel is one component, so the builder, the spell page's side column and the Quick Look all fold alike. `tests/components/SpellBuilder/comparison-panel.test.tsx` proves eight chips and a +N at nine, and no +N at eight.
  The words carry the difference; the chips are coloured by group, as they are everywhere. On 2026-10-29 the owner chose the group colours over the second design review's finding 6a (neutral chips), so the review is not current on this point. The review's spacing stays: the chips are the compact size (`CategoryChips` with `compact`, which applies `chip($size: compact)`: overline text, 0.4375rem side padding), the row labels are the 5.5rem caption column, and rows are `space(2)` apart.
- With none of the three, it reads "Intent and ingredients match." With no category assigned the
  panel does not list every ingredient as an extra: it asks for categories first. With nothing
  assigned and nothing in the jar it reads "Nothing to compare yet."

- **No supply verdicts in the builder.** M10.19 (story 54) once read the coven's jar against each step and drew Out of Stock, Not Enough, Units Differ, Low Stock and One-Off verdicts. The owner moved that off the builder on 2026-10-29: stock is not a concern while writing a spell, and shows on the spell's page, its Quick Look and in workings (M13.21). `supplyOf` (`steps/supply.ts`) and its marks now serve the recipe page and its Quick Look (M13.21). Story 77's starting unit (the picker's `jarUnit`) stays: it presets a unit and shows nothing.

## The categories, read once

`useCategoryIndex()` (`category-index.ts`) is the builder's one read of the `categories` query:
the list the picker's filter offers, each id's name, and each id's group colours, with the query's
pending and failed states. The picker, the jar details, Category Match, the Categories field and the
sections' closed lines all call it, and the query cache makes every call one request.

## Reordering

The steps are in the order they are laid (M10.16, story 51), and each is
moved by its handle, a grip button named "Move" and the step's name
(`stepNameOf` in `values.ts`: "Fixture Rosewort (Dried Leaf)", a one-off's
name, or an instruction's text cut to 40 characters). Linked, one-off and
instruction steps move alike.

- **The list** (`steps/sortable.tsx`, `SortableSteps`) is a column on
  dnd-kit's `verticalListSortingStrategy`. The sensors, the keyboard target,
  the handle's instructions and the wording are the combobox's, shared from
  [`src/lib/sortable`](../../src/lib/sortable/index.ts) (the Wave 13 review,
  2026-10-23); only the layout and the keys are the list's own.
- **By keyboard**, Space or Enter lifts the focused handle's step, Up and Down
  move it a place, Home and End take it to either end, and it goes no
  further. Space or Enter puts it down; Escape puts it back. Left and Right do
  nothing in a column. The focus stays on the moved step's handle.
- **By pointer**, the handle drags once the pointer has moved 4px, and the
  step drops on the place whose centre is nearest.
- **By touch**, the handle drags once a finger has rested on it for
  `TOUCH_DRAG_DELAY_MS` (250ms, moving no more than 5px); a finger that
  moves off at once does not drag. The delay is the owner's open question,
  set in one constant in `src/lib/sortable` that the combobox shares.
- **Every move, Add and Remove is said.** A move in dnd-kit's live region, in
  the combobox's wording ("Picked up Testwort, at position 2 of 3.",
  "Testwort moved to position 1 of 3.", "Testwort put down at position 1 of
  3.", "Move cancelled. Testwort is back at position 2 of 3."); an Add or a
  Remove in a region of the list's own, `@dnd-kit/accessibility`'s
  `LiveRegion` ("Added Testwort, at position 4 of 4.", "Removed Testwort,
  from position 2 of 4.").
- **A move is a change to save.** The field array's `move` reorders the
  steps, the dirty check compares them in order, and Save Spell sends them in
  their new order, each saved one by id. The service writes `position`
  from that order, moving the live rows in place under the
  `(spell_id, position)` partial unique index through a negative scratch
  place, never by removing a step and adding it again.

## Why Save Spell is off

While Save Spell is off, a tip on the button says why (the owner's call, 2026-10-29: it was a muted line beside the button from the second design review, 2026-10-28, finding 6). `FormActions` takes the reason as `saveReason`: the tip opens on hover (after the wait), focus and a tap, through `IconTip`, and the same words are the button's description. The button is then `aria-disabled` rather than `disabled`, so it keeps focus and the tip has something to open from; it looks off and its press does nothing. In this order: "Fix the unit in step N to save" (a unit the jar cannot be measured in), "Waiting for the jar to load", "Nothing to save yet". It is left out while a save is on its way, and "Nothing to save yet" only while the spell has not been edited (the autosave status is idle): an edit that has been autosaved leaves nothing to save too, but the line had come back after every autosave, for the owner a message that stayed after an edit.

## Styling

Spacing, set by the second design review (2026-10-28, finding 3), which reverses earlier recorded choices (the hairlines in the aside and the card's `$text-muted` border): the step list's gap is `space(4)` (was `space(3)`); the add row sits `space(5)` below the list; the Jar section's blocks sit one field gap apart; an open section's fields end `space(6)` above the next section, set under `.spell-builder` so IngredientForm's `space(5)` stays. Values are in `rem`, so they are the same at 1280px and 390px; only the add row, which stacks in a narrow container, changes place, not size.

No wrapper: the `<form className="form">` sits straight in the body of a `RouteModal` of
`size` unset: the default `$dialog-column` (32rem of content), since the owner's call, 2026-10-29: with In Coven Inventory gone, one column in the default-width dialog; it was `size="wide"` from 2026-10-28 until then; [`modal.md`](modal.md)), its sections styled by `CollapsibleSection`. `index.scss` holds the
visibility switch's place in the footer row and the Jar section (the owner's design pass, 2026-10-28):

- a single text field (Title, Intent, Moon Phase, Day, Note) fills the dialog's column, with no cap; When to Work It and Notes are plain full-width fields;
- the Purpose section is one column (the owner's call, 2026-10-29: with In Coven Inventory gone, one column in the default-width dialog): Title, Intent, then the Categories picker under Intent. The two-column rhythm (`$spell-main-min`, `$spell-side`, `$spell-columns-switch`, `spell-side-stacked`, `spell-side-beside`, `.spell-purpose*`, `.spell-main-column*`) is gone;
- the handle unboxed in `$text-muted`, with the shared focus ring;
- the lifted step (`.step-row.spell-step.is-dragging`) in `$shadow-lifted` with an `$accent`
  border, while the other rows stay as they are;
- the list a column spaced by its `gap` alone, with no margin on a row and no room taken while
  empty. The list is the size container a row stacks by (`spell-steps`), declared in the same
  `.spell-steps__list` block of `index.scss`, the only rule for the list;
- Add to Jar's frame (`.spell-steps__frame`) draws the field's one focus ring: the Combobox box
  inside it has no border and no ring of its own, so the search and the filter tray read as one
  field;
- a pressed filter chip's `CheckIcon` and its resting dot share one 12px slot
  (`.spell-steps__filter-chip svg`);
- the Jar's detail fields (`.jar-details`) and every other layout rule are plain: the sections are single columns spaced by `CollapsibleSection`'s own gap, with a bare `section`'s margin zeroed under `.spell-builder` so the gap is not doubled; the Category Match chips are `CategoryChips`, unstyled here; every colour is a token,
  so both themes follow.

The row's own look, the card, is in [`step-row.md`](step-row.md), "The card".

## Stories

`index.stories.tsx`, titled "Grimoire / Spell Builder": `States`, with a control that
chooses one state, each in its `SpellDialog` over the app shell, with Open Again to look once
more after Close:

- Empty, Title Typed, and Refused After Saving: a new spell's first save refused, so the status
  reads "Could not save." with Retry.
- Saved Spell (shared with the coven, its visibility shut), Private Spell, Share Question and Phase
  Outside the List.
- With Steps (each kind of step: ingredient forms, a toxic one, an instruction and a one-off) and
  Comparison (the same steps against three assigned categories: two carried, one missing, and
  extras past the fold).
- Steps Loading and Steps Failed: a saved spell's steps still on their way, and refused.
- Complete Spell (Duplicate in place of Mark Complete), Restored Draft (the recovery notice),
  Delete Question, Saved, and Conflict (Reload Latest and Keep My Version).

Each state answers its own requests through the workshop's fake API (`useMockHandlers`): the
categories from `.storybook/grimoire-fixtures.ts`, the saved spell's steps, and the save or
refusal it shows.

## Testing

`tests/components/SpellBuilder/autosave.test.tsx` covers the saves (create once,
then update at the revision; a draft with no title; the three-second save),
the recovery banner (Keep, Discard, an older copy) and a save someone else
got in first (the notice's two buttons; Reload Latest puts the server's spell
in the form, clean; Keep My Version sends again at the reported revision).
Story 81's second flow walks it in two browsers, each signed in as another
member of the coven, and scans the notice with axe. The gate spec
`tests/e2e/spell-builder-autosave.spec.ts` scans the builder with axe in each
status: saving, saved, failed with Retry, and conflict. Story 81 is in
`tests/e2e/stories/06-grimoire.spec.ts`.

`tests/components/SpellBuilder/step-text.test.tsx` covers the step text (M13.3): Add Instruction with
its focus and announcement, an instruction-only step sent as its text alone, a blank one refused at its
field, a saved spell's texts read back and saved by id, a cleared text dropped from an ingredient step,
and Remove.

`tests/components/SpellBuilder/index.test.tsx` uses role and label queries
against MSW, which answers in the route's own error shape. It covers the
empty fields and no Instructions box, the four sections in order, open on a
new spell and shut on a saved one with their lines, Close All and Open All,
keeping what was typed across a shut, and opening the section a refused save
names, no Cancel, nothing to save until a
field holds something, a draft saved with its intent alone, the trimmed
values sent, Save busy then disabled, a second save as an update at the
revision, a saved spell opened and an emptied field cleared, both error
surfaces. `tests/components/SpellBuilder/spell-dialog.test.tsx` covers the
dialog: New Spell's heading naming its coven ("New Spell to Testwort Coven") and Edit Spell's, the address moved once on the
first save and never on a saved spell's, no Cancel, a saved spell's steps
read once it opens and sent with the next update, nothing sent before they
land, and Close closing at
once, saving first with no question, held until a saved spell's steps land,
or staying open on a refused save or a failed steps read, and
`?new=spell-<slug>` and `?new=spell` opening the empty builder from the address alone for a role that
may create a spell, and nothing for one that may not. The
grimoire page's test,
`tests/app/(shell)/coven/[slug]/grimoire/(list)/page.test.tsx`, covers which
address opens which dialog for an owner and a member, and that a viewer's
`?new=spell-<slug>` or `?edit=<id>` opens nothing. `visibility-field.test.tsx` covers the
visibility control: off by default and sent as private with a create, on sent as workspace and
shut; a new spell's first autosave stores private (`autosave.test.tsx`), a choice alone saveable, the share question kept and
confirmed, a refused share, a refused narrowing shown in the notice, and the
control shut with its reason on a shared spell. `tests/components/SpellBuilder/categories-field.test.tsx` covers the
Categories field: the picks sent with a first save, Save on with a pick and
off once it is removed, a saved spell's categories opened and the set left
after a removal sent (an empty set to clear them), the categories left out of
a save that did not change them, and a refused pick shown beside the field
by name. `steps.test.tsx` covers the
jar: the two headings, one row per form, a pick adding its row and clearing
the search, a form picked twice giving two rows, a one-off and its two
refusals, the ids sent, Remove updating Derived Categories, the unit rule both
ways and with no jar, saved steps sent back by id, and a server issue placed
on its step. `reorder.test.tsx` covers the order: a handle on every kind of
step, a keyboard move said at each step with the focus kept, the new order
sent by id, Home and End and no further, Escape putting a step back, a
pointer drag, a touch drag held for the delay and not a quick one, and Add
and Remove said. `spells.test.ts` asserts a reorder of
linked, one-off and instruction steps moves the same rows, none soft-deleted.
`tests/modules/grimoire/services/spell-ingredient-steps.test.ts`
reads the rows a save leaves, and asserts a member of another coven and a
viewer are refused by direct id.
Stories 47 and 48 in
`tests/e2e/stories/06-grimoire.spec.ts` walk it in a browser; story 48 picks
two categories, removes one, saves, and finds the one left on the spell's
card under Drafts. Stories 49, 50, 51, 57 and 77 walk the jar; story 51 moves a step by
keyboard and reads the saved order from the database. No story walks the visibility control, since §5's rule governs it rather than a
story, so `tests/e2e/spell-visibility.spec.ts` is its gate spec: a spell written private,
then shared in one confirmed action and the control shut, each step read from the
database. Story 56 checks the Private badge on the author's card.

## The spell dialog and its address

The spell builder is a modal over the grimoire, in step with Add Ingredient. New Spell opens it under `?new=spell-<slug>` (or `?new=spell`, the current grimoire's), and a spell's Edit under `?edit=<id>` (claude-docs/design-decisions/m10.12-spell-builder-modal.md). A draft's first save replaces `?new` with its own `?edit=<id>`, so a reload or Back opens the saved draft, never an empty form. The builder reports that save through `onCreated`, whichever way it was made, so the autosave moves the address the same way. The dialog is a client part because the builder's handlers are functions, which a server page cannot hand down.

New Spell's press writes `?new=spell-<slug>` with the browser's pushState (AddAction's `drawnHere`), so the dialog reads the address itself and draws the empty builder at once, at its full size, as Add Ingredient does. A skeleton the server's form replaced grew the centred dialog and moved it under the pointer. Any other `?new` is Add Ingredient's, and holds a saved spell's dialog back until it closes.

A saved spell's steps are read in the dialog, through `/api/graphql`, once it opens. The page's server read gives the fields alone, and an update's steps are the whole recipe, so the builder sends nothing until the steps land.

## The builder's sections and autosave

A spell's title, intent, jar and note sit in four folding sections, as Add Ingredient's do: open on a new spell, shut on a saved one, each shut line naming what it holds, and Open All / Close All in the dialog's head. Moon phase and day of the week suggest a fixed list and still take what is typed (`./constants`).

No field is required. A draft may be saved with any of them, and a title is asked for only when the spell is marked complete.

The builder autosaves (`./autosave.ts`): a change saves 3 s after the last, Save saves at once, and the first save creates the spell. After that the builder holds its id and revision and `onCreated` moves the dialog's address to it. There is no Cancel. Close saves what is unsaved, then closes.

## Status and visibility controls

**Status.** A spell is a draft until it is marked complete. A draft shows one button, Mark Complete. A click saves everything the form holds as complete, as sharing a complete spell does, so the status is never a pick left pending. A complete spell needs a title (a database CHECK), so its absence is said on the title field before anything is sent. Marking complete flushes the autosave with the other status, which carries every unsaved change in the same save.

A complete spell shows no statement and no Mark Complete, and there is no Reopen as Draft. Once complete, a spell's workings are recorded against it and its visibility lock has started, so reopening would undo both. To vary a complete spell, the copy (Duplicate a Spell) is the way: a complete spell has a **Duplicate** button here, for a member who may create a spell. It flushes the autosave, calls `duplicateSpell` and opens the copy in the Drafts tab's builder (`?edit=<id>`). The service refuses complete to draft as well (M13.20, amended 2026-10-29 by the owner).

**Visibility.** A spell is seen by its author alone, or by every member of the coven. The control is a switch, Shared, in the footer beside Mark Complete, on for the coven and off for private, with a short line under it saying what its state means. A new spell starts private, because the autosave would otherwise share it 3 s after the first keystroke. It takes either, and the choice goes out with its first save.

A draft moves either way, as often as wanted, with no question, since sharing it is reversible. A complete spell obeys DESIGN.md §5's one-way rule, held by the service. A private one is shared by switching it on, which asks first and then saves at once, so that one action with its confirmation shares it. A shared one never goes back, so the control then reads only and says so, rather than leave a person to find out from a refusal.

## Step values, documents and totals

**Stored values.** Steps written back from stored values (an Undo or Redo, a recovered draft) are made safe to save. A saved id the server no longer holds becomes none, so the save adds the step as a new one instead of being refused for naming a row the spell has not got. A step with no row key (a draft kept before keys existed) is given one. `live` is the ids of the spell's steps as last saved.

**GraphQL documents.** The builder's GraphQL for its steps is the picker's lookup and the saved steps' read. A saved step's selection is written out in full there and in both save mutations (`../index.tsx`) rather than shared as a fragment. graphql-armor counts a fragment spread as a level (`flattenFragments` is off), and through a spread the jar's `stock { variant { id } }` and the form's `formChoice { group { icon } }` are 8 deep, past DESIGN.md §7's 7. Written out, they are 6. The three copies cannot drift apart unseen: each answer is typed as `SpellBuilderStep` (`../types.ts`) where the builder reads it, and `tests/guards/document-depth.test.ts` holds every document to the limit.

**The saved steps read.** It returns each step as the builder opens it: what it lays and how much, the form's icon, the categories it adds to the spell's derived ones, and the coven's jar units. A step's unit is checked against those, the jar list being the ingredient's for the coven `$workspaceId` names.

**The supply total.** It is what a form's steps need together, for its one line in the recipe page's In Coven Inventory: "3 tsp". The builder draws no supply.

- One amount stays as it was typed.
- Amounts in one unit add as they are (a count too, since nothing is converted).
- Amounts in two units of one dimension add in the jar's unit through `unitConvert`.
- Anything else is listed, "1 tsp + 2 pinch", rather than guessed.
- A blank amount adds nothing, and no amount at all is null.

## Closing the modal

Close, Escape and a click outside save what is unsaved, then close, and ask nothing. Unlike other forms there is no Discard question, since a spell's draft is kept rather than thrown away (claude-docs/design-decisions/m10.12-spell-builder-modal.md). The close is held while the save runs. A refused save keeps the modal open with the refusal shown, so nothing typed is lost. Closing the tab or reloading is the autosave's to guard: `useAutosave` asks the browser, and saves as the tab hides, which no page can answer by saving.

## The save module and its conflicts

Every way of saving goes through one call: the autosave's, Save's, Close's and Mark Complete's. It takes a target rather than assuming "the row", so that a later edit to a complete spell can go into a draft revision (spell history, v2) by naming another target. Today both targets are the spell's one row, draft or complete.

The call saves `input` to `target`: `createSpell` for a new spell, otherwise `updateSpell` against the revision the target names. A `null` revision writes over whatever the row is at. The builder never sends one, since Keep My Version names the revision the refusal reported, so a third save in between is met as a conflict too rather than written over.

Reload Latest is the read made after someone else's save got in first. The spell as the server has it now (fields, categories and steps) replaces the form, what was typed into it included, and the form starts clean from it. The engine takes the revision the refusal reported, and a save made since is met as the next conflict. A read that fails leaves the conflict and the typing as they are, and says so. See "Saving" and "Two people, one spell".

## The suggest field

A spell field whose box suggests from a fixed list (`./constants`) as it is typed in. A pick fills the field with the name, and anything else typed is kept as typed, so a value saved before the list existed ("Full") opens unchanged. The ingredient form's SuggestField is bound to that form's values and asks a server lookup, so this is the builder's own.
