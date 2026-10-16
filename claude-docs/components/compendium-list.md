# CompendiumList

`src/components/CompendiumList/` — `/admin/compendium`'s filter, table and
pager (M5.5), built as the category list's is
([`grouped-value-list.md`](grouped-value-list.md)). It is render-only and a server
component: the page reads one page of the compendium under the address's
filter through `listCompendium` and hands it over, each entry with its
formal name, its classification, its live forms and the address that opens
it to edit, with the filter as asked and the curated forms the filter
offers. The table's columns are Name, Formal Name, Classification, Form and Updated (MB.260; `updatedColumn`, [data-table.md](data-table.md)):
the formal name sits beside the label because it is the entry's identity
(MB.215), the owner's call in MB.115. The page reads each page's forms in
one batch through `variantsOf(null, refs)`, the read `Ingredient.variants`
resolves through, rather than one read per row.

## Props

`CompendiumListProps` (`types.ts`):

| Prop           | What it is                                                              |
| -------------- | ----------------------------------------------------------------------- |
| `entries`      | This page's `CompendiumListEntry` rows, in the service's order          |
| `filter`       | `{ query, form, nomenclature, withoutReferences }`, the filter as asked |
| `forms`        | The curated forms the Form box offers, `{ name }` each, in name order   |
| `previousHref` | The page before this one, absent on the first                           |
| `nextHref`     | The page after this one, absent on the last                             |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"                            |

