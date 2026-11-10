# FacetCombobox

`src/components/FacetCombobox/` shows one filter's closed set with how many entries each value would leave. It is the multi-select box of [`combobox.md`](combobox.md) ("The multi-select box") in a labelled field, with counts on rows and chips, chosen values as outlined chips, and each chosen value a hidden input so the filter's plain GET form sends it. The compendium list's Elements, Forms and Deities filters draw it. Props: `FacetComboboxProps` in `types.ts`.

## Contracts

- **A chosen value is a hidden input**, once per value in the order chosen. The box has no `name`, so it never sends its own text.
- **Before the script loads, the server draws a native `<select multiple>`** under the same `name`, so a person without JavaScript can still add values and send the form with the search's magnifier. It omits a value with nothing behind it (unless chosen) and shows about five rows. The switch is `useHydrated` (`src/lib/hydrated.ts`). With `group`, each group is an `optgroup`.
- **A row and a chip read as name and count together** ("Fire 9"); the chip's x is named "Remove Element: Fire". The x's name does not change when the count arrives, because a placeholder is `aria-hidden`.
- **A value with nothing behind it is left out of the list**, because choosing it would leave an empty list. Disabling rather than hiding was weighed and not followed. `hideZeros={false}` lists them, choosable. A facet whose values are all zero keeps its field, with an empty list.
- **A chosen value with nothing behind it keeps its chip**, so it can always be removed after another filter changed the counts.
- **`counts={false}`** (as In My Covens) draws no count and no loading placeholder, whatever `loading` says.
- **Typeahead and groups are opt-in** (`typeahead`, `group` on a choice). With either, the component draws the typed `Combobox` (`typeahead.tsx`) instead of the select-style multi-select, which cannot type or draw headings:
  - typing keeps rows whose label contains the text; a chosen value is not listed again; a pick clears the text and leaves the list open; Escape, Tab or a press outside closes it; Backspace on empty text takes the last chip off;
  - a row's `group` is its heading, in the order they first appear. Ungrouped rows come after under no heading, so a grouped set gives every choice a `group`;
  - typing matches a choice's label or its group's name (`matchesLabelOrGroup`, `Combobox/match.ts`, shared with the category picker), so "irish" lists every Irish deity;
  - the list toggle says "suggestions" ("Show Forms suggestions"), as every `Combobox` does by default, since a plural label read twice would say "Forms formss".
- **`count`, `disabled` and `note` on a choice** are drawn by both forms; the plain `Combobox` ignores them.

## Styling

Layout only, in `index.scss`: the box, chips and list are the Combobox's (`Combobox/index.scss`, imported here because the multi-select does not import it). The chips use `outlined-chip` (`_mixins.scss`), set by the component.

## Stories and tests

`src/components/FacetCombobox/index.stories.tsx` ("Forms / Facet Combobox", `States`) and `tests/components/FacetCombobox/`. The layout and look are checked in the workshop at 1280 and 375 in both themes, not in happy-dom.
