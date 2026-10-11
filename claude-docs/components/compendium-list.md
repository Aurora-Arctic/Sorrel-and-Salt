# CompendiumList

`src/components/CompendiumList/` — `/admin/compendium`'s filter, table and
pager (M5.5), built as the category list's is
([`grouped-value-list.md`](grouped-value-list.md)). It is render-only and a server
component: the page reads one page of the compendium under the address's
filter through `listCompendium` and hands it over, each entry with its
formal name, its classification, its live forms and the address that opens
it to edit, with the filter as asked and the curated forms the filter
offers. The table's columns are Name, Formal Name, Classification and Form:
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

- **The filter is a GET form to `/admin/compendium`** (MB.178), as the
  category list's is: named "Filter the Compendium" inside a `<search>`
  landmark, a search box labelled "Name" (`query`), a type-ahead labelled
  "Form" (`form`), a native `<select>` labelled "Classification"
  (`nomenclature`), a checkbox labelled "Without
  References", title case as the owner asked (`withoutReferences`, valued `1`), and a Filter button. The
  classification and the checkbox are the admin's two to-do lists: Unknown is
  every entry whose naming system is unsettled, and Without References every
  entry that cites no source yet. A filtered page is an address, and filtering
  starts again from the first page, since the form carries no cursor. It is
  `filter.tsx`, the one client file here, its fields inside the shared
  `FilterForm` ([`filter-form.md`](filter-form.md)), which holds the form,
  the Filter button and the soft navigation. M8.10 turns the Name box into its
  typeahead, a picked row opening the entry's `?edit=` modal, with this form
  kept underneath.
- **Form is a type-ahead over the curated forms once hydrated**, the
  curated lists' group filter's pattern
  ([`grouped-value-list.md`](grouped-value-list.md)), the owner's call in
  MB.115: `ComboboxTypeahead` ([`combobox.md`](combobox.md), "The type-ahead
  box"), each choice's value and label the form's name, "All Forms" while
  blank, typing narrowing the list "Form choices", and a clear, "Clear
  Form", back to blank. A hidden input carries `form` for a native submit.
  The server draws it as a native `<select>` instead, "All Forms" valued
  `""` then one option per form, so the filter works before JavaScript;
  `hydrated`, read through `useSyncExternalStore`, tells the two renders
  apart. The value is the form's text, `?form=Oil`, which the compendium
  read matches whatever its case, so the address reads plainly and an
  uncurated form on a seeded entry is still reachable by typing the address.
- **Classification offers "Any", valued `""`, then every kind in
  `NOMENCLATURE_KINDS`'s order**, labelled by IngredientForm's
  `NOMENCLATURE_OPTIONS` (`options.ts`), as its Classification select is: the
  value capitalised. Before hydration every control is native, so the
  form submits as `query=&form=&nomenclature=`, plus
  `withoutReferences=1` when ticked. The page reads a blank value as no filter
  and ignores a kind it does not know.
- **Filter is offered only when there is a new filter to apply**: `disabled`
  while the trimmed query, the form, the classification and the checkbox all match the
  filter the page shows, enabled once any differs. With JavaScript, a submit
  builds the address with `compendiumHref`, and `FilterForm` pushes it as a
  soft navigation inside a transition: Filter is a `BusyButton`, wearing the
  `.spinner`, `aria-busy` and the label "Filtering" until the filtered list
  arrives. The list keys the form by
  the filter shown, so a page showing another starts it again from that one.
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Ingredient is `?new`. `href.ts`'s `compendiumHref(place, dialog)`
  builds both, the pager's links and the filter's submit too, a typed wrapper
  on the shared `listHref` (`src/lib/list-href.ts`). `place` is
  `{ query, form, nomenclature, withoutReferences, after, before }`, written in that
  order before the modal, a blank one left out and Without References as
  `withoutReferences=1`. `dialog` is `'new'`, a bare flag, or
  `{ edit: slug }`.
- **`next/link`, not a plain anchor**, as the category list's Edit: opening
  the modal is a soft navigation, and the page calls the admin guard on every
  render.
- **The Form column lists the entry's forms**, joined: "Herb, Oil".
- **None is an em dash.** A null formal name, or an entry with no form, shows
  "—" rather than an empty cell: the Unknown list tells an entry with an
  unconfirmed formal name from one with none by this column.
- **Each Edit is named for its entry and its formal name**: the visible
  "Edit", then the label and, when there is one, the formal name in a
  `visually-hidden` span, so a screen reader hears "Edit Testwort, Fixtura
  testalis", or the label alone without a formal name. The formal name is
  there because it is the entry's identity: two rows can share a label,
  never a formal name.
- **An empty list says why, with no table.** With no filter the compendium
  itself is empty, and the paragraph says how to begin it: "The compendium is
  empty. Add the first entry with Add Ingredient." A filtered list with no
  rows names each filter in use, so an admin sees what to change, then says
  to change or clear it: "No entry matches “wort”, the form “Oil”, the
  classification Botanical and Without References. Change or clear the
  filter to see more." The query and the form are quoted, the
  classification is its label, and Without
  References is the checkbox's (MB.115, the owner's call; the user list's
  says the same of its own filters, [`user-list.md`](user-list.md)).

