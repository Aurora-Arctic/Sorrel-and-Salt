# FacetCombobox

`src/components/FacetCombobox/` shows one filter's closed set with how many entries each value would leave. It is the multi-select box of [`combobox.md`](combobox.md) ("The multi-select box") in a labelled field, with counts on its rows and chips, the chosen values as outlined chips inside the control, and each chosen value a hidden input so the filter's plain GET form sends it. The compendium list's Elements, Forms and Deities filters draw it. It is a client component, for the box's state. Its props are in `types.ts` (`FacetComboboxProps`).

## Contracts

- **A value chosen is sent as a hidden input**, `<input type="hidden" name value>` once per value in the order chosen, and none for a value not chosen. The box itself has no `name`, so it never sends its own text.
- **Before the script loads the server draws a native `<select multiple>`** under the same `name`, holding the values selected, without an option for a value with nothing behind it (unless chosen). A person without JavaScript can still add values and send the form with the search's magnifier. It is a short list (about five rows) rather than the one-line box. The switch is `useHydrated` (`src/lib/hydrated.ts`), which is false on the server and true on the client's first render. The native select applies nothing on change, since no script runs.
- **A row reads as its name and count together**, "Fire 9", and a chip the same, with the x named "Remove Element: Fire". The x's name does not change when the count arrives, because a placeholder is `aria-hidden`.
- **A value with nothing behind it is left out** of the list, because choosing it would leave an empty list and a row that cannot be chosen is noise. Disabling rather than hiding was weighed and not followed. `hideZeros={false}` lists them, choosable. A facet whose values are all zero keeps its field, with an empty list.
- **A chosen value with nothing behind it keeps its chip.** It is a chip, so it can always be removed, whatever the counts say after another filter changed.
- **A field without counts** (`counts={false}`, as In My Covens) draws no count and no loading placeholder, whatever `loading` says.
- **Typeahead and groups are opt-in** (`typeahead`, and `group` on a choice). The default is the select-style multi-select, which cannot type or draw headings. With `typeahead`, or with any choice carrying a `group`, the component draws the typed `Combobox` instead (`typeahead.tsx`):
  - typing keeps the rows whose label contains the text; a chosen value is not listed again; a pick clears the text and leaves the list open for the next, with the focus in the text; Escape, Tab or a press outside closes it; Backspace on empty text takes the last chip off;
  - chips, counts, icons, the loading placeholder, `removeNoun`, `hideZeros` and the hidden inputs all behave as in the default form;
  - a row's `group` is its heading in the list, the headings in the order they first appear (the caller's order; for categories the read's alphabetical). Ungrouped rows come after them under no heading of their own, so a grouped set gives every choice a `group`. Before hydration the native select makes each group an `optgroup`;
  - typing matches a choice's label or its group's name (`matchesLabelOrGroup`, `Combobox/match.ts`, shared with the category picker), so "irish" lists every Irish deity;
  - the list toggle and the count it announces say "suggestions" ("Show Forms suggestions"), as every `Combobox` does by default, since a plural label read twice would say "Forms formss".
- **`count`, `disabled` and `note` on a choice** are drawn by both forms; the plain `Combobox` ignores them.

## Styling

Layout only, in `index.scss`: the box, chips and list are the Combobox's (`Combobox/index.scss`, imported here because the multi-select does not import it itself). The chips use the outlined look (`outlined-chip` in `_mixins.scss`), set by the component and not a prop. The native select is kept to a few rows. Tokens only.

## Not here

Stories: `src/components/FacetCombobox/index.stories.tsx` ("Forms / Facet Combobox", `States`; story ids use a double dash between the group and the name, for example `forms-facet-combobox--states`). Tests: `tests/components/FacetCombobox/`. The layout and the look are checked in the workshop at 1280 and 375 in both themes, not in happy-dom.
