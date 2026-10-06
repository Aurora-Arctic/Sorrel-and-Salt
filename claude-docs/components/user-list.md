# UserList

`src/components/UserList/` — `/admin/users`' filter, table and pager (MB.52).
It is render-only and a server component: the page reads one page of users
through the identity service and hands it over, with the filter as asked and
the hrefs of the pages either side
([`auth/admin-users.md`](../auth/admin-users.md), "The user list").

## Props

`UserListProps` (`types.ts`):

| Prop               | What it is                                                   |
| ------------------ | ------------------------------------------------------------ |
| `users`            | This page's `UserListEntry` rows, in the list's order        |
| `query`            | The name-or-email filter as asked, blank for none            |
| `awaitingApproval` | Whether the list is narrowed to `canCreateWorkspace = false` |
| `previousHref`     | The page before this one, absent on the first                |
| `nextHref`         | The page after this one, absent on the last                  |

A `UserListEntry` is the user row's name, email, role, `canCreateWorkspace`,
`createdAt` and `emailVerified`, plus `providers`, the provider ids the service
read beside it.

## Contracts

- **The filter is a GET form to `/admin/users`**, named "Filter users" inside
  a `<search>` landmark: a
  search box labelled "Name or email" (`query`), an "Awaiting approval only"
  checkbox (`awaiting=1`), and a Filter button. A filtered page is an address,
  and submitting it starts again from the first page, since the form carries no
  cursor.
- **Seven columns**: Name, Email, Role, Can create a coven, Signed up, Sign-in
  methods and Email verified. The last two are what an admin granting admin
  judges a person by (MB.59). Booleans read Yes or No. The signup is the UTC
  date, in a `<time>` carrying the full instant. A provider shows by its
  `SOCIAL_PROVIDERS` label, or by its id when the roster has none, so an
  account linked by a provider since removed still says so; an account with
  none says None.
- **No match is a sentence, not an empty table**: "No users match."
- **The pager is a `<nav>` named "Pages"**, holding Previous and Next as plain
  anchors, each only when that page exists, and nothing at all on a list of one
  page. A plain anchor is a full load, so the page's guard runs again, as with
  `AdminNav`.
- **The controls M5.8 and MB.59 add sit on these rows.** Neither exists yet;
  each adds its own column in its own PR.

## Styling

Layout only, until the admin area's design review (MB.115). The filter is a
wrapping row of the field, the checkbox and the button, built on the
`.field`, `.input`, `.checkbox` and `.btn` primitives. The table fills the
layout's width and scrolls inside its own frame on a narrow screen, rather
than widening the page. The pager is a row of links with no ◆ marker, as
`AdminNav`'s is. No tokens beyond `space()`.

## Stories

[`index.stories.tsx`](../../src/components/UserList/index.stories.tsx) —
`Default`, `Filtered` and `NoMatch`, inside the admin layout's frame.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/UserList/index.test.tsx` covers the column headers, each
row's cells, the `<time>`, a provider outside the roster, the empty list, the
form's action, method, names and kept values, and the pager's links.
`tests/app/admin/users/page.test.tsx` covers what the page hands it.
