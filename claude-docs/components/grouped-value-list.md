# GroupedValueList

`src/components/GroupedValueList/` — a curated vocabulary's filter, table and
pager, grouped or flat: `/admin/categories`' (M5.6, MB.178), `/admin/forms`'
(M5.6a) and `/admin/deities`' (MB.132), each value filed under a group, and
`/admin/planets`' and `/admin/zodiac-signs`' (MB.95), filed under nothing.
One component serves every such vocabulary, `kind: 'category' | 'form' |
'deity' | 'planet' | 'zodiacSign'`, as [`GroupList`](group-list.md) serves
the groups; the flat kinds had a copy of their own, `VocabularyValueList`,
until MB.115 folded it in. It is render-only and a server component: the page
([`grouped-value-form.md`](grouped-value-form.md), "On the admin pages")
reads one page of the vocabulary under the address's filter and hands it
over, each value with its group's name and the address that opens it to
edit, with the filter as asked and the groups it can narrow to.

## Props

`GroupedValueListProps` (`types.ts`):

| Prop           | What it is                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| `kind`         | Which vocabulary: the page's address, whether it has a group, and the copy |
| `values`       | This page's `GroupedValueListEntry` rows, in the service's order           |
| `filter`       | `{ query, group }`, the filter as asked, each blank for none               |
| `groups`       | Every live group as `{ slug, name }`, alphabetical; none for a flat kind   |
| `previousHref` | The page before this one, absent on the first                              |
| `nextHref`     | The page after this one, absent on the last                                |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"                               |

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
`path`, the page's address; `title`, the page's heading and tab title
("Zodiac Signs"); `label`, one row in title case, as Add says it ("Sign");
`noun` and `plural`, what a sentence calls one row and several ("category",
"categories"); and, for a grouped kind only, `group`: its `label`, the
group column's heading and the filter's label ("Group"), its `plural`, for
the filter's first option ("All groups"), and its `param`, the address
parameter the filter names a group by (`group`). The deity kind calls its
group a tradition throughout: "Tradition", "All traditions" and
`tradition`. A flat kind has no `group`, so its table has no group column
and its filter no group select. The page reads `title` and `label` too. The
list carries the kind as a modifier class, `.grouped-value-list--<kind>`,
for a rule only one kind's rows need.

## Contracts

- **An entry's group is drawn in its own chip where it has a pair**, the
  owner's call: `groupColors`, the group's pair from the page's read of the
  groups, through `chipColors`, as the category picker draws it. The
  categories page passes it; an entry without one, as every form and every
  deity is, shows the name plain. A category's rows take more room than the
  table primitive gives and centre their contents, as the group list's do,
  since a chip stands taller than a line of text.
- **The filter is a GET form to the page itself** (MB.178), as the user
  list's is ([`user-list.md`](user-list.md)): named by the kind's title,
  "Filter Categories" or "Filter Zodiac Signs", inside a `<search>` landmark, a search
  box labelled "Name" (`query`), for a grouped kind a native `<select>` labelled by the kind's
  group label ("Group", named by its `param`, `group`; a deity's
  "Tradition", `tradition`), and a Filter button. A filtered page is
  an address, and filtering starts again from the first page, since the form
  carries no cursor. It is `filter.tsx`, the one client file here, holding
  the fields and what counts as a change; the shared `FilterForm` holds the
  form, the button and the navigation.
