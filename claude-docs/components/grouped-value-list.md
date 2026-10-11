# GroupedValueList

`src/components/GroupedValueList/` — a grouped curated vocabulary's filter,
table and pager: `/admin/categories`' (M5.6, MB.178), `/admin/forms`'
(M5.6a) and `/admin/deities`' (MB.132). One component serves every such
vocabulary, `kind: 'category' | 'form' | 'deity'`, as
[`GroupList`](group-list.md) serves their groups. It is render-only and a
server component: the page reads one page of the vocabulary under the
address's filter through `listCategories`, `listIngredientFormValues` or
`listDeities` and hands it over, each value with its group's
name and the address that opens it to edit, with the filter as asked and the
groups it can narrow to.

## Props

`GroupedValueListProps` (`types.ts`):

| Prop           | What it is                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| `kind`         | `'category'`, `'form'` or `'deity'`: the page's address and what the copy says |
| `values`       | This page's `GroupedValueListEntry` rows, in the service's order               |
| `filter`       | `{ query, group }`, the filter as asked, each blank for none                   |
| `groups`       | Every live group as `{ slug, name }`, alphabetical: the filter's groups        |
| `previousHref` | The page before this one, absent on the first                                  |
| `nextHref`     | The page after this one, absent on the last                                    |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"                                   |

A `GroupedValueListEntry` is the value's id, name, slug and description,
plus `groupName`, `editHref`, and `groupColors` where its group has a chip
pair. Categories come by group then name (MB.126); forms are live forms
under live groups, by name, as the service reads them — a form under a
deleted group is no longer curated, so it is not listed. Deities are live
deities under live traditions, by tradition name then name, on the same
terms.

## Kinds

Everything that tells one kind's list from another's is its entry in
`kinds.ts`'s `KINDS`, so a new kind is an entry there and nothing else:
`path`, the page's address; `noun` and `plural`, what a sentence calls one
row and several ("category", "categories"); `groupLabel`, the group column's
heading and the filter's label ("Group"); `groupPlural`, for the filter's
first option ("All groups"); and `groupParam`, the address parameter the
filter names a group by (`group`). The deity kind calls its group a
tradition throughout: `/admin/deities`, "deity" and "deities", "Tradition",
"All traditions" and `tradition`. The list carries the kind as a modifier
class, `.grouped-value-list--<kind>`, for a rule only one kind's rows need.

## Contracts

- **An entry's group is drawn in its own chip where it has a pair**, the
  owner's call: `groupColors`, the group's pair from the page's read of the
  groups, through `chipColors`, as the category picker draws it. The
  categories page passes it; an entry without one, as every form and every
  deity is, shows the name plain. A category's rows take more room than the
  table primitive gives and centre their contents, as the group list's do,
  since a chip stands taller than a line of text.
- **The filter is a GET form to the page itself** (MB.178), as the user
  list's is ([`user-list.md`](user-list.md)): named "Filter categories",
  "Filter forms" or "Filter deities" inside a `<search>` landmark, a search
  box labelled "Name" (`query`), a native `<select>` labelled by the kind's
  group label ("Group", named by its `groupParam`, `group`; a deity's
  "Tradition", `tradition`), and a Filter button. A filtered page is
  an address, and filtering starts again from the first page, since the form
  carries no cursor. It is `filter.tsx`, the one client file here.
- **`?query=` is part of the name; `?group=` is a group's slug**, as
  `?edit=` is a value's, and the deities' `?tradition=` a tradition's. The
  page trims the query, reads a blank one as none, and resolves the slug
  against the groups it reads for its modal; a slug no group holds is
  ignored, so the list is every value and the slug leaves every link, as a
  hand-edited cursor gets the first page. The services take
  `{ query, groupId }`, or a deity's `{ query, traditionId }`, and the count
  behind the pager reads the same filter as the list.
