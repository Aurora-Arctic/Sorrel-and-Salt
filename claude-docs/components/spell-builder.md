# SpellBuilder

`src/components/SpellBuilder/` is the form that writes a spell's own fields
(M10.12, story 47): its title, intent, jar size, seal wax colour, moon phase,
day of the week and note, and its jar of ingredients (M10.15, stories 49, 50,
57 and 77). It is a client component. The new-spell page,
`/coven/[slug]/grimoire/new`, draws it empty, reached from New Spell at the
Grimoire's heading, which only an owner or a member is shown; M13.10's edit page,
`/coven/[slug]/grimoire/[id]/edit`, will draw it with a saved spell. Reordering
the steps (M10.16) and instruction steps (M13.3), visibility (M10.13), intent categories
(M10.14) and Mark Complete (M10.20) are later tasks that extend it. There is
no `instructions` field: the ritual is the spell's steps (M13.1).

## Props

`SpellBuilderProps` (`types.ts`):

| Prop          | What it is                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `workspaceId` | The coven the spell belongs to, sent with every save                                                             |
| `spell`       | Optional: a saved spell, its `id`, `revision` and the seven fields (null for one not set). Without it, all empty |

## Saving

- **No field is required.** A draft saves with any one field, or all of them.
  Only marking a spell complete needs a title (the `spells_complete_has_title`
  CHECK, M13.15), and that is M10.20's control, so no label is marked required.
- **Save Spell stays disabled until there is something to save**: a field
  that reads differently from the last save. Blank and spaces alike read as
  none, as the shared schema (`SpellInput`) reads them. The row is
  `FormActions` ([`field.md`](field.md)) with `noun="Spell"`: Save Spell,
  busy as Saving Spell with the spinner from the press to the answer. It has
  no Cancel: the page's Back link leaves (the autosave plan,
  [`design-decisions/m13.14-plan.md`](../design-decisions/m13.14-plan.md)).
- **Created once, then updated.** With no `spell`, the first Save calls
  `createSpell`. The builder then holds the new spell's id and revision, and
  every later Save calls `updateSpell` on that spell with `expectedRevision`
  set to the revision the last save answered. Opened with a `spell`, every
  Save is an update. This is the shape M13.17's autosave adapter takes.
- **What it sends.** The seven fields, trimmed, and null for a blank one, so
  an emptied field is cleared rather than left as it was, and every step, as
  "Steps" below sets out. The steps are the whole recipe: on an update the
  service keeps the steps sent by id, adds the new ones and removes the rest,
  so a step the builder does not send is deleted. A saved instruction step is
  read in and sent back unchanged for that reason.
- **After a save the form starts again from the answer**, so Save goes
  disabled until the next change. The address stays at
  `/coven/[slug]/grimoire/new` after a create: there is no page for one spell
  to go to until MB.6 and M13.10, so reloading the page opens an empty
  builder, and the saved spell is listed under the grimoire's Drafts tab.

## Two error surfaces

As in the ingredient form (M5.9): the shared schema runs as the form's
resolver, so a field it refuses shows its error beneath that field before
the save, and a `VALIDATION` answer's `fieldErrors` for one of the seven
fields show beneath it after, through the same element (`aria-invalid` and
`aria-describedby`), as does an issue the server places on a step's
quantity or unit (`steps.<i>.quantity`, `steps.<i>.unit`). Anything else, such as a viewer's `FORBIDDEN`, goes to
the `Notice` above the fields, in the server's words. The reading is
`placeServerIssues`. Today no builder field has a rule the schema can break
in the browser: the title rule needs `status: complete`, which M10.20 adds.

## Leaving with unsaved changes

`useDiscardGuard` with `DiscardQuestion`, as every long form has (M13.14): a
tab close asks the browser's question, and a link asks "Discard Changes?".
Nothing asks while a save is on its way, or once the changes are saved.
Undo and redo are the shared `FormHistoryButtons` (M12.9).

## The fields

Each field has a one- or two-word placeholder and no info tip, since none
states a rule a person could trip on
([`info-tip.md`](info-tip.md), "When a field gets a tip"). Every value is
stored as typed: the columns are free text
([`../db/grimoire.md`](../db/grimoire.md)).

- **Moon Phase and Day of the Week** sit together in a group headed "When to
  Work It": a `<fieldset className="fieldset">` whose legend names the group
  to a screen reader. They are the recipe's timing, meaning when to work the
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

- **Jar Size and Seal Wax Colour** stay plain text boxes, with no list, by
  the owner's decision (2026-10-27).
- **Intent and Note** are multi-line. Title, Jar Size and Seal Wax Colour are
  `autoComplete="off"`.

## Steps

`steps/` is the jar: the list of steps, the picker that adds to it, and the
spell's derived categories.

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
- **Each row** (`step-row.tsx`, story 50) shows the form's icon and the name
  with its form, a Quantity and a Unit for it, and Remove. An instruction step
  (no name) shows its text only.
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

## Styling

No stylesheet and no wrapper: the `<form className="form">` sits straight in
the page's column. The page uses `page-frame__section page-frame--narrow`
inside the coven layout, the forms' width, left-aligned. Its look past the
tokens is the grimoire's design review's.

## Stories

`index.stories.tsx`, titled "Grimoire / Spell Builder": `States`, with a
control that chooses Empty, Title Typed, Saved Spell or Refused After Saving,
inside the app shell and the page's frame and heading.

## Testing

`tests/components/SpellBuilder/index.test.tsx` uses role and label queries
against MSW, which answers in the route's own error shape. It covers the
empty fields and no Instructions box, no Cancel, nothing to save until a
field holds something, a draft saved with its intent alone, the trimmed
values sent, Save busy then disabled, a second save as an update at the
revision, a saved spell opened and an emptied field cleared, both error
surfaces, and the discard question. `steps.test.tsx` covers the jar: the two
headings, one row per form, a pick adding its row and clearing the search, a
form already in the jar disabled, a one-off and its two refusals, the ids
sent, Remove updating Derived Categories, the unit rule both ways and with no
jar, saved steps sent back by id, and a server issue placed on its step.
`tests/modules/grimoire/services/spell-ingredient-steps.test.ts` reads the
rows a save leaves, and asserts a member of another coven and a viewer are
refused by direct id. The page is
`tests/app/(shell)/coven/[slug]/grimoire/new/page.test.tsx`: the builder for an
owner and a member, and the 404 for a viewer. Story 47 in
`tests/e2e/stories/06-grimoire.spec.ts` walks it in a browser.
