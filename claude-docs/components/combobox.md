# Combobox

`src/components/Combobox/` — a text box that suggests as it is typed in, on
Downshift's `useCombobox` (DESIGN.md §14): the hook owns the ARIA and the
keyboard state, and the markup, the rows and the Sass are ours. M5.10a built
it for `IngredientForm`'s form and folk-name lookups, and put it on every
list field's box; MB.131 gave planets, signs, deities and substitutes their
sources, and M5.10 and M8.10 adopt its debounce. MB.170 made a list's chips
movable, on dnd-kit.

| File               | What it holds                                                                     |
| ------------------ | --------------------------------------------------------------------------------- |
| `index.tsx`        | The control, the list in its buckets, the typed row, the status, the indicators   |
| `entry.tsx`        | `ComboboxEntry`, the chip a list draws inside the control, with its × and tooltip |
| `sortable.tsx`     | `ComboboxSortableEntries`, a list's chips moved by a handle each, on dnd-kit      |
| `flow.ts`          | Where a sortable list's chips sit in a given order, and where a key moves one     |
| `tip.ts`           | `useTip`, the open state an entry's tooltip and the qualifier's share             |
| `select.tsx`       | `ComboboxSelect`, the select-only box for a closed set                            |
| `multi-select.tsx` | `ComboboxMultiSelect`, the select-only box holding several, its choices as chips  |
| `icons.tsx`        | The chevron and the clear's ×, which every box draws, and a sortable chip's grip  |
| `index.scss`       | The control, the list, a row, and the entry chip                                  |
| `types.ts`         | `ComboboxOption`, `Suggestions`, the props, and the row types                     |

## The props contract

| Prop               | Meaning                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | The box's id, which a label element's `htmlFor` names.                                                                                                                            |
| `label`            | What the box is called. Its `aria-label` unless `labelId` is given, and the name of its list, "Form suggestions", its status region and its chevron, "Show Form suggestions".     |
| `labelId`          | The id of a label element naming the box, which then carries no `aria-label`.                                                                                                     |
| `value`/`onChange` | The text, held by the caller: a form field's value, or a list's box.                                                                                                              |
| `onPick`           | `(value, option)`: a suggestion chosen, or the typed row, which comes with `null`. The text is the caller's to change, so a field fills itself and a list empties its box.        |
| `onCommit`         | Enter with no suggestion highlighted: a list's add. Without it, Enter closes an open list and otherwise reaches the form, as a text box's does.                                   |
| `onRemoveLast`     | Backspace or Delete in an empty box: a list takes its last entry, as react-select does. With text in the box the keys edit it as usual.                                           |
| `suggestions`      | `{ options, pending }` for the text as it stands. Left out for a box with no source, which never opens, has no chevron and no status region.                                      |
| `entries`          | What a list holds, drawn inside the control ahead of the text.                                                                                                                    |
| `qualifier`        | `{ text, detail? }`: what a pick leaves out of the text, a picked form's group, in brackets after the text, muted, its detail in a tooltip. See "A qualifier".                    |
| `clear`            | `{ label, onClear }`: a control that empties the list, shown while it holds entries, named "Clear Folk Names".                                                                    |
| `listAnchor`       | The element the open list spans and opens beside: a list field's row, its box and its Add together. The control when left out. See "Where the list opens".                        |
| `create`           | `{ label, onCreate }`: a first row that makes something new, "Add a reference", in place of the typed row, there with a blank box too. See "The create row".                      |
| `offerTyped`       | Whether the typed row is offered; `true` unless said. A list passes `false` for text it would refuse, a repeat (MB.174). Enter with nothing highlighted still reaches `onCommit`. |
| `inputRef`, `name` | The box's, for react-hook-form.                                                                                                                                                   |
| `aria-describedby` | The field's hint and error, read with the box; `aria-invalid` draws the error edge on the control.                                                                                |

A `ComboboxOption` is `{ value, label?, note?, curated?, key? }`: the text a
pick writes, the row's text when it is more than the value ("Wax (Animal)"), a
second line, which bucket it is in, and what tells it from a row that reads
the same. A row is keyed, for React and for Downshift, by `key` when it has
one and by its bucket, label and value otherwise: two substitute suggestions
can share all three, a compendium entry and the coven's own copy of it, and
only the ingredient's id tells them apart (MB.131). The row's accessible name is its
label and its note, so two same-named forms are told apart by a screen
reader as well as by the eye, and so is who claims a value.