- **The group filter is a native `<select>`, not `ComboboxSelect`**, so the
  form submits before hydration. Its first option is "All groups" ("All
  traditions"), valued
  `""`, then each group by slug, alphabetical as read. A native submit sends
  `query=&group=` (`query=&tradition=`), which the page reads as no filter.
- **Filter is offered only when there is a new filter to apply**, as the user
  list's is: `disabled` while the trimmed query and the group match the
  filter the page shows, enabled once either differs. With JavaScript, a
  submit builds the address with `groupedValuesHref(kind, { query, group })`
  and pushes it as a soft navigation, as the pager's links are, inside a
  transition: Filter wears the shared `.spinner`, `aria-busy` and the label
  "Filtering" until the filtered list arrives, the owner's rule for a submit
  (the user list's full load shows nothing until the page goes). The list
  keys the form by the filter shown, so a page showing another — Back to an
  older filter, say — starts it again from that one rather than keeping a
  stale draft. In the workshop, `next/navigation` is stubbed
  ([`workshop.md`](../workshop.md), "`.ladle/`").
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Category, Add Form or Add Deity, on the heading's line in
  `.page-header` and so the page's rather than this component's, is `?new`.
  `href.ts`'s `groupedValuesHref(kind, place, dialog?)` builds both, the
  pager's links and the filter's submit too. `place` is `{ query, group, after, before }`,
  written in that order before the modal, a blank one left out, the group
  under the kind's `groupParam`. Every link keeps the page's filter, and
  every one but the pager's keeps its cursor too, so closing a modal, and a
  save, lands where it was opened. `new` is a bare flag, read by its
  presence, as the user list's `awaiting` is.
- **`next/link`, not a plain anchor.** Opening the modal is a soft navigation:
  the page renders again with the modal open, and the page itself calls the
  admin guard on every render. AdminNav keeps plain anchors for its own
  reason, which is that typed routes refuse a route not built yet.
- **Each Edit is named for its value**: the visible "Edit", then the name in
  a `visually-hidden` span, so a screen reader hears "Edit Testcraft" rather
  than a column of "Edit". Two live forms may share a name under different
  groups, and two deities under different traditions; the group column
  beside it tells them apart.
- **An empty list says so, with no table**: "No categories yet.", "No
  forms yet." or "No deities yet."; a filtered list with no rows reads "No
  category matches.", "No form matches." or "No deity matches." instead.

## Styling

The filter is the user list's: a wrapping row of the fields and the button,
`.grouped-value-list__search`, on the `.field`, `.input`, `.select` and
`.btn` primitives, Filter `.btn--solid`. The table is the `.data-table`
primitive (M5.6a): it scrolls inside its `.data-table-frame` on a narrow
screen, a 1px `$text-muted` hairline runs under the header row, the muted
ink every hairline here uses, and the rows are banded on `$surface-card`
([`styling.md`](../styling.md)). A description keeps to `$measure`. Under
`.grouped-value-list--category`, the cells take `space(3)` above and below
and centre their contents, for the chip. The page's Add is `.btn--solid`,
its one primary action, and each row's Edit is `.btn--small.btn--quiet`: a
row action that changes nothing, small enough to keep the row short. The
pager is `Pager` ([`pager.md`](pager.md)), soft: Prev and Next, centred,
full-size quiet buttons with large chevrons, an end with no page disabled.
Nothing goes further before MB.115's design review.

## Stories

[`index.stories.tsx`](../../src/components/GroupedValueList/index.stories.tsx)
— for each kind, `…OnePageOfSeveral`, `…FirstPage`, `…Filtered`, `…NoMatch`
and `…Empty`, as `Categories…`, `Forms…` and `Deities…`, the deities
under invented traditions and slugged by `deitySlug`. The filter reaches
`/admin/categories`, `/admin/forms` or `/admin/deities`, which the workshop
does not serve. Render-only, no test ids, no snapshots.

## Testing

`tests/components/GroupedValueList/index.test.tsx` runs the behaviour the
kinds share on the deities, whose group goes by its own name: the rows and
their group, the Edit links, no table when there are none, the filter form's
action, method, names and kept values, the Filter button's disabled and
enabled states, the address it opens, and `groupedValuesHref`. The category
and the form get only what they change, their page and their group's
parameter, as `groupedValuesHref` rows. The filter's busy state and its reset
are CompendiumList's, paging Pager's, and the category chip's colours
presentation.
`tests/app/admin/categories/page.test.tsx`,
`tests/app/admin/forms/page.test.tsx` and
`tests/app/admin/deities/page.test.tsx` keep each page's half
([`layer-ownership.md`](../testing/layer-ownership.md), "The owning layer"):
the guard refusing before any read; the first page of 25 read (26, to know of
a next) and an unreadable cursor read as the first page; every group read on
one page of the maximum; the filter read from `?query=` and `?group=` (the
deities' `?tradition=`) into the list and its count, a blank one as none and
an unknown group slug ignored; the position counted from the page's first
row, or from none when the filter leaves it empty; each group's name joined
onto its rows; the filter and cursor kept on the
pager, each Edit, Add and the modal's way back; and the modal the address
opens. How the list shows what it is given is this component's test's alone. `tests/e2e/admin.spec.ts` lists the
seeded forms' first page; no spec drives the deities yet.