**MB.215: the Form column lists the entry's forms.** Once an entry's forms are its variants (DESIGN.md §5), MB.222 made the Form column list its live forms, "Herb, Oil", with the em dash for an entry with none, and its rows carry their forms rather than one. Each Edit is named for the entry's label and formal name rather than its form, since identity is the formal name alone. An entry with no form is flagged on the admin's to-do list (M8.18; [`../design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)).

## Styling

None of its own; the stylesheet went in MB.115. The list's root is
`.list-frame`, its filter the `.filter-row` `FilterForm` draws, on the
`.field`, `.input`, `.select`, `.checkbox` and `.btn` primitives, Filter
`.btn--solid` ([`styling.md`](../styling.md), "Form fields"). The table is
the `.data-table` primitive with the `--stack` modifier: banded on
`$surface-card` with a 1px `$text-muted` hairline under the header row at
desktop width, and each row a card once its frame is under
`$table-stack-width`, as on a phone ("Tables at phone width" there). So every
part carries its role written out, `table`, `rowgroup`, `row`,
`columnheader` and `cell`, spread from `src/lib/table-roles.ts` since lint refuses a
literal role it takes for redundant, and every cell names its column in
`data-label`, the Edit cell's empty so it spans the card. Each row's Edit is
`.btn--small.btn--quiet`, and the pager is `Pager` ([`pager.md`](pager.md)),
soft. The formal name is plain, not italic: a binomial is italicised, a
mineral's or a chemical's name is not, and the row does not carry its kind.

## Stories

[`index.stories.tsx`](../../src/components/CompendiumList/index.stories.tsx) —
`OnePageOfSeveral`, `FirstPage`, `Filtered`, `NoMatch` and `Empty`, and
`PhoneDark` and `PhoneLight`, the middle page at 375px with every row a
card, each inside the admin layout's frame. The filter reaches
`/admin/compendium`, which the workshop does not serve.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/CompendiumList/index.test.tsx` covers the rows, the Edit
links and their names, no table when there are none, the filter form's
action, method, names, kept values and classification values, the Form box
drawn as a native select on the server and as a type-ahead once hydrated,
its narrowing as a name is typed, its pick and its clear, the Filter
button's disabled and enabled states for each control, the address it opens,
the busy state while the filtered list loads, the reset to the filter shown,
and `compendiumHref`. It is the one list test of the filter's busy state and
its reset; paging is Pager's. `tests/app/admin/compendium/page.test.tsx` covers
the page's side: `?form=` read trimmed into the list and its count, blank
as none, kept on every Edit, the pager, Add Ingredient and the redirect, and
the forms read past their first page, each name once.
