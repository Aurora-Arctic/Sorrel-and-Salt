# DataTable

`src/components/DataTable/` — the table every admin list draws its rows in
(MB.115), and the chip a group's name is drawn in. Six lists wrote the same
table markup by hand before; this writes it once:
[`CompendiumList`](compendium-list.md), [`GroupList`](group-list.md),
[`GroupedValueList`](grouped-value-list.md), [`UserList`](user-list.md),
[`PrivilegeLedger`](privilege-ledger.md) and
[`AdminInvitations`](admin-invitations.md).

It has no styles of its own. It draws the `.data-table` primitive, which
turns each row into a card when its frame is narrower than
`$table-stack-width` ([`styling.md`](../styling.md), "Tables at phone
width"). Render-only, so a server component's list stays a server component.

## StackTable

`<StackTable columns rows rowKey empty>` draws a `.data-table-frame` (the
frame that scrolls the table sideways and is the container the cards are
measured against), holding a `table.data-table.data-table--stack`. With no
rows it draws `empty` in a `<p>` instead.

`StackTableProps` (`types.ts`):

| Prop          | What it is                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| `columns`     | The columns in order; `false` or `undefined` for one the table leaves out                   |
| `rows`        | This page's rows                                                                            |
| `rowKey`      | Each row's React key, its id                                                                |
| `empty`       | What stands in the table's place when there are no rows                                     |
| `aria-label`  | The table's name, where its page holds more than one thing to tell apart                    |
| `className`   | Modifiers past the stacking table's own: `data-table--roomy`, `data-table--nowrap`, or both |
| `otherOrders` | Orders no column stands for, listed first in the phone sort select: a search's Best Match   |

A column (`StackColumn`) is its `heading`, what its `cell(row)` shows, and
optionally:

| Field              | What it does                                                                                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`           | An action column, whose cells carry no label as a card and span it. `'corner'` also stands the cell at the card's top right (`.data-table__card-action`), as Edit and Impersonate do; `'foot'` leaves it across the card's foot, as the invitations' Revoke is |
| `hiddenHeading`    | The heading is read by a screen reader and drawn nowhere, as the pencil column's "Edit" is                                                                                                                                                                     |
| `headingClassName` | A class on the heading, for a column styled as a whole: Impersonate's red rule                                                                                                                                                                                 |
| `className`        | A class on each cell: a description held to the reading measure, a muted fact                                                                                                                                                                                  |
| `sort`             | Makes the column sortable from its heading ("Sortable columns" below)                                                                                                                                                                                          |

A column that only some pages show, the value lists' group or the user
list's Impersonate, is passed as `false` or `undefined` when it is off, so a
list writes its columns as one array.

### What it guarantees

- **Every part carries its role** (`role="table"`, `rowgroup`, `row`,
  `columnheader`, `cell`), spread from `src/lib/table-roles.ts`. WebKit drops
  a table's meaning once `display` changes on its parts, as it does when the
  rows become cards, and the explicit roles put it back.
- **Every cell's card label is its column's heading**, in `data-label`, so
  the two cannot drift. An action's cell has an empty label, which the
  primitive reads as "span the card, no label".
- **A heading names its column even when hidden**: the pencil's column is
  "Edit" to a screen reader, in a `.visually-hidden` span.

### Sortable columns

A column sorts when it carries a `sort` (`ColumnSort`, `types.ts`), which the list builds from its own URL:

| Field     | What it is                                                                               |
| --------- | ---------------------------------------------------------------------------------------- |
| `current` | `'ascending'` or `'descending'` when the list is sorted by this column, absent otherwise |
| `href`    | The link for each direction                                                              |
| `labels`  | Each direction in words, as the column reads it: "A to Z", "Lowest First"                |

The heading holds a link and carries `aria-sort` with `current`, so a screen reader announces the column as sorted. The link goes to the reverse direction when the column is sorted ascending, and to ascending otherwise, so a first click sorts ascending and a second reverses. Its accessible name states the current order, "Name, Sorted A to Z", and every sortable heading draws an arrow hidden from screen readers: the sorted one in the accent colour, up for ascending and down for descending, the others a muted up-and-down pair at the disabled opacity. The arrow is one SVG of the same four parts in every state (a head, a stem, a turn group holding both, and the lower chevron), so a sort moves them: the pair's upper chevron grows into the head, the stem is drawn, the lower chevron fades and the colour eases from muted to accent, and flipping the direction turns the arrow over. It uses transform, opacity and colour for `$motion-short` (150ms) `ease-out`, inside `prefers-reduced-motion: no-preference`, so reduced motion sees the change at once. The sort is a client navigation that keeps the heading mounted, which the animation needs. The headings have no underline in any state; hover and the focus ring mark them as links. With no JavaScript the links still sort.

At phone width the headings are hidden with the rest of the head, so when any column sorts the frame also draws a Sort By select above the cards (`SortSelect`, `sort-select.tsx`). It lists the table's `otherOrders` first, then each sortable column in each direction ("Name, Z to A"), and choosing one navigates. It is drawn only after hydration (`useHydrated`) and only inside the stacked container query, so it is an enhancement: a phone with no JavaScript has no sort control.

### The two modifiers

Two row tweaks a list asks for, each a class in `_primitives.scss` built on
its mixin in `_mixins.scss`:

- **`data-table--roomy`**: rows a step taller, centred on their cells,
  for a chip or a button that stands taller than a line of text. Only while
  it is a table; a card already spaces its cells. The group lists, the
  categories' list and the user list take it.
- **`data-table--nowrap`**: no cell wraps, so a row stays one line and the
  table scrolls in its frame. A confirmation opened from a cell wraps as
  prose again, and a card, which does not scroll, wraps too. It reaches only
  the table's own cells (child combinators), so a table inside a dialog opened
  from one of them wraps as normal. The user list
  and the invitations take it.

## GroupChip

`<GroupChip name colors icon>` draws a group's name in a `.chip` (the full level, 2026-10-19) in its own
colours when `colors` holds both `color`, and as plain
text otherwise: a form group or a tradition carries none. An `icon` leads the
name with a [`FormIcon`](form-icon.md): a form group's icon name, or `null`
for a form group with none, which draws the generic spoon (M12.7). `icon`
absent draws no icon, as for a category group or a tradition. The group
list's Name cell and the value lists' group cell draw it.

## updatedColumn

`updatedColumn(className?)` (`updated-column.tsx`) is the Updated column every audited list shares (MB.260): "by **Fixture A** on 2026-10-12", who last changed the row and when, the name in bold and the date in a `<time>`. A row passes an `UpdatedStamp` (`updatedBy`, `updatedAt`); the cell is empty when either is null, since a date with no one to ask about it says little. The member list, the compendium list, the value lists and the group list draw it. The admin lists' names come from `editorStamps` (`src/app/(shell)/admin/editors.ts`), which reads them through `editorNamesForCurator` in one lookup per page, so a curator's screens render and shows an editor whose account is gone as Unknown.

## Stories

[`index.stories.tsx`](../../src/components/DataTable/index.stories.tsx), `Layout /
Data Table`: `StackTable` over a few category groups, each in its `ListFrame`
as an admin list holds it. `States` has a control that chooses: Default has two groups in chips and two plain;
Roomy adds the `data-table--roomy` class; Empty shows the empty-state
sentence; Foot Action And Icon Chip adds a foot action and an icon chip; Sorted sorts by Name with Description sortable too; Sorted At Phone Width draws it 24rem wide, with the Sort By select and a Best Match order. The toolbar viewport menu shows the rows turned into cards at 375px.

## Testing

No test of its own: each list's test asserts the table it draws — its rows,
its columns and its empty state — by role and label, which covers the
scaffold through every list that uses it. The sortable headings and the Sort By select are asserted through the compendium list's test, the one list that sorts.

## The group chip

A group's name is drawn in its own chip, as the category picker draws it, wherever the group carries both theme colours. A group without colours (a tradition has none) is plain text. A form group leads with its icon, or the generic icon where it has none; for a group of any other kind `icon` is `undefined` and no icon is drawn. The group list and the value list both use it as a table cell.
