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
  form to `/admin/privilege-changes`, named "Filter Privilege Changes" inside
  a `<search>` landmark, as the user list's is
  ([`user-list.md`](user-list.md)): a search box labelled "Name or Email"
  (`query`), matching part of the subject's name or email, a native Privilege
  dropdown (`privilege`: All Privileges, Admin or Coven Creation, in title
  case as every label is), both on the owner's call, and a Filter button. It is `filter.tsx`, the one client file here:
  the fields and their state inside the shared `FilterForm`
  ([`filter-form.md`](filter-form.md)), so from the press until the full load
  leaves the row is greyed and off and the list beneath it is the tabs'
  skeleton (MB.115; [`list-frame.md`](list-frame.md)). A native
  `<select>`, so before hydration the form still submits, All Privileges as
  `privilege=`, which the page reads as no privilege. Filter is `disabled`
  while the trimmed query and the dropdown match the filter shown, as the
  user list's is (MB.53), and a submit opens the new filter from the first
  page as a full load. Clear, offered while the page shows a query
  or a privilege, opens `/admin/privilege-changes` with neither, as the
  same full load, and while only the fields hold one empties them in place ([`filter-form.md`](filter-form.md)). `href.ts`'s `privilegeLedgerHref`, a thin typed wrapper
  over the shared `listHref` (`src/lib/list-href.ts`), builds every address here, the
  submit's, the pager's and each `UserList` row's history link included:
  `?query=` and `?privilege=admin|create_workspace`. A user row's
  privilege changes icon opens it with their address in the search, which
  fills the box: the owner's call, over a separate `?user=<id>` filter and a
  line saying whose changes are shown. The match is the user list's, a
  case-insensitive substring, so an address inside another (`ada@…` in
  `bada@…`) matches both.
- **Seven columns**: When, User, Privilege, Change, How, Changed By and Note,
  each heading in title case (DESIGN.md §9), the headings and each cell's
  `data-label` from one `COLUMNS` list, the table's roles written out so it
  can stack into cards at phone width. When is the UTC minute, saying
  UTC since the server renders it, in a `<time>` carrying the full instant.
  Privilege reads Admin or Coven creation, Change Granted or Revoked, and How
  Primary admin bootstrap, By an admin, Invitation accepted or Manual fix.
- **User and Changed By link to the person's `/admin/users` row**, the list
  filtered to their address. A person the user list leaves out, the seed's
  bootstrap user, is named without a link, and an id no live account holds
  reads "Deleted account".
- **The note shows only where one was given**: an empty cell otherwise.
- **Nothing to show is a sentence, not an empty table**, in plain words for
  the filter, on the owner's wording: "No privilege changes yet.", "No
  privilege changes for “<query>”.", "No admin changes yet.", "No coven
  creation changes yet.", "No admin changes for “<query>”." or "No coven
  creation changes for “<query>”."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors and
  the page's position, as every admin list's.

## Styling

Built from the shared list primitives ([`styling.md`](../styling.md),
"Designing a section"): the root is a `.list-frame`, the filter
`FilterForm`'s `.filter-row` on the `.field`, `.input`, `.select` and `.btn`
primitives, the table a `.data-table` with `--stack` in its
`.data-table-frame`, and the pager the `.pager`. Under `$table-stack-width`
of its frame each change is a card, every fact led by its column's name. Its
own stylesheet keeps the time on one line and holds the note to `$measure`.
Its look is MB.115's, signed off as it stands; "privilege changes" is the
ledger's one name everywhere, its tab, its empty state and the user list's
icon.

## Stories

[`index.stories.tsx`](../../src/components/PrivilegeLedger/index.stories.tsx),
`Admin / Privilege Ledger`: `Everything`, `OneUser` (searched by address),
`OneUserAdminOnly` (and by privilege), `Empty` and `EmptyForASearch`, on
invented people, each story's rows what its filter would show: every route, a
note on a role grant and the flag it set at one instant, a deleted subject and
the seed's actor, unlinked. `PhoneDark` and `PhoneLight` show the page's
header and every change as a card at 375px, inside the admin layout's frame,
and `FilteredPhoneDark` and `FilteredPhoneLight` `OneUserAdminOnly` there, with
Clear offered.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/PrivilegeLedger/index.test.tsx` covers each row's data,
the links to the user rows and the people without one, the `<time>`, the
filter's form, search, dropdown values, disabled and enabled Filter and the
address it opens, Clear offered by a query or a privilege and off
with neither, and the fields emptied in place when neither is applied, no table when there is nothing to show, and
`privilegeLedgerHref`. Paging is Pager's.
`tests/app/admin/(people)/privilege-changes/page.test.tsx` covers what the page hands
it, and `tests/e2e/admin/privilege-changes.spec.ts` the page against the built
server, with axe.
