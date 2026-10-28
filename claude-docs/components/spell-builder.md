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
spell card's pencil and Quick Look's Edit (M13.10). There is no page of its
own. `?new=spell` is the same for the grimoire the page is on, and `?new=spell-<slug>`
on any other page is sent to that coven's grimoire with a replace
(`NewSpellElsewhere`; the owner's call, 2026-10-28). New Spell's press writes
`?new=spell-<slug>` in the browser, with no server
request, and the dialog draws the empty builder from the address itself, so
it opens at its full size at once, with no skeleton before it
([`modal.md`](modal.md), "A form the browser can draw skips the skeleton"). Its head names the coven the spell lands in, as Add Ingredient's does: the coven's name over the title, and the dialog named "New Spell to Whitethorn Coven" (`ModalHeading.destination`, [`modal.md`](modal.md)); a saved spell's stays "Edit Spell" over its title. Reordering the steps (M10.16), instruction steps (M13.3) and Mark Complete (M10.20) are later tasks that extend it. There is
no `instructions` field: the ritual is the spell's steps (M13.1).

## Props

`SpellBuilderProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspaceId` | The coven the spell belongs to, sent with every save                                                                                                                        |
| `spell`       | Optional: a saved spell, its `id`, `revision`, `visibility`, `steps`, the seven fields (null for one not set) and its `categoryIds` (left out, none). Without it, all empty |
| `stepsRead`   | Optional: `loading` while `spell`'s steps are on their way, `failed` when they could not be read. Left out, `spell.steps` are its steps                                     |

## Saving

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
  read fails the jar says so, nothing can be saved, and a reload tries again.
  A draft the dialog created needs no read: its save's answer holds its steps.
- **A saved step's selection is written out three times, not shared as a
  fragment.** The steps read and both save mutations each list a step's
  fields in full. Through a fragment spread, the jar's `stock { variant { id } }`
  and the form's `formChoice { group { icon } }` were 8 levels deep, past the
  API's limit of 7 (DESIGN.md §7; [`graphql/protections.md`](../graphql/protections.md)),
  and every save was refused. The answers are all typed as `SpellBuilderStep`
  (`types.ts`, off the steps read) where the builder reads them, so a copy
  missing a field fails the type check.

## Visibility

Who can see the spell (M10.13): `SpellVisibilityField`, in
`visibility-field.tsx`, drawn after Note in the Notes section, whose shut line
reads Shared or Private for it. It is a `SwitchField`
([`field.md`](field.md)) labelled Share With the Coven (the owner's call,
2026-10-27): on is the coven (`workspace`), which every member can see, and
off is private (`private`), which only its author can. A line under the
switch, its `note`, says what the state it is in means. The switch stands at the start of its column, its label and note too, as the
ingredient form's Toxic switch does, rather than centred as in a filter bar
(`index.scss`, on the form's `spell-builder` class).
The rule it follows is DESIGN.md §5's: visibility only widens.

- **A new spell** opens with the switch on, the coven being the database's
  default, and it may be turned either way. The choice goes out with the first save. A choice alone is
  something to save (the owner's call, 2026-10-27): a visibility other than
  the last save's makes the form dirty, so Save Spell enables, Close saves
  it, and the browser asks before the tab closes.
- **A saved private spell** keeps the switch open. Turning it on asks
  "Share With the Coven?" (`ConfirmQuestion`, Share or Keep It Private), and
  Share saves the whole form with `visibility: workspace` at once, so the
  spell is shared in one action. Any other unsaved changes go with it, which
  the question says. A refusal lands in the `Notice` and the spell stays
  private.
- **A spell shared with the coven** shows the switch on and disabled, with
  the note: "Shared with the coven, so it cannot be made private again.
  Duplicate makes a private copy." Duplicate is M13.20. A new spell saved for
  the coven shuts the control the same way, as soon as the save answers.

Which state shows is read from the form's starting values (the last save's)
and whether the spell has been created, so the builder passes only
`created` and its `send`. Every save carries the visibility the form holds.
A save from a stale page, after the spell was shared elsewhere, therefore
says `private` and is refused by the service (`assertWidens`, M10.6); the
refusal's words, which explain the rule and name Delete, show in the
`Notice`, never a bare "Forbidden".

## Two error surfaces

As in the ingredient form (M5.9): the shared schema runs as the form's
resolver, so a field it refuses shows its error beneath that field before
the save, and a `VALIDATION` answer's `fieldErrors` for one of the seven
fields, or for a pick at `['categoryIds', index]`, show beneath that field after, through the same element (`aria-invalid` and
`aria-describedby`), as does an issue the server places on a step's
quantity or unit (`steps.<i>.quantity`, `steps.<i>.unit`). Anything else, such as a viewer's `FORBIDDEN`, goes to
the `Notice` above the fields, in the server's words. The reading is
`placeServerIssues`. Today no builder field has a rule the schema can break
in the browser: the title rule needs `status: complete`, which M10.20 adds.

## Closing

Close, Escape and a click outside the dialog save anything unsaved, then
close, and ask nothing (`useSaveOnClose`, `save-on-close.ts`). This is the
builder's exception to M13.14's Discard Changes question, by the owner's call
on 2026-10-27: a spell's draft is kept, never thrown away. The close waits for
the save. A refused save keeps the dialog open with the refusal in the
`Notice`, so nothing typed is lost. With nothing unsaved, Close closes at once.
Closing the tab or reloading still asks the browser's own question, which no
page can answer by saving. Undo and redo are the shared `FormHistoryButtons`
(M12.9).

## Sections

The fields sit in four `CollapsibleSection`s at `h3`
([`collapsible-section.md`](collapsible-section.md)), wrapped in
`.collapsible-sections`, as Add Ingredient's are (M8.16; the owner, 2026-10-28,
"Use add ingredient modal as reference"):

| Section         | Fields                                               |
| --------------- | ---------------------------------------------------- |
| Purpose         | Title, Intent, Categories (M10.14)                   |
| Jar             | Jar Description, Seal Wax Colour, the steps (M10.15) |
| When to Work It | Moon Phase, Day of the Week                          |
| Notes           | Note, Share With the Coven (M10.13)                  |

A new spell opens with every section open, to be filled in order; a saved
spell opens with every section shut. Shut, a section's line names the values
it holds, each on one line and joined by a middle dot ("Waxing Moon ·
Monday"), or reads "Nothing yet". The visibility switch reads as Shared or
Private, so Notes always has a line, and the categories by name, joined by
commas, once the categories are read (`useCategoryName`), so the line never
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

- **Moon Phase and Day of the Week** sit together under When to Work It.
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
  `CategoryChips`.
- **Jar Description and Seal Wax Colour** stay plain text boxes, with no list, by
  the owner's decision (2026-10-27).
- **Intent and Note** are multi-line. Title, Jar Description and Seal Wax Colour are
  `autoComplete="off"`.

## Steps

`steps/` is the jar: the list of steps, the picker that adds to it, and the
spell's derived categories. It sits in the Jar section after Seal Wax Colour;
while a saved spell's steps are still being read it is a skeleton there, and
if the read fails, an error in its place.

- **Add to Jar** (`picker.tsx`, story 49) is a fieldset with a type-ahead,
  Search Ingredients, over `ingredientSuggestions`: the coven's own
  ingredients under Your Ingredients and the compendium's under Compendium,
  one row per form, since a step lays a form and not a whole ingredient. A row
  reads the cupboard's label (or the ingredient's name) with the form in
  brackets, its form's icon, and the formal name as its note. A retired
  ingredient is not offered. A form already in the jar is listed but disabled,
  with the note "Already in the jar". Picking a row appends the step and
  clears the search.
- **A one-off ingredient** is a name and an optional form typed for this jar
  alone (One-Off Name, One-Off Form, Add One-Off Ingredient). It makes no
  ingredients row: the step saves its `name` and `form` with no ids. A name
  already in the jar as a one-off is refused beneath the name field.
- **What a step saves.** A step picked from the type-ahead sends its
  `ingredientId` and `variantId`, never the cupboard entry or the coven's
  jar it was found through (`stepInputOf` in `values.ts`); a one-off sends
  its `name` and `form`. A saved step sends its `id`. Quantity is sent as a
  number, and a blank quantity, unit or note is left out.
- **Each row** (`step-row.tsx`'s `BuilderStepRow`, stories 50 and 80) is
  [`StepRow`](step-row.md) with the builder's controls in it: the handle (Move
  and the step's name, below), then the form's icon and the name with its
  form, a Quantity and a Unit, an Instruction beneath, and Remove. An
  instruction-only step has the handle and its Instruction alone.
- **Add a Step** (M13.3) is a button beside Add to Jar that appends an
  instruction-only step and puts the focus in its Instruction field. Until
  something is written the step is named "New Instruction" where it is read
  out. The Instruction field is a two-row text area; its placeholder is
  "Light candle" on an instruction-only step and "Crush first" under an
  ingredient. A step with an ingredient needs no instruction: a cleared one is
  left out of the save. An instruction-only step with a blank one is refused
  at its own field, "Write the instruction, or remove it", before anything is
  sent (`stepInputOf` keeps the blank body on that kind of step so the schema
  says it, rather than a step that says nothing). A step's `note` is not
  edited here.
- **After a Remove** the focus goes to the handle of the row now in that place
  (the one before it for the last), and to Add a Step when the list is empty.
- **The unit rule** (story 77, `unitIssues`) is the service's, from
  `src/modules/grimoire/validation/step-unit.ts`: when the coven holds a jar
  of that form, the step's unit must be one the jar can be measured in (the
  same unit, or weight with weight, volume with volume; a count only matches
  itself). It is checked as the unit is chosen, its error shows on the step's
  Unit, and Save Spell stays disabled while any step breaks it. A step with no
  unit, a form the coven holds no jar of, and a saved step whose unit is
  unchanged all pass, as on the server.
- **Derived Categories** lists the union of the steps' categories, the
  ingredient's and the form's, once each and sorted by name. It is worked
  out from the steps as they stand, so a Remove takes a category off at once.
  These are only ever derived; the categories a spell intends are assigned
  (M10.14), and the two are never mixed (DESIGN.md §5).

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
  their new order, each saved one by id. The service writes `position` and
  `layer_order` from that order, moving the live rows in place under the
  `(spell_id, position)` partial unique index through a negative scratch
  place, never by removing a step and adding it again.

## Styling

No wrapper: the `<form className="form">` sits straight in the body of a
`RouteModal` at the default column, Add Ingredient's (`size="wide"` until
2026-10-28), its sections styled by `CollapsibleSection` ([`modal.md`](modal.md)),
which scrolls the form when it is taller than the screen. `index.scss` holds the
visibility switch's alignment (M10.13) and the step handle (M10.16), unboxed as
the combobox's chip handle is. Its look past the tokens is the grimoire's design review's.

## Stories

`index.stories.tsx`, titled "Grimoire / Spell Builder": `States`, with a
control that chooses Empty, Title Typed, Saved Spell (shared with the coven,
its visibility shut), Private Spell, Share Question, Phase Outside the List
or Refused After Saving, each in its `SpellDialog` over the app shell, with
Open Again to look once more after Close.

## Testing

`tests/components/SpellBuilder/step-text.test.tsx` covers the step text (M13.3): Add a Step with
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
visibility control: on by default and sent with a create, off sent as private and
left open, a choice alone saveable, the share question kept and
confirmed, a refused share, a refused narrowing shown in the notice, and the
control shut with its reason on a shared spell. `tests/components/SpellBuilder/categories-field.test.tsx` covers the
Categories field: the picks sent with a first save, Save on with a pick and
off once it is removed, a saved spell's categories opened and the set left
after a removal sent (an empty set to clear them), the categories left out of
a save that did not change them, and a refused pick shown beside the field
by name. `steps.test.tsx` covers the
jar: the two headings, one row per form, a pick adding its row and clearing
the search, a form already in the jar disabled, a one-off and its two
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