A `CompendiumListEntry` is the entry's id, name and slug, its
`canonicalName`, `null` for none, its `forms` (`string[]`, the entry's live
forms' text in form order, `[]` for none), and `editHref`. In the
filter, `query`, `form` and `nomenclature` are blank for none, `form` is a
form's text, and `nomenclature` is otherwise a `NomenclatureKind`.

The page reads `forms` through the vocabulary module's
`listIngredientFormValues`, every page of it through `allPages`
(`src/lib/pagination.ts`), not one page of the maximum as the curated lists
read their groups: 84 forms are seeded against `MAX_PAGE_SIZE`'s 100, and an
admin adds more as the compendium grows. Two live forms may share a name in
different groups, so the page offers each name once, whatever its case.

## Contracts

- **The filter is a GET form to `/admin/compendium`** (`COMPENDIUM_PATH`, `href.ts`; MB.178), as the
  category list's is: named "Filter the Compendium" inside a `<search>`
  landmark, a type-ahead labelled "Name" (`query`,
  [`ingredient-search.md`](ingredient-search.md)) with its own submit, a
  magnifier named Search, inside the box at its start with the clear alone at its end and no chevron, then a type-ahead labelled
  "Form" (`form`), a dropdown labelled "Classification"
  (`nomenclature`), a native `<select>` from the server and the select-only
  box once hydrated, as every closed set in the row is, a switch labelled "Without
  References", title case as the owner asked (`withoutReferences`, valued `1`). There is no Filter
  button: each field applies as it changes (below). The
  switch is `SwitchField`, a slide toggle with its label above it as the
  other fields have, over a native checkbox, so it submits the same; it was a
  checkbox until the owner found it out of place in the row (MB.115;
  [`field.md`](field.md)). The
  classification and the switch are the admin's two to-do lists: Unknown is
  every entry whose naming system is unsettled, and No Refs (shortened from
  Without References, the owner's call at MB.115) every
  entry that cites no source yet. A filtered page is an address, and filtering
  starts again from the first page, since the form carries no cursor. It is
  `filter.tsx`, the one client file here, its fields inside the shared
  `FilterForm` ([`filter-form.md`](filter-form.md)), which holds the form,
  the Clear link and the soft navigation; Clear is drawn while the page
  shows a name, a form, a classification or No Refs, and opens
  `/admin/compendium` with none, and is not drawn while it shows none,
  whatever the fields hold. The Name box is `IngredientSearch`'s typeahead
  ([`ingredient-search.md`](ingredient-search.md)): a picked row opens that
  entry's `?edit=` modal over the filter as shown, without applying the
  text typed, and Enter or the magnifier applies it. The Form, Classification
  and No Refs fields sit in its slot and carry the typed name through
  `useSearchText`. The form is still a GET form underneath, so it filters
  before hydration.
- **Form is a type-ahead over the curated forms once hydrated**, the
  curated lists' group filter's pattern
  ([`grouped-value-list.md`](grouped-value-list.md)), the owner's call in
  MB.115: `ComboboxTypeahead` ([`combobox.md`](combobox.md), "The type-ahead
  box"), each choice's value and label the form's name, "All Forms" while
  blank, typing narrowing the list "Form choices", and a clear, "Clear
  Form", back to blank. A hidden input carries `form` for a native submit.
  The server draws it as a native `<select>` instead, "All Forms" valued
  `""` then one option per form, so the filter works before JavaScript;
  `FilterSelectField` with `typeahead` draws both ([`field.md`](field.md)),
  as it does the curated lists' group. The value is the form's text, `?form=Oil`, which the compendium
  read matches whatever its case, so the address reads plainly and an
  uncurated form on a seeded entry is still reachable by typing the address.
- **Classification offers "Any", valued `""`, then every kind in
  `NOMENCLATURE_KINDS`'s order**, labelled by IngredientForm's
  `NOMENCLATURE_OPTIONS` (`options.ts`), as its Classification select is: the
  value capitalised. It is a `FilterSelectField`, its change read with
  `oneOf(NOMENCLATURE_KINDS, …)`. Before hydration every control is native, so the
  form submits as `query=&form=&nomenclature=`, plus
  `withoutReferences=1` when on. The page reads a blank value as no filter
  and ignores a kind it does not know.
- **Each field applies as it changes** (the owner's call at MB.115's
  review, over a Filter button pressed after them): Classification on its
  change and No Refs on its press, each from the filter shown with that one
  field changed; Form once a choice settles, a pick, its clear or leaving
  the box, when the settled form differs from the one shown, never while it
  is typed; and the name on the magnifier, Enter or its clear. Each carries the name
  typed but not yet searched, trimmed. Only the name and the Form box's text
  are state; Classification is uncontrolled (`defaultValue`) and No Refs
  takes `defaultChecked`. With JavaScript, each builds the address with
  `compendiumHref`, and `useApplyFilter` pushes it softly; the loading state,
  the focus and the form's keying by the filter shown are the shared
  form's ([`filter-form.md`](filter-form.md#contracts)).
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Ingredient is `?new`. `href.ts`'s `compendiumHref(place, dialog)`
  builds both, the pager's links and the filter's submit too, a typed wrapper
  on the shared `listHref` (`src/lib/list-href.ts`). `place` is
  `{ query, form, nomenclature, withoutReferences, after, before }`, written in that
  order before the modal, a blank one left out and No Refs as
  `withoutReferences=1`. `dialog` is `'new'`, a bare flag, or
  `{ edit: slug }`.
- **`next/link`, not a plain anchor**, as the category list's Edit: opening
  the modal is a soft navigation, and the page calls the admin guard on every
  render.
- **The Form column lists the entry's forms**, joined: "Herb, Oil".
- **None is an em dash.** A null formal name, or an entry with no form, shows
  "—" rather than an empty cell: the Unknown list tells an entry with an
  unconfirmed formal name from one with none by this column.
- **Each Edit is a pencil, [`EditLink`](icon-tip.md), opening the modal at once (M9.18) under the entry's `editHeading` ([`modal.md`](modal.md), "Opening at once"), named for its entry
  and its formal name**: "Edit", the label and, when there is one, the
  formal name in `visually-hidden` text, with the tooltip "Edit" on hover
  or focus, so a screen reader hears "Edit Testwort, Fixtura
  testalis", or the label alone without a formal name. The formal name is
  there because it is the entry's identity: two rows can share a label,
  never a formal name.
- **An empty list says why, with no table.** With no filter the compendium
  itself is empty, and the paragraph says how to begin it: "The compendium is
  empty. Add the first entry with Add Ingredient." A filtered list with no
  rows names each filter in use, so an admin sees what to change, then says
  to change or clear it: "No entries match “wort”, the form “Oil”, the
  classification Botanical and No Refs. Change or clear the
  filter to see more." The query and the form are quoted, the
  classification is its label, and Without
  References is the switch's (MB.115, the owner's call). The sentence is
  `noMatchText` (`src/lib/text.ts`), one wording for every admin list.

**MB.215: the Form column lists the entry's forms.** Once an entry's forms are its variants (DESIGN.md §5), MB.222 made the Form column list its live forms, "Herb, Oil", with the em dash for an entry with none, and its rows carry their forms rather than one. Each Edit is named for the entry's label and formal name rather than its form, since identity is the formal name alone. An entry with no form is flagged on the admin's to-do list (M8.18; [`../design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)).

## Styling

None of its own; the stylesheet went in MB.115. The list's root is
`.list-frame`, its filter the `.filter-row` `FilterForm` draws, on the
`.field`, `.input`, `.select` and `.switch` primitives and
the Name box's Combobox ([`styling.md`](../styling.md), "Form fields"). The table is
[`StackTable`](data-table.md): the `.data-table` primitive with the
`--stack` modifier, banded on `$surface-card` with a 1px `$text-muted`
hairline under the header row at desktop width, and each row a card once
its frame is under `$table-stack-width`, as on a phone ("Tables at phone
width" there). StackTable writes out every part's role and names each cell's
column in `data-label`; Edit is a `'corner'` action column, its heading
hidden, its cell unlabelled at the card's top right. Each row's Edit is the larger green
pencil ([`icon-tip.md`](icon-tip.md)), and the pager is `Pager` ([`pager.md`](pager.md)),
soft. The formal name is plain, not italic: a binomial is italicised, a
mineral's or a chemical's name is not, and the row does not carry its kind.

## Stories

[`index.stories.tsx`](../../src/components/CompendiumList/index.stories.tsx),
`Admin / Compendium List`: `OnePageOfSeveral`, `FirstPage`, `Filtered`,
`NoMatch` and `Empty`, and `PhoneDark` and `PhoneLight`, the middle page at
375px with every row a card, and `FilteredPhoneDark` and `FilteredPhoneLight`,
`Filtered` at 375px with Clear drawn. Every story is the page as
`/admin/compendium` draws it: the admin layout's frame with the Compendium
page current in its nav, then a `main` holding the page header with Add
Ingredient, then the list. The filter reaches `/admin/compendium`, which the
workshop does not serve. Render-only, no test ids, no snapshots.

## Testing

`tests/components/CompendiumList/index.test.tsx` covers the rows, the Edit
links and their names, no table when there are none, through the shared filter rows (`tests/support/filter-form.tsx`, [`filter-form.md`](filter-form.md)) the filter form's
action, method, names, kept values and classification values, the Form box
drawn as a native select on the server and as a type-ahead once hydrated,
No Refs found as a `switch`, sent by the server-drawn form and
turned by a press before hydration,
the Search submit in the server's markup, the address each field applies (the
search on Search, Enter or the Name clear, Classification on its change, No Refs on its
press, the Form box on a pick, its clear and leaving it, never while typed,
each carrying the name typed), the loading state while the filtered list
loads (the list's status, the row `aria-busy` and its controls
`aria-disabled`, a second change and a submit refused, the list back once
it arrives, and none of it for typing), the focus kept on the field changed
once the list arrives, the reset to the filter shown,
Clear (its address with each control set, not drawn while the page shows no
filter, text typed or not, and the loading state while the unfiltered list
loads), and `compendiumHref`. It is the one list test of the filter's
loading state, its focus, its
reset and Clear; paging is Pager's. `tests/app/(shell)/admin/compendium/page.test.tsx`
covers the page's side: `?form=` read trimmed into the list and its count,
blank as none, kept on every Edit, the pager, Add Ingredient and the
redirect, and the forms read past their first page, each name once.
