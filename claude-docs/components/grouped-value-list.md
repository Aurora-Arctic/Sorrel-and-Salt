# GroupedValueList

`src/components/GroupedValueList/` — a curated vocabulary's filter, table and
pager, grouped or flat: `/admin/categories`' (M5.6, MB.178), `/admin/forms`'
(M5.6a) and `/admin/deities`' (MB.132), each value filed under a group, and
`/admin/celestial-bodies`' and `/admin/zodiac-signs`' (MB.95), filed under nothing.
One component serves every such vocabulary, `kind: 'category' | 'form' |
'deity' | 'celestialBody' | 'zodiacSign'`, as [`GroupList`](group-list.md) serves
the groups; the flat kinds had a copy of their own, `VocabularyValueList`,
until MB.115 folded it in. It is render-only and a server component: the page
([`grouped-value-form.md`](grouped-value-form.md), "On the admin pages")
reads one page of the vocabulary under the address's filter and hands it
over, each value with its group's name and the address that opens it to
edit, with the filter as asked and the groups it can narrow to. Its last
column before Edit is Updated (MB.260): who last edited the value and when
([`updatedColumn`](data-table.md)).

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
plus `groupName`, `editHref`, `groupColors` where its group has a chip
pair, `groupIcon` for a form's group (its icon name, `null` for a group
with none), and `otherNames` for a deity (M14.23), its other names
alphabetically, which the Name cell lists on a muted caption-sized line under
the name, "Also called Testrina, Tess"; a deity with none shows its name alone. Categories come by group then name (MB.126); forms are live forms
under live groups, by name, as the service reads them — a form under a
deleted group is no longer curated, so it is not listed. Deities are live
deities under live traditions, by tradition name then name, on the same
terms.

## Kinds