## Behaviour

- **It changes no text itself.** Typing is reported through `onChange` and a
  pick through `onPick`; Downshift's own fill-on-select is turned off in the
  state reducer, as are its select-on-blur and its emptying of a closed box on
  Escape. So a blur, Escape and Enter all keep what was typed.
- **Free text is the default.** Nothing is highlighted when the list opens:
  an arrow key or the pointer highlights a row, and only a highlighted row is
  picked by Enter or a click. Typing past the vocabulary is therefore never
  hijacked, and the list still opens with an explicit row, "Use what you typed: rhizome", so going past it is a visible choice rather than a discovered behaviour (M4.3a's argument: the vocabulary carries no `Other`). The row is first rather than last, the owner's call: it is the choice a typist most often wants, and one ArrowDown away. A caller passes `offerTyped={false}` for text it would refuse, and the row is not offered: a list does so for a repeat of what it holds (MB.174), so the row never offers what Add would refuse. Enter with nothing highlighted still reaches `onCommit`, which says why; with no suggestions either, the list stays shut.
- **Two buckets, told apart by structure.** Rows with `curated` set are
  grouped under "From Compendium" and "From Coven" headings (renamed from
  "Curated" and "In use" during MB.131, on the owner's call), `role="group"` inside the
  listbox, each named by its heading. The headings say where a value comes
  from, and are true because a compendium entry holds curated values alone
  (MB.162), so every value in use outside the lists is the coven's; a source whose rows carry no `curated`
  lists them flat. The distinction is text, never colour alone. Two same-named rows, "Wax (Animal)" and "Wax (Substance)", are told apart in the list by the group in each label. Both write "Wax", since `ingredients.form` stores the string, so after a pick the box tells them apart by its qualifier, the group a caller passes for the row it picked (MB.169; DESIGN.md §5).
- **It opens as text is typed, on ArrowDown, and from its chevron**, and only
  once there are rows: a list wanted while the lookup is pending opens as
  the rows arrive, the typed row counting as one. A box with no source never
  opens.
- **Enter.** A highlighted row is picked. Otherwise, with `onCommit`, Enter is
  the caller's and never the form's submit: a list adds the text. Without
  `onCommit`, Enter closes an open list, and on a closed box reaches the form
  as any text box's Enter does.
- **The control is the box.** A press on its padding, or between the entries,
  puts the caret in the text, as pressing a plain input would. The control is
  `role="presentation"`: the box inside it is what a reader and the keyboard
  reach.
- **The list is announced.** A visually hidden `<output>`, named "Form
  suggestions", reads "3 suggestions", "No suggestions" or "Looking for
  suggestions" while the list is open and nothing while it is closed. Its own
  region rather than Downshift's `getA11yStatusMessage`, which announces on
  the box's state and not on rows arriving after the debounce. The ListField's
  own `<output>` for adds and removals is named "Folk Names changes" so the
  two are told apart.
- **The entries sit inside the control**, ahead of the text, each a chip with
  its own × — the owner's call, after react-select's multi-select — with the
  clear and the chevron on the control's right, parted by a line. Backspace or Delete in an empty box takes the last entry through `onRemoveLast`. The chip's
  classes, `combobox__entry` and `combobox__entry-remove`, are drawn here so
  that any list reuses them; `IngredientForm`'s entry adds its tooltip.

## Where the list opens

The owner's calls in MB.154. `useListPosition` (`position.ts`) places the
open list on Floating UI's `useFloating` (DESIGN.md §14):

- **As wide as its anchor.** A list field passes its row as `listAnchor`,
  so its list spans the box and its Add together, the field's whole width;
  a box with no anchor, the form field, spans itself. The field holds the
  row in state through a callback ref, so the box is told once it exists.
- **Never off the screen.** It opens beneath the box and flips above when
  there is more room there (`flip`), 8px from the screen's edge, and is no
  taller than the room it has: `size` sets `--combobox-list-room`, and the
  stylesheet caps the list at `min(20rem, that)`, which holds the eight
  seeded category groups without a scroll (M5.6, the owner's call). Its side is
  `data-placement`, "bottom-start" or "top-start".
- **Followed while open, and only then.** `autoUpdate` re-places it on a
  scroll or a resize; a closed list, which Downshift keeps in the page, is
  not followed.
- **Fixed, not absolute**, so a scrolling ancestor — M8.16's modal — cannot
  clip it.
- **A row never scrolls it sideways**: a word too long for the list, an
  address in a citation, breaks anywhere (`overflow-wrap: anywhere` on the
  row, `overflow-x: hidden` on the list).

jsdom lays nothing out, so the tests give the viewport, the box, the anchor
and the list the sizes Floating UI reads, as the sortable tests give the
chips theirs.

## The create row

A list whose entries can only be picked, the references' (MB.154), has
nothing to do with what was typed: a search is not a source. Its caller
passes `create`, and the list's first row reads its label, "Add a
reference", in the typed row's place and italic as that row is. It is there
whatever the box holds, a blank box included, so ArrowDown or the chevron
opens the list on it even before any suggestion has arrived. Picking it, by
click or by Enter, calls `onCreate` and never `onPick`, and leaves the text
as typed. The caller still passes an `onCommit`, a no-op for the
references, so that Enter with nothing highlighted never reaches the form.

**A second pick keeps the text** (a regression MB.154 found and fixed).
Downshift remembers the last row picked, and with `selectedItem` held at
`null` the next pick read as that prop changing, so Downshift wrote the null
item's text, `''`, into the box. A list empties its box on a pick anyway, so
nothing showed it until the create row, picked twice, emptied a search. The
state reducer keeps the text on `ControlledPropUpdatedSelectedItem` as it
does on a click or Enter.

**A browser script must wait a frame between a click and a key.** Downshift
reports a click's close through an effect, so a key pressed before React
commits it is handled by the last render, which still has the list open:
ArrowDown then moves the highlight rather than opening the list. Playwright's
`locator.press` straight after a pick does this; a person moving from the
mouse to the keys never does, and with half a second between them the list
opens every time (traced during MB.154's browser pass). It is not a defect,
and there is nothing to fix.

## The select-only box

`ComboboxSelect` (`select.tsx`) is a closed set on the same control and
list, for a field nothing is typed into: `IngredientForm`'s classification,
and every closed enum DESIGN.md §14 names. A closed set holding several
values is its multi-select sibling, below. The owner chose it
over the native `<select>` during MB.131, so a form's fields share one look
([`design-decisions/mb.131-closed-sets-on-the-combobox.md`](../design-decisions/mb.131-closed-sets-on-the-combobox.md)).
It is Downshift's `useSelect`, the hook for ARIA 1.2's select-only combobox:
the control itself is the `role="combobox"` element, a `div` in the tab
order, labelled by the field's label through `aria-labelledby`, with the
field's hint and error, `aria-invalid` and `aria-required` on it. A press,
ArrowDown or ArrowUp opens the list on the current choice; the arrows move,
Enter or Space chooses, Escape closes and keeps the choice, and a letter
jumps to the choice it starts.

| Prop                 | Meaning                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `id`, `labelId`      | The box's id and its label element's; without `labelId`, `label` is its `aria-label`.           |
| `label`              | What the box is called, and its list's name, "Classification choices".                          |
| `value`/`onChange`   | The chosen value, held by the caller.                                                           |
| `choices`            | `{ value, label }` in order. One whose value is `''` is the choice that clears the set: "None". |
| `placeholder`        | Shown, muted, while the value is none of the choices; never in the list.                        |
| `required`           | `aria-required`, as the field marks it.                                                         |
| `inputRef`, `onBlur` | The box's, for react-hook-form, which focuses the box on an error.                              |

The chevron is drawn inside the control and hidden from assistive
technology, since the whole control is the one target. The control takes the
focus ring itself, where a suggesting box draws it for its inner text.

## The multi-select box

`ComboboxMultiSelect` (`multi-select.tsx`) is the select-only box for a
closed set holding several values, in the order chosen: `IngredientForm`'s
element since MB.159. It looks as a list field does, react-select's
multi-select, the owner's call: each value chosen is a chip inside the
control ahead of the box, the same `ComboboxEntry` a list draws with its ×,
and a clear, "Clear Element", and the chevron sit on the control's right,
parted by a line. Nothing is typed and nothing is added by a button: the
list is the only way in, and it offers only the choices not yet made, so
none is chosen twice.

It is Downshift's `useSelect` with `useMultipleSelection`, the pairing
Downshift documents for a multi-select, rather than keys handled by hand.
`useSelect` owns the box and its list as `ComboboxSelect`'s does: a press,
ArrowDown or ArrowUp opens it, the arrows move, Enter or Space chooses,
Escape closes, and a letter jumps. `useMultipleSelection` holds the chosen
list and gives the box Backspace, which takes the last chip. Its own chip
focus, the arrows moving between chips, is held off (`activeIndex` at -1):
each chip's × is already a button in the tab order, as every list's is, and
a second way through the chips would be a second tab model for one look.

- **A choice appends, and the list stays open** for the next, with the row
  below the chosen one under the highlight, as Downshift's multi-select
  does. Once every choice is made the list has nothing to offer and does
  not open.
- **The control is presentational and the box inside it is the combobox**,
  as the typed box's is, rather than the whole control as in
  `ComboboxSelect`: the chips' × and the clear are buttons, and inside the
  combobox a press or a key on them would be the box's too. The box takes
  the text's place after the chips. It reads what it holds, "Air, Fire", in
  visually hidden text, as a select reads its choice, and the placeholder
  while nothing is chosen. A press on the control's padding or its chevron
  opens the list as a press on the box does.
- **An × or the clear leaves the focus in the box**, since the pressed
  button goes; the box is found by its id, since the caller's ref and
  Downshift's two already share it.
- **Each change is announced** in a visually hidden `<output>` named
  "Element changes", "Added Air", "Removed Air" or "Cleared Element", as a
  list field's are (WCAG 4.1.3).

| Prop                 | Meaning                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `id`, `labelId`      | The box's id and its label element's; without `labelId`, `label` is its `aria-label`.     |
| `label`              | What the box is called, its list's name, "Element choices", its clear's and its status's. |
| `values`/`onChange`  | The values chosen, in order, held by the caller; every change comes as the whole list.    |
| `choices`            | `{ value, label }` in order; the list offers those not in `values`.                       |
| `placeholder`        | Shown, muted, while nothing is chosen; never in the list.                                 |
| `required`           | `aria-required`, as the field marks it.                                                   |
| `inputRef`, `onBlur` | The box's, for react-hook-form, which focuses the box on an error.                        |

## An entry

`ComboboxEntry({ value, errorId?, detail?, onRemove })`, a named export beside the
default, is the chip a list passes in `entries`, inside a
`ul.combobox__entries`. It is MB.133's entry moved out of `IngredientForm`
so that every list draws the same one:

- **Its × is a real button**, in the tab order, named "Remove Hedge Fixture"
  rather than a bare "Remove", a 24px target, with the focus ring, and
  described by the list's error when `errorId` names this entry, which also
  draws the error edge on the chip. Backspace in the empty box is the other
  way to take the last entry.
- **A long text is cut off, never wrapped or let run.** The chip is no wider
  than the control, and its text ends in an ellipsis where the control does,
  so every chip stays one line and nothing scrolls the page sideways at
  320px. The × never shrinks: the text gives way. The whole text stays
  reachable three ways: it is the entry's text in the DOM, so a screen reader
  reads it in full; the × is still named by it; and a tooltip,
  `role="tooltip"`, shows it above the chip while the entry is hovered or its
  × has focus. It is InfoTip's bubble and fade, through the `tip-bubble`
  mixin, stays in the page while closed, faded out and `aria-hidden`, opens
  only on an entry that is cut off, measured as it opens, closes on Escape
  (WCAG 1.4.13), waits 150ms before closing as the pointer leaves so the
  pointer can cross onto it, and breaks an unbroken text anywhere to stay
  inside the control.
- **A detail tells what the chip leaves out** (MB.164). `detail`, a string
  such as a linked substitute's "Dried leaf · Compendium entry — A fixture
  herb.", sits on its own line beneath the text in the tooltip, at the
  caption size and in the bubble's own colour, since a muted one is not
  checked against the bubble's ground. An entry with a detail always has
  something to show, so its tooltip opens on hover and on its ×'s focus
  whether the text is cut off or not. The detail also describes the ×, after
  the list's error when one names the entry, so a screen reader hears it
  without the tooltip: the reference reads it although the tooltip is
  `aria-hidden` while closed.

## A sortable list

`ComboboxSortableEntries({ entries, onMove })`, a named export, is what a
list whose order means something passes in `entries` in place of its own
`ul.combobox__entries` (MB.170). Each of `entries` is a chip's props with an
`id`, its identity as it moves, which a react-hook-form list takes from its
field array's `id`; `onMove(from, to)` is told of each entry put down in
another's place, as indexes into `entries`, and the caller reorders. It is
on dnd-kit's sortable preset, `@dnd-kit/core` and `@dnd-kit/sortable`, a
standard package rather than a bespoke one, the task's preference
(DESIGN.md §14, "A library to move a list's entries?"):

- **Each chip's handle is its grip and its text, one button**, the owner's
  call: six muted dots ahead of the text, so the chip reads as one and
  shows it can be moved. It is a real `<button>`, in the tab order before the
  chip's ×, with the focus ring, named for its entry as the × is, "Move
  Mars", carrying dnd-kit's `aria-roledescription="sortable"`, and described
  by the list's error and the entry's detail as the × is, then by how it
  moves: "Press Space or Enter to pick it up, the arrow keys to move it, and
  Space or Enter to put it down, or Escape to cancel." Its focus opens the
  chip's tooltip, as the ×'s does. A list that is not sortable draws its
  text bare, as before, with nothing to move it by.
- **By pointer**, the chip is dragged onto another's place, the others
  sliding aside, and dropped. A drag starts only once the pointer has moved
  4px, so a press focuses the handle and opens its tooltip rather than
  starting one. `touch-action: none` on the handle lets a touch drag move the
  chip rather than the page. A pointer's chip is over whichever place's
  centre is nearest its own, as dnd-kit's closest-centre collision has it.
- **The chips making way sit where the row will put them.** dnd-kit's
  `rectSortingStrategy` moves each chip onto the box of the chip whose place
  it takes, which suits a grid of equal cells; chips of different widths
  then overlapped, or left gaps, the owner's report during MB.170. So
  [`flow.ts`](../../src/components/Combobox/flow.ts) lays the chips out as
  the wrapping row does: in the order the move would give, each as wide as
  it is, `columnGap` apart along a row and onto the next row once the list's
  width is used up. The row's shape, its width and gaps, is measured as a
  move starts (`shapeOf`), from the stylesheet, or from where the chips sit
  where there is none, as in jsdom. Each chip making way, and the moved chip
  under the keyboard, is translated to its place in that layout, never
  scaled, so what is shown while the chip is held is what the drop leaves.
- **By keyboard**, Space or Enter lifts the focused chip, and Space or Enter
  puts it down, or Escape puts it back. Between, Left and Right step it a
  place along the list, whichever row that place is on; Up and Down jump it
  a row, to the place on the row above or below whose centre is nearest its
  own, and stay put from the first row or the last; and Home and End take
  it to either end. Past either end it stays. The rows are those of the
  layout the chips have at that moment, `flow.ts`'s, and the key is read by
  `placeFor`. dnd-kit's own `sortableKeyboardCoordinates` goes by where the
  chips sit, taking the nearest chip in the arrow's direction, and across
  wrapped rows of chips of different widths that is not the next one: Left
  from the second chip on a row landed on the row above, the owner's report
  during MB.170. So the list's own coordinate getter chooses the place, sets
  the chip at its place in the layout that makes, and records it as the
  target, which the list's collision detection returns for a keyboard move
  in place of the nearest box. A pointer move, which has pointer
  coordinates, still takes the nearest. The focus stays on the moved chip's
  handle throughout and after.
- **Each step is said** in dnd-kit's live region, worded here by the entry's
  text and place rather than dnd-kit's default, which names the id: "Picked
  up Mars, at position 1 of 3.", "Mars moved to position 2 of 3.", "Mars put
  down at position 2 of 3.", and "Move cancelled. Mars is back at position 1
  of 3." dnd-kit reports a lifted chip over its own place at once, which would
  talk over the lift, so that one report is left unsaid. The region and the
  instructions take their ids from `useId`, since dnd-kit's own counter
  would number a server render and the browser's apart.

## A qualifier

`qualifier`, `{ text, detail? }`, is what a pick leaves out of the box's
text (MB.169). `IngredientForm`'s Form box passes a picked form's group,
"Substance" for a picked "Wax", and its description as the detail. The box only
draws it. Whether a pick holds, and when an edit drops it, is the caller's
call.

- **It follows the text, in brackets and muted**, so the box reads as the
  row picked did, "Wax (Substance)", the owner's call. The muted ink is the
  row's note's. The text's slot is as wide as the text while a qualifier
  shows, sized by a hidden copy of the value in a one-cell grid, so the
  qualifier sits straight after it; the slot is always in the page, so a pick
  never remounts the box and takes its focus. The qualifier never shrinks: it
  is a word or two, and a long text gives way first. A press on it puts the
  caret in the text, as a press on the control's padding does.
- **It is the box's description.** The input's `aria-describedby` lists the
  caller's description first, a field's hint and error, then the qualifier's
  text and its detail. A screen reader hears "(Substance)" without the
  tooltip, and the reference reads the detail although its tooltip is
  `aria-hidden` while closed.
- **The detail is a tooltip**, `role="tooltip"`, in the entry tooltip's
  bubble and fade, above the control from its left edge, no wider than the
  control. It opens while the qualifier is hovered and while the box has
  focus: the qualifier is not a tab stop of its own, and the box is what the
  keyboard reaches. Escape closes it (WCAG 1.4.13), as do a blur and the
  pointer leaving, after the same 150ms the entry's waits. With no detail
  there is no tooltip. Open on focus, the bubble covers what sits above the
  control, a field's label; the owner left that to the admin area's design
  review (MB.115), the keyboard still to reach it.
- **The open state is `useTip`** (`tip.ts`), shared with `ComboboxEntry`:
  open while `canOpen` says there is something to show, closed at once on
  blur and on Escape anywhere in the document, and after 150ms when the
  pointer leaves.

## The debounce

`src/lib/debounce.ts` holds the one debounce a typed lookup waits on:
`useDebouncedValue(value, delayMs = DEBOUNCE_MS)` returns the value once it has
stopped changing for 300ms, starting as the first value given so a lookup
waits on typing and never on mounting. M5.10a built it here because M8.10,
whose search was to carry it, had not landed; M5.10 and M8.10 adopt it rather
than a second one.

## Styling

Tokens, mixins and the form primitives only. The control is the `.input`
primitive opened up as a wrapping flex row, its padding a step down so the
entries sit inside it; the ring and the error edge are drawn on the control
from the box's own states, `:has(.combobox__input:focus-visible)` and
`.is-invalid`. The multi-select's box takes the text's place and styles,
`.combobox__input--select`, so the same ring is drawn for it. The list floats beneath at the control's width on
`modal-surface($shadow-floating)` with the input's edge; a highlighted row is
a 22% wash of the accent on the card. A bucket's heading is muted small
capitals with a step of space above it, the owner's call during MB.131. A chip is a filled, square-cornered
rectangle in an 18% wash of the muted ink, react-select's shape, and its ×
hovers in the warning's wash and ink. A box stands at `$control-height`, level with a text field and a button
(MB.154): its text line, `$text-height`, is the control's height less its
1px edge and its `space(1)` padding, and a typed box, a select's value and
the qualifier's hidden copy all take it. The chip list carries `space(1)`
above and below, so the first of several rows of chips does not sit against
the top edge, the owner's call during MB.169; on the list rather than the
control, as it was, so one row still fits the text's line and a box with
chips stays at the control's height. Rows
that wrap sit a step further apart than the items in a row, `space(2)`
between rows and `space(1)` along one, in the control, the values and the
chips alike, the owner's call for MB.170, so wrapped chips no longer read as
one block. A sortable chip's handle is unboxed, so the chip still reads as
one, with the focus ring and a grab cursor; its grip is the muted ink and
stands in for the text's left inset. The chip being moved is plain to see
once picked up, by keyboard or pointer, the owner's call during MB.170: the
accent's 22% wash that a highlighted row wears, a 2px accent edge, the
floating shadow, and its grip in the body ink. The accent edge stands in
for an error's while the chip is held, and the error's comes back on the
drop; the focus ring around its text is left off meanwhile, since the edge
already marks it. The chips making way slide on
dnd-kit's inline transition, which only an important rule outweighs, so
under reduced motion they step instead. The
qualifier is the muted ink at the text's size, as a row's note is muted, and its tooltip is the entry's bubble, the
`tip-bubble` mixin. The × and the indicators fade into
their hover as `.btn` does, on `theme-transition` and never under reduced
motion, and draw it on `:focus-visible` as well as `:hover`, so Tab shows
which one it has reached (MB.150). Every × and indicator is a 24px target,
WCAG 2.2's minimum. The owner may restyle any of it at the section's design
review.

## Stories

[`index.stories.tsx`](../../src/components/Combobox/index.stories.tsx):
`TwoBuckets`, a form field with the vocabulary and the forms in use;
`List`, a list's box with its entries inside, an × on each, a pick that adds and Backspace taking the last; and
`Sortable`, seven planets wrapping onto a second row, each moved by its grip
and text, by pointer or keyboard; `NoSource`, a box that never opens; `Qualifier`, "Wax" picked under
Substance, the group in the box and its description in a tooltip, dropped by
an edit; `SelectOnly`, the select-only box; and
`MultiSelect`, the multi-select box with two elements chosen; and
`CreateRow`, "Add a reference" first whatever is typed, saying beneath the
box each time it is picked. The suggestions are fixed, so typing filters
nothing.

## Testing

`tests/components/Combobox/index.test.tsx` renders the box with fixed
suggestions and asserts: the name from a label or a label element; the rows,
their buckets and the typed row; a row's accessible name carrying its label
and note; picking by keyboard and by click, and the typed row as `null`;
the list as wide as its anchor, or the box with none, and opening above
the box with no room beneath it, its height held to the room on the side it
opens; the text kept through a second pick; the create row first in the typed
row's place, there with a blank box and with no suggestions, calling
`onCreate` by click or keyboard and never `onPick`; the typed row withheld
under `offerTyped={false}`, the suggestions still shown, Enter still handed
to `onCommit`, and the list shut when it would have been the only row;
the entry's ×, its tooltip on a cut-off text only, and its error; the
qualifier drawn inside the control before the clear, read as the box's
description after the field's own, its detail's tooltip on hover and on the
box's focus, closed by Escape and blur, and none without a detail; Enter handed to `onCommit` with the list open or closed, and otherwise
closing the list or reaching the form; Backspace and Delete handed to `onRemoveLast` only from an empty box; Escape, blur and a pick keeping the
text; a box with no source never opening; the status region; the chevron,
the clear and the entries inside the control; two rows reading alike told
apart by their keys; and the select-only box, its name, placeholder, list
and choices, "None" among them; and the multi-select box, its name and
placeholder, chips inside the control in the order chosen, the list
offering only what is left and staying open, the arrows, Enter, Space and
Escape, Backspace taking the last, an × and the clear, a press on the
control opening it, its announcements, and nothing to offer once every
choice is made; and a sortable list, each chip's handle named for it
ahead of its ×, saying how it moves, a move by Space or Enter and the
arrows said at each step with the focus kept on the moved chip, Escape
putting it back, a move by pointer, a press or a lift put straight back
moving nothing, the × still removing, and the handle's focus opening the
chip's tooltip and reading its error and detail first; a held chip pressed
and marked as picked up; and, on wrapped rows of chips of different widths,
Left and Right a place along the list whichever row it is on, Up and Down
a row to the nearest place, Left from a row's start onto the row above and
back, Home and End to either end, nothing past either end or row, and the
chips laid out while one is held as the row would lay them, with no
overlap or gap; a list that is not
sortable has no handle. `IngredientForm`'s test drives the select by the keyboard. Role and label queries only,
in the `dom` project.

jsdom lays nothing out, and dnd-kit finds where a chip may go from each
chip's box, so `tests/support/sortable.ts` gives every chip one, on one
line 100px apart, or with `wrapChips` as wide as its text and wrapped onto
rows as the control wraps them, and drives a move: `moveByKeyboard` waits a task after
each key, since the keyboard sensor listens a task after the lift, and
`dragByPointer` waits out the 50ms after a drag in which the sensor
swallows every click, so that it swallows no later test's.

`tests/lib/debounce.test.tsx` covers the hook with fake timers.

Accessibility is asserted in Playwright once a page holds the form, as
[`ingredient-form.md`](ingredient-form.md) says; M5.5's admin page carries the
first scan.
