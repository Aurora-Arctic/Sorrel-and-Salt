# CategoryPicker

`src/components/CategoryPicker/` — the categories picked from one box: typing narrows the live categories under their groups, and a pick is a chip inside the control in its group's colour. Used by the ingredient form's Categories field, the spell builder (`SpellBuilder/categories-field.tsx`) and the compendium list's Categories filter (`CompendiumList/filter.tsx`). Props are in `types.ts`.

## Contracts

- **It is the deities field's box**, the same [`Combobox`](combobox.md), with one difference: nothing typed is a category. There is no Add and no "Use what you typed" row (`offerTyped` off), and Enter with nothing highlighted adds only the one category the text names whole.
- **Data-free and controlled.** Ids in through `value`, ids out through `onChange`; no fetching and no react-hook-form, so the filter reuses it unchanged. A pick keeps the list open and the focus in the box (`keepOpen`) in the facet and the form alike, since each pick adds a chip. Each add, removal and Clear is announced through a status region labelled "Categories changes".
- **`boxName`** is the box's `name`, which a form that moves focus by field name (an undo) finds it by. `action` is a control at the legend's end, handed the picker's announcer (`LegendAction`): an ingredient variant's Copy From Ingredient.
- **The rows come from the categories.** The list offers every category not yet picked whose name or whose group's name holds the text (typing a group lists all its categories), under its group's heading. Groups and names keep the order the read gives them (alphabetical in SQL); the picker never sorts. No code names a group, so a group an admin adds is a heading with no change here.
- **An entry's colour is its group's row.** Each pick is a `ComboboxEntry` given its group as `colors`, so it wears the row's `color` through `chipColors` as a solid fill (claude-docs/styling.md, "Chips, badges and the solid-fill rule"). Never a Sass token by slug. The tooltip's first line is the name with the group in brackets (the entry's `qualifier`, since colour alone cannot name the group), and the description beneath is the `detail`; both read as the x's description. The chip itself reads the bare name.
- **An error is the box's, and names its entries.** While `errorId` is set the box is `aria-invalid` and described by it, so the form's focus after a failed save lands on it. Each id in `invalid` gives its entry the `errorId`. The `status` (the categories could not be read) describes the box the same way and marks nothing invalid.
- **A pick the categories do not name** (an edit's, arriving before the read, or since retired) waits while `pending`, then is drawn by its id, uncoloured, so it can be removed.
- **The fieldset is named by the legend's text alone** (`aria-labelledby`, as `ListField` does), so the tip's button stays out of the name.
- **Counts are the filter's.** A category with a `count` (how many entries picking it would leave) reads "Testward (4)" on its row and its chip. With `hideZeros` a zero-count row leaves the list; a picked category keeps its chip so it can be removed.
- **While `loading`**, a chip draws a placeholder in the count's place, hidden from assistive technology, and its x is named by `removeNoun` the same whether or not the count has arrived.
- **Styling is layout only**; the box, entries and list are the Combobox's. Chips wrap inside the control, so a 375px screen scrolls nothing sideways.

## Not here

Stories: `src/components/CategoryPicker/index.stories.tsx`. Tests: `tests/components/CategoryPicker/index.test.tsx`; the ×, Backspace and Clear themselves are Combobox's. The filter use is proved in `tests/components/CompendiumList/filter.test.tsx` and, in a browser, in `tests/e2e/admin-compendium.spec.ts`.
