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
  form to `/admin/privilege-changes`, named "Filter privilege changes" inside
  a `<search>` landmark, as the user list's is
  ([`user-list.md`](user-list.md)): a search box labelled "Name or Email"
  (`query`), matching part of the subject's name or email, a native Privilege
  dropdown (`privilege`: All, Admin or Coven creation), both on the owner's
  call, and a Filter button. It is `filter.tsx`, the one client file here. A native
  `<select>`, so before hydration the form still submits, All as
  `privilege=`, which the page reads as no privilege. Filter is `disabled`
  while the trimmed query and the dropdown match the filter shown, as the
  user list's is (MB.53), and a submit opens the new filter from the first
  page as a full load. `href.ts`'s `privilegeLedgerHref` builds every address here, the
  submit's, the pager's and each `UserList` row's history link included:
  `?query=` and `?privilege=admin|create_workspace`. A user row's
  permissions history icon opens it with their address in the search, which
  fills the box: the owner's call, over a separate `?user=<id>` filter and a
  line saying whose changes are shown. The match is the user list's, a
  case-insensitive substring, so an address inside another (`ada@…` in
  `bada@…`) matches both.
- **Seven columns**: When, User, Privilege, Change, How, Changed By and Note,
  each heading in title case (DESIGN.md §9). When is the UTC minute, saying
  UTC since the server renders it, in a `<time>` carrying the full instant.
  Privilege reads Admin or Coven creation, Change Granted or Revoked, and How
  Primary admin bootstrap, By an admin, Invitation accepted or Manual fix.
- **User and Changed By link to the person's `/admin/users` row**, the list
  filtered to their address. A person the user list leaves out, the seed's
  bootstrap user, is named without a link, and an id no live account holds
  reads "Deleted account".
- **The note shows only where one was given**: an empty cell otherwise.
- **Nothing to show is a sentence, not an empty table**, in plain words for
  the filter, on the owner's wording: "No permission changes yet.", "No
  permission changes for “<query>”.", "No admin changes yet.", "No coven
  creation changes yet.", "No admin changes for “<query>”." or "No coven
  creation changes for “<query>”."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors and
  the page's position, as every admin list's.

## Styling

Layout only, until the admin area's design review (MB.115): a column of the
filter, the table and the pager; the filter a wrapping row of the two fields
and the button, on the `.field`, `.input`, `.select` and `.btn` primitives; the time
on one line; and the note held to `$measure`. The table is the `.data-table`
primitive in its `.data-table-frame`, the pager the `.pager` primitive.
Tokens: `space()` and `$measure`.

## Stories

[`index.stories.tsx`](../../src/components/PrivilegeLedger/index.stories.tsx)
— `Everything`, `OneUser` (searched by address), `OneUserAdminOnly` (and by
privilege), `Empty` and `EmptyForASearch`, on invented people, each story's
rows what its filter would show: every route, a note on a role grant and the flag it set at one instant, a
deleted subject and the seed's actor, unlinked. Render-only, no test ids, no
snapshots.

## Testing

`tests/components/PrivilegeLedger/index.test.tsx` covers each row's data,
the links to the user rows and the people without one, the `<time>`, the
filter's form, search, dropdown values, disabled and enabled Filter and the
address it opens, no table when there is nothing to show, and
`privilegeLedgerHref`. Paging is Pager's.
`tests/app/admin/privilege-changes/page.test.tsx` covers what the page hands
it, and `tests/e2e/admin/privilege-changes.spec.ts` the page against the built
server, with axe.
