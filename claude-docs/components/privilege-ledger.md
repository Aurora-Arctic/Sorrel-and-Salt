# PrivilegeLedger

`src/components/PrivilegeLedger/` — `/admin/privilege-changes`' filter, table
and pager (MB.200). It is render-only and a server component: the page reads
one page of the privilege ledger through the identity service and hands it
over, with the filter as asked and the hrefs of the pages either side
([`auth/admin-users.md`](../auth/admin-users.md), "The privilege ledger").

## Props

`PrivilegeLedgerProps` (`types.ts`):

| Prop           | What it is                                                                   |
| -------------- | ---------------------------------------------------------------------------- |
| `changes`      | This page's `PrivilegeLedgerEntry` rows, newest first                        |
| `filter`       | The filter the page shows: `userId` and `privilege`, each optional           |
| `subjectName`  | The name of the user `filter.userId` names; "this account" when none is live |
| `previousHref` | The page before this one, absent on the first                                |
| `nextHref`     | The page after this one, absent on the last                                  |
| `position`     | Where the page stands, for the pager's "Page X of Y"                         |

A `PrivilegeLedgerEntry` is the row's `id`, `at`, `privilege`, `change`, `via`
and `note`, and its `subject` and `actor` as a `LedgerPerson`, a name and the
`href` of their `/admin/users` row, or null when no live account holds the
id.

## Contracts

- **One ledger, filtered, not a page per privilege.** A `<nav>` labelled
  "Privilege" offers All Privileges, Admin and Coven Creation as links, each
  keeping the user filter, the one shown `aria-current="page"` and in
  `<strong>`, so it is told apart by more than colour. A link rather than a
  form: there is nothing to type, and a link is an address before hydration.
  `href.ts`'s `privilegeLedgerHref` builds every address here, the pager's and
  each `UserList` row's History link included: `?user=<id>` and
  `?privilege=admin|create_workspace`.
- **Narrowed to one user, it says so**: "Changes to <name> only.", with a
  Show Every User link that keeps the privilege.
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
  the filter: "No privilege has changed yet.", "No changes to who is an
  admin.", "No changes to <name>'s privileges.", or "No changes to whether
  <name> may create a coven."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors and
  the page's position, as every admin list's.

## Styling

Layout only, until the admin area's design review (MB.115): a column of the
filter, the table and the pager; the privilege links a wrapping row; the time
on one line; and the note held to `$measure`. The table is the `.data-table`
primitive in its `.data-table-frame`, the pager the `.pager` primitive.
Tokens: `space()` and `$measure`.

## Stories

[`index.stories.tsx`](../../src/components/PrivilegeLedger/index.stories.tsx)
— `Everything`, `OneUser`, `Empty` and `EmptyForOneUser`, on invented people:
every route, a note on a role grant and the flag it set at one instant, a
deleted subject and the seed's actor, unlinked. Render-only, no test ids, no
snapshots.

## Testing

`tests/components/PrivilegeLedger/index.test.tsx` covers the headings, each
row's cells, the links to the user rows and the people without one, the
`<time>`, the privilege links and the current one, the user line, every empty
state, the pager, and `privilegeLedgerHref`.
`tests/app/admin/privilege-changes/page.test.tsx` covers what the page hands
it, and `tests/e2e/admin/privilege-changes.spec.ts` the page against the built
server, with axe.
