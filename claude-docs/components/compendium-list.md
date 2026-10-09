# CompendiumList

`src/components/CompendiumList/` — `/admin/compendium`'s filter, table and
pager (M5.5), built as the category list's is
([`grouped-value-list.md`](grouped-value-list.md)). It is render-only and a server
component: the page reads one page of the compendium under the address's
filter through `listCompendium` and hands it over, each entry with its
classification, its formal name, its form and the address that opens it to edit, with the filter
as asked.

## Props

`CompendiumListProps` (`types.ts`):

| Prop           | What it is                                                        |
| -------------- | ----------------------------------------------------------------- |
| `entries`      | This page's `CompendiumListEntry` rows, in the service's order    |
| `filter`       | `{ query, nomenclature, withoutReferences }`, the filter as asked |
| `previousHref` | The page before this one, absent on the first                     |
| `nextHref`     | The page after this one, absent on the last                       |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"                      |

A `CompendiumListEntry` is the entry's id, name and slug, its
`canonicalName` and `form`, each `null` for none, and `editHref`. In the
filter, `query` and `nomenclature` are blank for none, and `nomenclature` is
otherwise a `NomenclatureKind`.

## Contracts

- **The filter is a GET form to `/admin/compendium`** (MB.178), as the
  category list's is: named "Filter the compendium" inside a `<search>`
  landmark, a search box labelled "Name" (`query`), a native `<select>`
  labelled "Classification" (`nomenclature`), a checkbox labelled "Without
  References", title case as the owner asked (`withoutReferences`, valued `1`), and a Filter button. The
  classification and the checkbox are the admin's two to-do lists: Unknown is
  every entry whose naming system is unsettled, and Without References every
  entry that cites no source yet. A filtered page is an address, and filtering
  starts again from the first page, since the form carries no cursor. It is
  `filter.tsx`, the one client file here. M8.10 turns the Name box into its
  typeahead, a picked row opening the entry's `?edit=` modal, with this form
  kept underneath.
- **Classification offers "Any", valued `""`, then every kind in
  `NOMENCLATURE_KINDS`'s order**, labelled by IngredientForm's
  `NOMENCLATURE_OPTIONS` (`options.ts`), as its Classification select is: the
  value capitalised. Both controls are native, so the
  form submits before hydration, as `query=&nomenclature=`, plus
  `withoutReferences=1` when ticked. The page reads a blank value as no filter
  and ignores a kind it does not know.
- **Filter is offered only when there is a new filter to apply**: `disabled`
  while the trimmed query, the classification and the checkbox all match the
  filter the page shows, enabled once any differs. With JavaScript, a submit
  builds the address with `compendiumHref` and pushes it as a soft navigation
  inside a transition: Filter wears the shared `.spinner`, `aria-busy` and the
  label "Filtering" until the filtered list arrives. The list keys the form by
  the filter shown, so a page showing another starts it again from that one.
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Ingredient is `?new`. `href.ts`'s `compendiumHref(place, dialog)`
  builds both, the pager's links and the filter's submit too. `place` is
  `{ query, nomenclature, withoutReferences, after, before }`, written in that
  order before the modal, a blank one left out and Without References as
  `withoutReferences=1`. `dialog` is `'new'`, a bare flag, or
  `{ edit: slug }`.
- **`next/link`, not a plain anchor**, as the category list's Edit: opening
  the modal is a soft navigation, and the page calls the admin guard on every
  render.
- **None is an em dash.** A null formal name or form shows "—" rather than an
  empty cell: the Unknown list tells an entry with an unconfirmed formal name
  from one with none by this column.
- **Each Edit is named for its entry and its form**: the visible "Edit", then
  the name and, when there is one, the form in a `visually-hidden` span, so a
  screen reader hears "Edit Testwort, dried". The form is there because an
  entry's identity is its formal name and its form, so two rows can share a
  name.
- **No entries reads "No compendium entries yet."**, with no table; a
  filtered list with no rows reads "No compendium entry matches." instead.

## Styling

The category list's, under its own block: the filter is a wrapping row of the
fields, the checkbox and the button, `.compendium-list__search`, on the
`.field`, `.input`, `.select`, `.checkbox` and `.btn` primitives, Filter
`.btn--solid`. The table is the `.data-table` primitive (M5.6a): it scrolls
inside its `.data-table-frame` on a narrow screen, a 1px `$text-muted`
hairline runs under the header row, and the rows are banded on
`$surface-card`. Each row's Edit is `.btn--small.btn--quiet`, and the pager
is `Pager` ([`pager.md`](pager.md)), soft. The formal name is plain, not
italic: a binomial is italicised, a mineral's or a chemical's name is not, and
the row does not carry its kind. Nothing goes past the tokens before the
admin area's design review (MB.115).

## Stories

[`index.stories.tsx`](../../src/components/CompendiumList/index.stories.tsx) —
`OnePageOfSeveral`, `FirstPage`, `Filtered`, `NoMatch` and `Empty`. The
filter reaches `/admin/compendium`, which the workshop does not serve.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/CompendiumList/index.test.tsx` covers the columns and rows,
the em dash for a missing formal name and form, the Edit links and their
names, the pager, both empty messages, the filter form's action, method,
names, kept values and classification options, the Filter button's disabled
and enabled states for each control, the address it opens, the pending
state, and `compendiumHref`.