Everything that tells one kind's list from another's is its entry in
`kinds.ts`'s `KINDS`, so a new kind is an entry there and nothing else (the nav's tab and the form's `noun` read it too):
`path`, the page's address; `title`, the table's name ("Zodiac Signs"),
since the heading is now the tabbed page's ("Astrology";
[`tabbed-page.md`](tabbed-page.md)); `label`, one row in title case, as Add says it ("Zodiac
Sign", the long form the owner chose at MB.115's sign-off);
`noun` and `plural`, what a sentence calls one row and several ("category",
"categories"); and, for a grouped kind only, `group`: its `label`, the
group column's heading and the filter's label ("Group"), its `plural`, for
the filter's empty choice, title case ("All Groups"), and its `param`, the address
parameter the filter names a group by (`group`). The deity kind calls its
group a tradition throughout: "Tradition", "All Traditions" and
`tradition`. A flat kind has no `group`, so its table has no group column
and its filter no group select. The page reads `label` too. The
list carries the kind as a modifier class, `.grouped-value-list--<kind>`,
for a rule only one kind's rows need.

## Contracts

- **An entry's group is drawn in its own chip where it has a pair**, the
  owner's call: `groupColors`, the group's pair from the page's read of the
  groups, through [`GroupChip`](data-table.md), as the category picker draws
  it. The categories page passes it; an entry without one, as every deity is,
  shows the name plain. A form's group leads with its icon, a
  [`FormIcon`](form-icon.md), through `GroupChip`'s `icon`: `groupIcon`, the
  generic spoon where the group has none (M12.7). A category's rows take more room
  than the table primitive gives and centre their contents, as the group
  list's do, since a chip stands taller than a line of text.
- **The filter is a GET form to the page itself** (MB.178), as the user
  list's is ([`user-list.md`](user-list.md)): named by the kind's title,
  "Filter Categories" or "Filter Zodiac Signs", inside a `<search>` landmark, a search
  box labelled "Name" (`query`) with its own submit, a magnifier named
  Search (`SearchField`, [`field.md`](field.md)), and for a grouped kind a
  group filter labelled by the kind's group label ("Group", named by its
  `param`, `group`; a deity's "Tradition", `tradition`). There is no
  Filter button: each field applies as it changes (below). A filtered page is
  an address, and filtering starts again from the first page, since the form
  carries no cursor. It is `filter.tsx`, the one client file here, holding
  the fields and what each applies; the shared `FilterForm` holds the
  form, the navigation and the Clear link at the row's end, drawn while the
  page shows a name or a group and opening the page itself with neither,
  and not drawn while it shows neither, whatever the fields hold
  ([`filter-form.md`](filter-form.md)).
- **`?query=` is part of the name; `?group=` is a group's slug**, as
  `?edit=` is a value's, and the deities' `?tradition=` a tradition's. The
  page trims the query, reads a blank one as none, and resolves the slug
  against the groups it reads for its modal; a slug no group holds is
  ignored, so the list is every value and the slug leaves every link, as a
  hand-edited cursor gets the first page. The services take
  `{ query, groupId }`, a deity's `{ query, traditionId }` and a flat kind's
  `{ query }`, and the count
  behind the pager reads the same filter as the list.
- **The group filter is typed into once hydrated, and a native `<select>`
  before**, the owner's call in MB.115. The server draws the select, so the
  form submits before hydration: its first option is "All Groups" ("All
  Traditions"), valued `""`, then each group by slug, alphabetical as read,
  and a native submit sends `query=&group=` (`query=&tradition=`), which the
  page reads as no filter. Hydration swaps it for the combobox's type-ahead
  box ([`combobox.md`](combobox.md), "The type-ahead box"), both drawn by
  `FilterSelectField` with `typeahead` ([`field.md`](field.md)): typing narrows the groups, its
  placeholder reads "All Groups" while blank, and its clear, "Clear Group"
  ("Clear Tradition"), is the way back to every group. Both stand at one
  width, so the swap moves nothing
  ([`filter-form.md`](filter-form.md#styling), "A choice takes one width"). Text naming no group
  is no group, so it filters by none. A hidden input carries the same
  parameter, by slug, so the form's fields are what they were.
- **Each field applies as it changes** (the owner's call at MB.115's
  review, over a Filter button pressed after them): the group once a choice
  settles, a pick, its clear or leaving the box, when the settled group
  differs from the one shown, never while it is typed, carrying the name
  typed but not yet searched; the name on the magnifier or Enter, keeping
  the group shown. With JavaScript, each builds the address with
  `groupedValuesHref(kind, { query, group })` and `useApplyFilter` pushes
  it softly; the loading state and the form's keying by the filter shown
  are the shared form's ([`filter-form.md`](filter-form.md#contracts)). In the workshop, `next/navigation` is stubbed
  ([`workshop.md`](../workshop.md), "`.storybook/`").
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Category, Add Celestial Body and the rest, the tab's action beside the
  page's heading (`ValueAction` in `src/app/(shell)/admin/value-page.tsx`, from the
  route group's `@action` slot, built on `AddAction` in `src/app/(shell)/admin/add-action.tsx`,
  which takes the dialog's `heading` apart from the button's label, M9.18) and so the page's rather than this
  component's, is `?new`.
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
  admin guard on every render. AdminNav uses `<Link>` too, now that every
  route it names is built ([`admin-nav.md`](admin-nav.md)).
- **Each Edit is a pencil, [`EditLink`](icon-tip.md), opening the modal at once (M9.18) under the value's `editHeading` ([`modal.md`](modal.md), "Opening at once"), named for its
  value**: "Edit" and the name in `visually-hidden` text, so a screen
  reader hears "Edit Testcraft" rather than a column of "Edit", and a
  sighted reader sees the tooltip "Edit" on hover or focus (MB.115, the
  owner's call). Two live forms may share a name under different
  groups, and two deities under different traditions; the group column
  beside it tells them apart.
- **An empty list says so and what to do, with no table**: "There are no
  categories yet. Add one with Add Category.", from the kind's `plural`
  and `label`, which name the tab's Add. A filtered list with no
  rows names each filter in force and what to do, in the one wording every
  admin list uses (`noMatchText`, `src/lib/text.ts`): "No categories match
  “wort” and the group Fixture Healing. Change or clear the filter to see
  more.", the group by its name and the kind's group `label`, "the
  tradition …" for a deity.

## Styling

The list is the list primitives ([`styling.md`](../styling.md), "Designing
a section"): the root a `.list-frame`, a [`ListFrame`](list-frame.md); the filter a
[`FilterForm`](filter-form.md), so a `.filter-row` whose fields are
a `SearchField` and a `FieldShell` around the group filter; and the table
[`StackTable`](data-table.md), a `.data-table` in
its `.data-table-frame`, banded at desktop width (every even row on the
card surface, the owner's M5.6 call, kept at MB.115's sign-off over a
hairline rule), with the `--stack` modifier, its roles written out and a
`data-label` on every cell, so under `$table-stack-width` of its frame each
row turns into a card ("Tables at phone width"). A flat kind passes no
group column. Edit is a `'corner'` action column: its cell has no label,
and stands at the card's top right, beside the name (MB.115, the owner's
call).

What the list has of its own: a description keeps to `$measure`; and the
categories' table alone takes the `data-table--roomy` modifier, so while it
is wider than `$table-stack-width` the cells take `space(3)` above and below
and centre their contents, for the chip. As cards they keep the card's own spacing. The
page's Add is `.btn--solid` beside its heading, its one primary action, and
each row's Edit is the larger green pencil, a 2rem target
([`icon-tip.md`](icon-tip.md), "Styling"). The pager is `Pager`
([`pager.md`](pager.md)), soft. At phone width the filter's fields stack
full width and the Add is a plus on the heading's line (it spanned its line until MB.7's review, 2026-10-12), the sign-off's two phone calls,
which `FilterForm` and `TabbedPage` own
([`filter-form.md`](filter-form.md), [`tabbed-page.md`](tabbed-page.md)),
so the list adds no rule for either.

## Stories

[`index.stories.tsx`](../../src/components/GroupedValueList/index.stories.tsx),
`Admin / Grouped Value List`. `States`, with a control that chooses, carries the bare list; and
the filter reaches the admin pages, which the workshop does not serve. The
category groups are four invented groups, so typing in a state's group filter
shows its list narrowing.

| State                       | Shows                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default                     | The Categories page as the route draws it: the app shell, the admin row, the heading with its Categories and Groups toggle and Add Category, the Name and Group filters, and three categories |
| First Page, Middle Page     | Categories, Next alone and "Page 1 of 2" beside it; and a middle page                                                                                                                         |
| Filtered, No Matches, Empty | Categories with a filter, with a filter that matches nothing, and with no rows                                                                                                                |
| Forms                       | A form's row, drawing its group's icon                                                                                                                                                        |
| Deities                     | Deities under invented traditions, slugged by `deitySlug`, one with other names                                                                                                               |
| Celestial Bodies            | A flat kind, with no group column or filter                                                                                                                                                   |

`Pending` is its own story: the page's pending state inside the admin frame. These stories stand for the page, in the admin layout's frame with the
Categories page's heading and tabs, its Categories tab open, as
`TabbedPage` draws them:

- `Pending`: the same page with a filter applied and the list on its way. A
  `ListNavigationContext` holding one pending sits above the page, since the
  stub router goes nowhere, so the filter row is greyed and the tabs' skeleton
  is in place of the list ([`list-frame.md`](list-frame.md)).

Render-only, no test ids, no snapshots.

## Testing

`tests/components/GroupedValueList/index.test.tsx` runs the behaviour the
kinds share on the deities, whose group goes by its own name: the rows and
their group, the Edit links, no table when there are none, the filter form's
action, method, names and kept values, the group a native select in the
server's markup and a type-ahead once hydrated, the address each field applies (the name on
Search, keeping the group shown; a group picked, carrying the name typed;
its clear, back to every group), Clear drawn by a name or a group shown and
not drawn with neither, and `groupedValuesHref`. The category
and the form get only what they change, their page and their group's
parameter, as `groupedValuesHref` rows; the celestial body and the zodiac sign, their page
and no group written, as rows too, and a flat kind's table and filter drawn
with no group. The filter's form, its search, Clear and the reset to the
filter shown run as the shared filter rows (`tests/support/filter-form.tsx`,
[`filter-form.md`](filter-form.md), "Testing"); its loading state is
CompendiumList's, the type-ahead's narrowing Combobox's, paging Pager's, and the category chip's colours
presentation. A form's group icon, or the spoon beside a group with none and none beside a deity's, is asserted by comparing the rendered `.form-icon` to `FormIcon`'s own.
`tests/app/(shell)/admin/value-page.test.tsx` keeps the pages' half, its shape run on the categories and every other kind getting only its path and its services
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
seeded forms' first page and the celestial bodies', and filters the signs by part of a name.

## The filter

A curated vocabulary's filter is a name search and, for a grouped kind, its group, each applying as it changes. The group applies once a choice settles (a pick, its clear or leaving the box), never while typed, carrying the name typed but not yet searched. The name applies on the magnifier or Enter. `FilterForm` holds the form, Clear and the soft navigation; the filter holds what the fields say.

The group is typed into once the page is hydrated, but the server draws a native `<select>` (`FilterSelectField`), so before hydration a press on the magnifier submits natively as `query=&group=`. The list keys the filter by the filter shown, so a page showing another, after Back for instance, draws it afresh from that one.