- **`?query=` is part of the name; `?group=` is a group's slug**, as
  `?edit=` is a value's, and the deities' `?tradition=` a tradition's. The
  page trims the query, reads a blank one as none, and resolves the slug
  against the groups it reads for its modal; a slug no group holds is
  ignored, so the list is every value and the slug leaves every link, as a
  hand-edited cursor gets the first page. The services take
  `{ query, groupId }`, a deity's `{ query, traditionId }` and a flat kind's
  `{ query }`, and the count
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
  and `FilterForm` pushes it as a soft navigation, as the pager's links are, inside a
  transition: Filter wears the shared `.spinner`, `aria-busy` and the label
  "Filtering" until the filtered list arrives, the owner's rule for a submit
  (the user list's full load shows nothing until the page goes). The list
  keys the form by the filter shown, so a page showing another — Back to an
  older filter, say — starts it again from that one rather than keeping a
  stale draft. In the workshop, `next/navigation` is stubbed
  ([`workshop.md`](../workshop.md), "`.ladle/`").
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Category, Add Planet and the rest, on the heading's line in
  its `PageHeader` and so the page's rather than this component's, is `?new`.
  `href.ts`'s `groupedValuesHref(kind, place, dialog?)`, on the shared
  `listHref` (`src/lib/list-href.ts`), builds both, the
  pager's links and the filter's submit too. `place` is `{ query, group, after, before }`,
  written in that order before the modal, a blank one left out, the group
  under the kind's group `param`, and none for a flat kind. Every link keeps the page's filter, and
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
  signs yet." and so on, from the kind's `plural`; a filtered list with no rows reads "No
  category matches." or "No sign matches." instead, from its `noun`.

## Styling

The list is the list primitives ([`styling.md`](../styling.md), "Designing
a section"): the root a `.list-frame`; the filter a
[`FilterForm`](filter-form.md), so a `.filter-row` whose fields are
`FieldShell`s around a native input and select and whose Filter is a solid
`BusyButton`; and the table a `.data-table` in its `.data-table-frame`,
banded at desktop width, with the `--stack` modifier, its roles written out
(`TABLE_ROLES`, `src/components/GroupList/roles.ts`, shared with the group
list) and a `data-label` on every cell, so under `$table-stack-width` of its
frame each row turns into a card ("Tables at phone width"). The Edit cell's
`data-label` is empty, so it has no label and spans its card.

What the list has of its own: a description keeps to `$measure`; and under
`.grouped-value-list--category`, while the table is wider than
`$table-stack-width`, the cells take `space(3)` above and below and centre
their contents, for the chip. As cards they keep the card's own spacing. The
page's Add is `.btn--solid` in its `PageHeader`, its one primary action, and
each row's Edit is `.btn--small.btn--quiet`: a row action that changes
nothing, small enough to keep the row short. The pager is `Pager`
([`pager.md`](pager.md)), soft.

## Stories

[`index.stories.tsx`](../../src/components/GroupedValueList/index.stories.tsx)
— for each grouped kind, `…OnePageOfSeveral`, `…FirstPage`, `…Filtered`,
`…NoMatch` and `…Empty`, as `Categories…`, `Forms…` and `Deities…`, the
deities under invented traditions and slugged by `deitySlug`; for the flat
kinds, `PlanetsOnePageOfSeveral`, `Signs`, `PlanetsFiltered`,
`PlanetsNoMatch` and `PlanetsEmpty`; and `PhoneDark` and `PhoneLight`, the
categories inside `.admin-layout` at 375px. The `Proposal…` stories draw
MB.115's open calls side by side, each at desktop and as a phone pair, on a
story-only stylesheet (`proposals.scss`): the rows banded or ruled, the
filter stacked or behind a disclosure, and the Add button at its natural
width or full width. The losing ones go once the owner signs off. The filter
reaches the admin pages, which the workshop does not serve. Render-only, no
test ids, no snapshots.

## Testing

`tests/components/GroupedValueList/index.test.tsx` runs the behaviour the
kinds share on the deities, whose group goes by its own name: the rows and
their group, the Edit links, no table when there are none, the filter form's
action, method, names and kept values, the Filter button's disabled and
enabled states, the address it opens, and `groupedValuesHref`. The category
and the form get only what they change, their page and their group's
parameter, as `groupedValuesHref` rows; the planet and the sign, their page
and no group written, as rows too, and a flat kind's table and filter drawn
with no group. The filter's busy state and its reset
are CompendiumList's, paging Pager's, and the category chip's colours
presentation.
`tests/app/admin/value-page.test.tsx` keeps the pages' half, its shape run on the categories and every other kind getting only its path and its services
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
seeded forms' first page and the planets', and filters the signs by part of a name.
