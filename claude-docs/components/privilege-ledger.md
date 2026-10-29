# PrivilegeLedger

`src/components/PrivilegeLedger/` — `/admin/privilege-changes`' filter, table
and pager (MB.200). It is render-only and a server component: the page reads
one page of the privilege ledger through the identity service and hands it
over, with the filter as asked and the hrefs of the pages either side
([`auth/admin-users.md`](../auth/admin-users.md), "The privilege ledger").

## Props

`PrivilegeLedgerProps` (`types.ts`):

| Prop           | What it is                                                        |
| -------------- | ----------------------------------------------------------------- |
| `changes`      | This page's `PrivilegeLedgerEntry` rows, newest first             |
| `filter`       | The filter the page shows: `query` and `privilege`, each optional |
| `previousHref` | The page before this one, absent on the first                     |
| `nextHref`     | The page after this one, absent on the last                       |
| `position`     | Where the page stands, for the pager's "Page X of Y"              |

A `PrivilegeLedgerEntry` is the row's `id`, `at`, `privilege`, `change`, `via`
and `note`, and its `subject` and `actor` as a `LedgerPerson`, a name and the
`href` of their `/admin/users` row, or null when no live account holds the
id.

## Contracts

- **One ledger, filtered, not a page per privilege.** The filter is a GET
  form to `/admin/privilege-changes` (`PRIVILEGE_CHANGES_PATH`, `href.ts`), named "Filter Privilege Changes" inside
  a `<search>` landmark, as the user list's is
  ([`user-list.md`](user-list.md)): a search box labelled "Name or Email"
  (`query`), matching part of the subject's name or email, a Privilege
  dropdown (`privilege`: All Privileges, then `PRIVILEGE_LABELS`, Admin or
  Coven Creation, in title case as every label is; a `FilterSelectField`,
  [`field.md`](field.md)), both on the owner's call, and no Filter button (MB.115). It is `filter.tsx`, the one client file here:
  the search text, held in state, inside the shared `FilterForm`
  ([`filter-form.md`](filter-form.md#contracts)). The server draws
  the dropdown as a native `<select>`, so before hydration the form still
  submits, All Privileges as `privilege=`, which the page reads as no
  privilege; once hydrated it is the select-only box, so the row has one
  dropdown look (the owner's call). The dropdown applies the moment a choice
  is picked, and the search from its magnifier or Enter, each carrying the other. Clear, offered
  only while the page shows a query or a privilege, opens
  `/admin/privilege-changes` with neither. `href.ts`'s `privilegeLedgerHref`, a thin typed wrapper
  over the shared `listHref` (`src/lib/list-href.ts`), builds every address here, the
  submit's, the pager's and each `UserList` row's history link included:
  `?query=` and `?privilege=admin|create_workspace`. A user row's
  privilege changes icon opens it with their address in the search, which
  fills the box: the owner's call, over a separate `?user=<id>` filter and a
  line saying whose changes are shown. The match is the user list's, a
  case-insensitive substring, so an address inside another (`ada@…` in
  `bada@…`) matches both.
- **Seven columns**: When, User, Privilege, Change, How, Changed By and Note,
  each heading in title case (DESIGN.md §9), drawn by
  [`StackTable`](data-table.md), so each heading is also its cells'
  `data-label` and the table's roles are written out to stack into cards at
  phone width. When is the UTC minute, saying
  UTC since the server renders it, in a `<time>` carrying the full instant.
  Privilege reads Admin or Coven Creation, from `PRIVILEGE_LABELS`
  (`privileges.ts`), the one option list the privilege filter, this column
  and the page's reading of `?privilege` share. Change reads Granted or Revoked, and How
  Seeded, By an admin, Invitation accepted or Manual fix. Seeded covers every
  user the seed inserts holding a privilege, the fixture users as well as the
  bootstrap admin, so it names the seed rather than the primary admin.
- **User and Changed By link to the person's `/admin/users` row**, the list
  filtered to their address. A person the user list leaves out, the seed's
  bootstrap user, is named without a link, and an id no live account holds
  reads "Deleted account".
- **The note shows only where one was given**: an empty cell otherwise.
- **Nothing to show is a sentence, not an empty table**: "No privilege
  changes yet." With a filter in force it names each one and what to do, in
  the one wording every admin list uses (`noMatchText`, `src/lib/text.ts`):
  "No privilege changes match “ada” and the privilege Admin. Change or clear
  the filter to see more."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors and
  the page's position, as every admin list's.

## Styling

Built from the shared list primitives ([`styling.md`](../styling.md),
"Designing a section"): the root is a `.list-frame`, the filter
`FilterForm`'s `.filter-row` on the `.field`, `.input`, `.select` and `.btn`
primitives, the table [`StackTable`](data-table.md), a `.data-table` with `--stack` in its
`.data-table-frame`, and the pager the `.pager`. Under `$table-stack-width`
of its frame each change is a card, every fact led by its column's name. Its
own stylesheet keeps the time on one line and holds the note to `$measure`.
Its look is MB.115's, signed off as it stands; "privilege changes" is the
ledger's one name everywhere, its tab, its empty state and the user list's
icon.

## Stories

[`index.stories.tsx`](../../src/components/PrivilegeLedger/index.stories.tsx),
`Admin / Privilege Ledger`: `States`, with a control that chooses First Page (everything), Middle Page, Last Page, One User (searched by address),
One User Admin Only (and by privilege), Empty and No Matches, on
invented people, each state's rows what its filter would show: every route, a
note on a role grant and the flag it set at one instant, a deleted subject and
the seed's actor, unlinked. Each sits inside the admin layout's frame and the People page with its Privilege Changes tab open;
at 375px, from the toolbar viewport menu, the header and every change show as a card.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/PrivilegeLedger/index.test.tsx` covers each row's data,
the links to the user rows and the people without one, the `<time>`, through
the shared filter rows (`tests/support/filter-form.tsx`, [`filter-form.md`](filter-form.md)) the filter's form, search, dropdown values, no Filter button and the
address a change or the magnifier opens, Clear offered by a query or a privilege and absent
with neither, the row starting again from a filter shown anew, no table when there is nothing to show, and
`privilegeLedgerHref`. Paging is Pager's.
`tests/app/(shell)/admin/(people)/privilege-changes/page.test.tsx` covers what the page hands
it, and `tests/e2e/admin/privilege-changes.spec.ts` the page against the built
server, with axe.

## The filter

The ledger's filter is built in the shared `FilterForm`, as the user list's is. Only the search text (part of the subject's name or email) is held in the form, and it is sent when the magnifier or Enter is pressed. The Privilege dropdown is a select-only box once the page has hydrated (`FilterSelectField`). It starts from the filter shown and applies the moment a choice is picked, softly and from the first page, carrying the search text along, so there is no Filter button. Before hydration the server's native select submits, with "All Privileges" sent as `privilege=`, which the page reads as no privilege.
