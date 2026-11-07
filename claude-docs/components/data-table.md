# DataTable

`src/components/DataTable/` — the table every admin list draws its rows in, and the chip a group's name is drawn in. It writes the table markup once for [`CompendiumList`](compendium-list.md), [`GroupList`](group-list.md), [`GroupedValueList`](grouped-value-list.md), [`UserList`](user-list.md), [`PrivilegeLedger`](privilege-ledger.md) and [`AdminInvitations`](admin-invitations.md).

It has no styles of its own. It draws the `.data-table` primitive, which turns each row into a card when its frame is narrower than `$table-stack-width` (`claude-docs/styling.md`, "Tables at phone width"). Render-only, so a server component's list stays a server component. Props are in `src/components/DataTable/types.ts`.

## Contracts

`<StackTable columns rows rowKey empty>` draws a `.data-table-frame` (the frame that scrolls the table sideways and is the container the cards are measured against), holding a `table.data-table.data-table--stack`. With no rows it draws `empty` in a `<p>` instead.

- **A column only some pages show is passed as `false` or `undefined` when it is off**, so a list writes its columns as one array.
- **Every part carries its role** (`role="table"`, `rowgroup`, `row`, `columnheader`, `cell`), spread from `src/lib/table-roles.ts`. WebKit drops a table's meaning once `display` changes on its parts, as it does when the rows become cards, and the explicit roles put it back.
- **Every cell's card label is its column's heading**, in `data-label`, so the two cannot drift. An action's cell has an empty label, which the primitive reads as "span the card, no label".
- **A heading names its column even when hidden**: the pencil's column is "Edit" to a screen reader, in a `.visually-hidden` span.
- **`data-table--roomy`** gives rows a step more height, centred on their cells, for a chip or a button taller than a line of text. It applies only while the table is a table; a card already spaces its cells. The group lists, the categories' list and the user list take it.
- **`data-table--nowrap`** stops every cell wrapping, so a row stays one line and the table scrolls in its frame. A card, which does not scroll, wraps. It reaches only the table's own cells (child combinators), so a table inside a dialog opened from one of them wraps as normal. The user list and the invitations take it. Both modifiers are classes in `_primitives.scss` built on mixins in `_mixins.scss`.

### Sortable columns

A column sorts when it carries a `sort` (`ColumnSort`), which the list builds from its own URL.

- **The heading holds a link and carries `aria-sort`** with `current`, so a screen reader announces the column as sorted. The link goes to the reverse direction when the column is sorted ascending, and to ascending otherwise, so a first click sorts ascending and a second reverses. Its accessible name states the current order, "Name, Sorted A to Z". The headings have no underline in any state; hover and the focus ring mark them as links. With no JavaScript the links still sort.
- **Every sortable heading draws an arrow hidden from screen readers**: the sorted one in the accent colour, up for ascending and down for descending, the others a muted up-and-down pair at the disabled opacity. The arrow is one SVG of the same four parts in every state (a head, a stem, a turn group holding both, and the lower chevron), so a sort moves them: the pair's upper chevron grows into the head, the stem is drawn, the lower chevron fades and the colour eases from muted to accent.
- **Flipping the direction turns the arrow over with `scaleY(-1)`** on the dropdown chevrons' duration and easing (`theme-transition`, 400ms `ease-in-out`), not the `chevron-flip` mixin: its `.is-descending &` selector cannot reach a rule nested under `body`, and its `rotateX` is not drawn on an SVG part in every browser. The rest uses transform, opacity and colour for `$motion-short` (150ms) `ease-out`, inside `prefers-reduced-motion: no-preference`; reduced motion sees every change at once. The sort is a client navigation that keeps the heading mounted, which the animation needs.
- **At phone width the headings are hidden with the rest of the head**, so when any column sorts the frame also draws a Sort By select above the cards (`SortSelect`, `sort-select.tsx`). It lists the table's `otherOrders` first, then each sortable column in each direction ("Name, Z to A"), and choosing one navigates. It is drawn only after hydration (`useHydrated`) and only inside the stacked container query, so it is an enhancement: a phone with no JavaScript has no sort control.

## GroupChip

`<GroupChip name colors icon>` draws a group's name in a `.chip` in its own colours when `colors` holds both theme colours, and as plain text otherwise: a form group or a tradition carries none.

- **An `icon` leads the name with a [`FormIcon`](form-icon.md)**: a form group's icon name, or `null` for a form group with none, which draws the generic spoon. `icon` absent draws no icon, as for a category group or a tradition.
- The group list's Name cell and the value lists' group cell draw it.

## updatedColumn

`updatedColumn(className?)` (`updated-column.tsx`) is the Updated column every audited list shares: "by **Fixture A** on 2026-10-12", who last changed the row and when, the name in bold and the date in a `<time>`.

- **The cell is empty when either of `updatedBy` and `updatedAt` is null**, since a date with no one to ask about it says little.
- The member list, the compendium list, the value lists and the group list draw it. The admin lists' names come from `editorStamps` (`src/app/(shell)/curator/editors.ts`), which reads them through `editorNamesForCurator` in one lookup per page, so a curator's screens render and show an editor whose account is gone as Unknown.

## Not here

Stories: `src/components/DataTable/index.stories.tsx`. Tests: none of its own; each list's test asserts the table it draws by role and label. The sortable headings and the Sort By select are asserted through the compendium list's test, the one list that sorts.
