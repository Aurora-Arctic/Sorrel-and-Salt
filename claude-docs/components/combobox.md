# Combobox

`src/components/Combobox/` — a text box that suggests as it is typed in, on
Downshift's `useCombobox` (DESIGN.md §14): the hook owns the ARIA and the
keyboard state, and the markup, the rows and the Sass are ours. M5.10a built
it for `IngredientForm`'s form and folk-name lookups, and put it on every
list field's box; MB.131 gave planets, signs, deities and substitutes their
sources, and M5.10 and M8.10 adopt its debounce.

| File         | What it holds                                                                     |
| ------------ | --------------------------------------------------------------------------------- |
| `index.tsx`  | The control, the list in its buckets, the typed row, the status, the indicators   |
| `entry.tsx`  | `ComboboxEntry`, the chip a list draws inside the control, with its × and tooltip |
| `select.tsx` | `ComboboxSelect`, the select-only box for a closed set                            |
| `index.scss` | The control, the list, a row, and the entry chip                                  |
| `types.ts`   | `ComboboxOption`, `Suggestions`, the props, and the row types                     |

## The props contract

| Prop               | Meaning                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | The box's id, which a label element's `htmlFor` names.                                                                                                                        |
| `label`            | What the box is called. Its `aria-label` unless `labelId` is given, and the name of its list, "Form suggestions", its status region and its chevron, "Show Form suggestions". |
| `labelId`          | The id of a label element naming the box, which then carries no `aria-label`.                                                                                                 |
| `value`/`onChange` | The text, held by the caller: a form field's value, or a list's box.                                                                                                          |
| `onPick`           | `(value, option)`: a suggestion chosen, or the typed row, which comes with `null`. The text is the caller's to change, so a field fills itself and a list empties its box.    |
| `onCommit`         | Enter with no suggestion highlighted: a list's add. Without it, Enter closes an open list and otherwise reaches the form, as a text box's does.                               |
| `onRemoveLast`     | Backspace or Delete in an empty box: a list takes its last entry, as react-select does. With text in the box the keys edit it as usual.                                       |
| `suggestions`      | `{ options, pending }` for the text as it stands. Left out for a box with no source, which never opens, has no chevron and no status region.                                  |
| `entries`          | What a list holds, drawn inside the control ahead of the text.                                                                                                                |
| `clear`            | `{ label, onClear }`: a control that empties the list, shown while it holds entries, named "Clear Folk Names".                                                                |
| `inputRef`, `name` | The box's, for react-hook-form.                                                                                                                                               |
| `aria-describedby` | The field's hint and error, read with the box; `aria-invalid` draws the error edge on the control.                                                                            |

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
  hijacked, and the list still opens with an explicit row, "Use what you typed: rhizome", so going past it is a visible choice rather than a discovered behaviour (M4.3a's argument: the vocabulary carries no `Other`). The row is first rather than last, the owner's call: it is the choice a typist most often wants, and one ArrowDown away.
- **Two buckets, told apart by structure.** Rows with `curated` set are
  grouped under "From Compendium" and "From Coven" headings (renamed from
  "Curated" and "In use" during MB.131, on the owner's call), `role="group"` inside the
  listbox, each named by its heading; a source whose rows carry no `curated`
  lists them flat. The distinction is text, never colour alone. Two same-named rows, "Wax (Animal)" and "Wax (Substance)", are told apart in the list by the group in each label, and by nothing after a pick: both write "Wax", since `ingredients.form` stores the string and the group is the vocabulary's alone (DESIGN.md §5).
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

## The select-only box

`ComboboxSelect` (`select.tsx`) is a closed set on the same control and
list, for a field nothing is typed into: `IngredientForm`'s classification
and element, and every closed enum DESIGN.md §14 names. The owner chose it
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

## An entry

`ComboboxEntry({ value, errorId?, onRemove })`, a named export beside the
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
`.is-invalid`. The list floats beneath at the control's width on
`modal-surface($shadow-floating)` with the input's edge; a highlighted row is
a 22% wash of the accent on the card. A bucket's heading is muted small
capitals with a step of space above it, the owner's call during MB.131. A chip is a filled, square-cornered
rectangle in an 18% wash of the muted ink, react-select's shape, and its ×
hovers in the warning's wash and ink. The × and the indicators fade into
their hover as `.btn` does, on `theme-transition` and never under reduced
motion, and draw it on `:focus-visible` as well as `:hover`, so Tab shows
which one it has reached (MB.150). Every × and indicator is a 24px target,
WCAG 2.2's minimum. The owner may restyle any of it at the section's design
review.

## Stories

[`index.stories.tsx`](../../src/components/Combobox/index.stories.tsx):
`TwoBuckets`, a form field with the vocabulary and the forms in use;
`List`, a list's box with its entries inside, an × on each, a pick that adds and Backspace taking the last; and
`NoSource`, a box that never opens. The suggestions are fixed, so typing
filters nothing.

## Testing

`tests/components/Combobox/index.test.tsx` renders the box with fixed
suggestions and asserts: the name from a label or a label element; the rows,
their buckets and the typed row; a row's accessible name carrying its label
and note; picking by keyboard and by click, and the typed row as `null`;
the entry's ×, its tooltip on a cut-off text only, and its error; Enter handed to `onCommit` with the list open or closed, and otherwise
closing the list or reaching the form; Backspace and Delete handed to `onRemoveLast` only from an empty box; Escape, blur and a pick keeping the
text; a box with no source never opening; the status region; the chevron,
the clear and the entries inside the control; two rows reading alike told
apart by their keys; and the select-only box, its name, placeholder, list
and choices, "None" among them. `IngredientForm`'s test drives the select by
the keyboard. Role and label queries only,
in the `dom` project.

`tests/lib/debounce.test.tsx` covers the hook with fake timers.

Accessibility is asserted in Playwright once a page holds the form, as
[`ingredient-form.md`](ingredient-form.md) says; M5.5's admin page carries the
first scan.
