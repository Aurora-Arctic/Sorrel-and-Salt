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

| Prop           | What it is                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `label`        | The field's name above the box and the box's accessible name, in title case: "Elements"                                             |
| `name`         | The parameter each chosen value is sent under, once per value                                                                       |
| `choices`      | The `ComboboxChoice`s on offer: `label`, and `count` where it is known; `icon` and `qualifier` draw as the multi-select draws them  |
| `values`       | The values chosen, in the order chosen                                                                                              |
| `onChange`     | Called with the whole new list after a value is added or taken out                                                                  |
| `placeholder`  | A short action shown, muted, while a choice is left: "Add an element"                                                               |
| `removeNoun`   | Names a chip's x "Remove {Noun}: {Value}", "Remove Element: Water"                                                                  |
| `loading`      | The counts are still being read: each chip holds a placeholder where its count will be                                              |
| `disableZeros` | Defaults to true: a value with a count of 0 is listed last, disabled, and noted "Nothing Matches"; a chosen value is never disabled |
| `hint`         | The field's `InfoTip` text, if any                                                                                                  |
| `className`    | Added to the field's wrapper                                                                                                        |

## Contracts

- **A value chosen is sent as a hidden input**, `<input type="hidden" name value>`
  once per value in the order chosen, and none for a value not chosen. The box
  itself has no `name`, so it never sends its own text.
- **Before the script loads the server draws a native `<select multiple>`**
  under the same `name`, holding the values selected, with a disabled option for
  a value with nothing behind it (unless chosen), so a person without
  JavaScript can still add values and send the form with the search's
  magnifier. It is a short list (about five rows) rather than the one-line box.
  The switch is `useHydrated` (`src/lib/hydrated.ts`), which is false on the
  server and true on the client's first render. The native select applies
  nothing on change, since no script runs.
- **A row reads as its name and count together**, "Fire (9)", and a chip the
  same, "Fire (9)", with the x named "Remove Element: Fire". The x's name does
  not change when the count arrives: a placeholder is `aria-hidden`.
- **A value with nothing behind it** is disabled and listed after every value
  that can be chosen, its note "Nothing Matches" beside its count, because
  choosing it would leave an empty list. It keeps its text's ink; it is truly
  disabled rather than dimmed. The list closes once only such rows remain.
  `disableZeros={false}` leaves them choosable.
- **A chosen value with nothing behind it is never disabled.** It is a chip, so
  it can always be removed, whatever the counts say after another filter
  changed.
- **Only a select-style multi-select**: nothing is typed and there are no group
  headings. A filter that needs typing (Forms, with many values) or headings
  (Deities, grouped by tradition) needs either a typed variant of this
  component, or `Combobox` with `entries` directly, as `CategoryPicker` does.
  The workshop's `.ladle/facet-layout.stories.tsx` drew those two with the typed
  box; this component does not cover them.
- **`count`, `disabled` and `note` on a choice** are the multi-select's; the
  select-only box ignores them.

## Styling

Layout only, in `index.scss`: the box, chips and list are the Combobox's
(`Combobox/index.scss`, imported here because the multi-select does not import
it itself). The chips use the outlined look (`outlined-chip` in `_mixins.scss`),
set by the component and not a prop. The native select is kept to a few rows.
Tokens only.

## Stories

[`index.stories.tsx`](../../src/components/FacetCombobox/index.stories.tsx),
under "Admin / Facet Combobox": `NothingChosen`, its list open with every count;
`SomeChosen`, two elements chosen, the list open on the rest and the zero row
last; `CountsLoading`, chips holding the placeholder; `ChosenWithNothingBehindIt`,
a chosen value with a count of 0, still removable; `WithFormIcons`, icons on
rows and chips; and `Narrow`, the box in a 16rem column, where chips stack.
Story ids use a double dash between the group and the name, for example
`admin--facet-combobox--some-chosen`.

## Testing

`tests/components/FacetCombobox/index.test.tsx` asserts: each value offered
with its count and a choice reaching `onChange`; a zero row last and disabled,
unless `disableZeros` is false; a hidden input per chosen value under the name,
in order; a chip carrying its count with its x named by the noun, with or
without the noun; the x and the clear each reaching the hidden inputs; a chosen
zero-count value removable; and the server's render being a native multiple
select holding the values with zero rows disabled. The layout and the look are
checked in the workshop at 1280 and 375 in both themes, not in happy-dom.
