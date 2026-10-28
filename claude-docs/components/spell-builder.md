# SpellBuilder

`src/components/SpellBuilder/` is the form that writes a spell's own fields
(M10.12, story 47): its title, intent, jar description, seal wax colour, moon phase,
day of the week and note, and the categories it is assigned (M10.14, story 48). It is a client component, drawn in a modal
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
([`modal.md`](modal.md), "A form the browser can draw skips the skeleton"). Its head names the coven the spell lands in, as Add Ingredient's does: the coven's name over the title, and the dialog named "New Spell to Whitethorn Coven" (`ModalHeading.destination`, [`modal.md`](modal.md)); a saved spell's stays "Edit Spell" over its title. The recipe's steps (M10.15, M10.16, M13.3) and Mark Complete (M10.20) are later tasks that extend it. There is
no `instructions` field: the ritual is the spell's steps (M13.1).

## Props

`SpellBuilderProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspaceId` | The coven the spell belongs to, sent with every save                                                                                                               |
| `spell`       | Optional: a saved spell, its `id`, `revision`, `visibility`, the seven fields (null for one not set) and its `categoryIds` (left out, none). Without it, all empty |

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
  an emptied field is cleared rather than left as it was, and `visibility`
  (below). Only these:
  the schema's default empty `steps` is never sent, so a save from here
  cannot replace a saved spell's recipe. The categories go as
  `categoryIds` only when the picks differ from the last save, as a set in
  any order; left out, the service keeps the spell's set as it is, and an
  empty list clears it ([`../db/grimoire.md`](../db/grimoire.md), "Saving its
  categories"). A changed pick turns Save on like a changed field.
- **After a save the form starts again from the answer**, so Save goes
  disabled until the next change.
- **The first save moves the address to the draft.** A create replaces
  `?new=spell-<slug>` with `?edit=<id>`, with `router.replace` so Back goes to the
  grimoire rather than to an empty New Spell, and a reload opens the saved
  draft. The builder reports the create through `onCreated`, whichever way the
  save was made, so M13.17's autosave moves the address the same way. The
  dialog keeps the same builder under the new address, so nothing typed is
  lost. A create made by Close skips the move and closes.

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
`aria-describedby`). Anything else, such as a viewer's `FORBIDDEN`, goes to
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

| Section         | Fields                              | Later fields   |
| --------------- | ----------------------------------- | -------------- |
| Purpose         | Title, Intent, Categories (M10.14)  |                |
| Jar             | Jar Description, Seal Wax Colour    | M10.15's steps |
| When to Work It | Moon Phase, Day of the Week         |                |
| Notes           | Note, Share With the Coven (M10.13) |                |

A new spell opens with every section open, to be filled in order; a saved
spell opens with every section shut. Shut, a section's line names the values
it holds, each on one line and joined by a middle dot ("Waxing Moon ·
Monday"), or reads "Nothing yet". The visibility switch reads as Shared or
Private, so Notes always has a line, and the categories by name, joined by
commas, once the categories are read (`useCategoryName`), so the line never
shows an id. Each section's values are its entry in
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
  `CategoryChips`. A saved spell opens with its categories picked: the
  `?edit=<id>` read (`readEditedSpell`) loads them with `assignedCategoriesOf`.
- **Jar Description and Seal Wax Colour** stay plain text boxes, with no list, by
  the owner's decision (2026-10-27).
- **Intent and Note** are multi-line. Title, Jar Description and Seal Wax Colour are
  `autoComplete="off"`.

## Styling

No stylesheet of its own: the `<form className="form">` sits straight in
the body of a `RouteModal` at the default column, Add Ingredient's
(`size="wide"` until 2026-10-28), its sections styled by `CollapsibleSection` ([`modal.md`](modal.md)), which
scrolls the form when it is taller than the screen. Its look past the tokens
is the grimoire's design review's.

## Stories

`index.stories.tsx`, titled "Grimoire / Spell Builder": `States`, with a
control that chooses Empty, Title Typed, Saved Spell (shared with the coven,
its visibility shut), Private Spell, Share Question, Phase Outside the List
or Refused After Saving, each in its `SpellDialog` over the app shell, with
Open Again to look once more after Close.

## Testing

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
first save and never on a saved spell's, no Cancel, and Close closing at
once, saving first with no question, or staying open on a refused save, and
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
by name. Stories 47 and 48 in
`tests/e2e/stories/06-grimoire.spec.ts` walk it in a browser; story 48 picks
two categories, removes one, saves, and finds the one left on the spell's
card under Drafts.
No story walks the visibility control, since §5's rule governs it rather than a
story, so `tests/e2e/spell-visibility.spec.ts` is its gate spec: a spell written private,
then shared in one confirmed action and the control shut, each step read from the
database. Story 56 checks the Private badge on the author's card.
