# FacetCombobox

`src/components/FacetCombobox/` — one filter's closed set, shown with how many
entries each value would leave (M12.4). It is the multi-select box of
[`combobox.md`](combobox.md) ("The multi-select box") in a labelled field, with
counts on its rows and chips, the chosen values outlined chips inside the
control, and each chosen value a hidden input so the filter's plain GET form
sends it. The compendium list's Elements, Forms and Deities filters are meant
to draw it (lanes 3 and 4 of M12.4 wire it in). A client component, for the
box's state.

## Props

`FacetComboboxProps` (`types.ts`):

| Prop               | What it is                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`            | The field's name above the box and the box's accessible name, in title case: "Elements"                                                                              |
| `name`             | The parameter each chosen value is sent under, once per value                                                                                                        |
| `choices`          | The `ComboboxChoice`s on offer: `label`, and `count` where it is known; `icon` and `qualifier` draw as the multi-select draws them                                   |
| `values`           | The values chosen, in the order chosen                                                                                                                               |
| `onChange`         | Called with the whole new list after a value is added or taken out                                                                                                   |
| `typeahead`        | Type to narrow the list: the typed box in place of the select-style one. Also used whenever a choice has a `group`. Off unless set                                   |
| `placeholder`      | A short action shown, muted, while a choice is left: "Add an element"                                                                                                |
| `emptyPlaceholder` | Shown instead of the placeholder when nothing is chosen and every value is left out (all counts 0): defaults to "No" and the label, "No Elements"                    |
| `removeNoun`       | Names a chip's x "Remove {Noun}: {Value}", "Remove Element: Water"                                                                                                   |
| `loading`          | The counts are still being read: each chip holds a placeholder where its count will be                                                                               |
| `counts`           | Whether the values carry counts; on unless `false`. A field without counts (In My Covens, M12.55) draws no count and no loading placeholder, whatever `loading` says |
| `hideZeros`        | Defaults to true: a value with a count of 0 is left out of the list; a chosen value keeps its chip whatever its count                                                |
| `hint`             | The field's `InfoTip` text, if any                                                                                                                                   |
| `className`        | Added to the field's wrapper                                                                                                                                         |

## Contracts

- **A value chosen is sent as a hidden input**, `<input type="hidden" name value>`
  once per value in the order chosen, and none for a value not chosen. The box
  itself has no `name`, so it never sends its own text.
- **Before the script loads the server draws a native `<select multiple>`**
  under the same `name`, holding the values selected, without an option for
  a value with nothing behind it (unless chosen), so a person without
  JavaScript can still add values and send the form with the search's
  magnifier. It is a short list (about five rows) rather than the one-line box.
  The switch is `useHydrated` (`src/lib/hydrated.ts`), which is false on the
  server and true on the client's first render. The native select applies
  nothing on change, since no script runs.
- **A row reads as its name and count together**, "Fire 9", and a chip the
  same, "Fire 9", with the x named "Remove Element: Fire". The x's name does
  not change when the count arrives: a placeholder is `aria-hidden`.
- **A value with nothing behind it is left out** of the list (the owner's call,
  M12.4: choosing it would leave an empty list, and a row that cannot be
  chosen is noise; Smashing's advice to disable rather than hide was weighed
  and not followed). `hideZeros={false}` lists them, choosable. A facet whose
  values are all zero keeps its field, with an empty list.
- **A chosen value with nothing behind it keeps its chip.** It is a chip, so
  it can always be removed, whatever the counts say after another filter
  changed.
- **Typeahead and groups are opt-in** (`typeahead`, and `group` on a choice).
  The default is the select-style multi-select, which cannot type or draw
  headings. With `typeahead`, or with any choice carrying a `group`, the
  component draws the typed `Combobox` instead (`typeahead.tsx`), the way the
  Forms and Deities filters were drawn in the workshop: typing keeps the rows
  whose label contains the text, a chosen value is not listed again, a pick
  clears the text and leaves the list open for the next, the focus in the text (M12.54;
  Escape, Tab or a press outside closes it), and Backspace on empty text takes the last chip off. Chips,
  counts, icons, the loading placeholder, `removeNoun`, `hideZeros` (a zero
  value left out) and the hidden inputs all
  behave as in the default form. A row's `group` is its heading in the list,
  the headings in the order they first appear (the caller's order; for categories the read's alphabetical, M12.52), ungrouped rows after them, under no heading of their own, so a grouped set gives
  every choice a `group`. Typing matches a choice's label or its group's name
  (`matchesLabelOrGroup`, `Combobox/match.ts`, shared with the category picker), so
  "irish" lists every Irish deity. Before
  hydration the native select makes each group an `optgroup`.
  The list toggle and the count it announces say "suggestions" ("Show Forms suggestions"),
  as every `Combobox` does by default, since a plural label read twice would say "Forms formss".
- **`count`, `disabled` and `note` on a choice** are drawn by both forms; the
  plain `Combobox` ignores them.

## Styling

Layout only, in `index.scss`: the box, chips and list are the Combobox's
(`Combobox/index.scss`, imported here because the multi-select does not import
it itself). The chips use the outlined look (`outlined-chip` in `_mixins.scss`),
set by the component and not a prop. The native select is kept to a few rows.
Tokens only.

## Stories

[`index.stories.tsx`](../../src/components/FacetCombobox/index.stories.tsx),
under "Forms / Facet Combobox": `States`, with a control that chooses Default (its list open with every count), Some Chosen (two elements chosen, the list open on the rest, the zero value left out), Counts Loading (chips holding the placeholder), Chosen With Nothing Behind It (a chosen value with a count of 0, still removable), All Zero, Zeros Listed, With Form Icons (icons on rows and chips), Grouped (the Deities filter with tradition headings), With Hint, Custom Empty Text, Narrow (the box in a 16rem column, where chips stack), Typeahead (the Forms
filter with typing) and Without Counts (`counts={false}`, as In My Covens draws it).
Story ids use a double dash between the group and the name, for example
`forms-facet-combobox--states`.

## Testing

`tests/components/FacetCombobox/index.test.tsx` asserts: each value offered
with its count and a choice reaching `onChange`; a zero value left out of the list,
unless `hideZeros` is false, and a facet of only zeros keeping its field; a hidden input per chosen value under the name,
in order; a chip carrying its count with its x named by the noun, with or
without the noun; the x and the clear each reaching the hidden inputs; a chosen
zero-count value removable; the typing form narrowing, hiding chosen values,
submitting, drawing chips and listing no zero; headed groups in the list
and `optgroup`s in the native select; and the server's render being a native multiple
select holding the values without zero rows. The layout and the look are
checked in the workshop at 1280 and 375 in both themes, not in happy-dom.
