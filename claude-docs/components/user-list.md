# UserList

`src/components/UserList/` — `/admin/users`' filter, table and pager (MB.52).
It is render-only and a server component: the page reads one page of users
through the identity service and hands it over, with the filter as asked and
the hrefs of the pages either side
([`auth/admin-users.md`](../auth/admin-users.md), "The user list").

## Props

`UserListProps` (`types.ts`):

| Prop               | What it is                                                       |
| ------------------ | ---------------------------------------------------------------- |
| `users`            | This page's `UserListEntry` rows, in the list's order            |
| `query`            | The name-or-email filter as asked, blank for none                |
| `awaitingApproval` | Whether the list is narrowed to `canCreateWorkspace = false`     |
| `previousHref`     | The page before this one, absent on the first                    |
| `nextHref`         | The page after this one, absent on the last                      |
| `canImpersonate`   | Whether impersonation is registered here (MB.53); off by default |

A `UserListEntry` is the user row's name, email, role, `canCreateWorkspace`,
`createdAt` and `emailVerified`, plus `providers`, the provider ids the service
read beside it.

## Contracts

- **The filter is a GET form to `/admin/users`**, named "Filter users" inside
  a `<search>` landmark: a search box labelled "Name or email" (`query`), an
  "Awaiting approval only" checkbox (`awaiting`), and a Filter button. A
  filtered page is an address, and filtering starts again from the first page,
  since the form carries no cursor. It is `filter.tsx`, the second client file
  here.
- **Filter is offered only when there is a new filter to apply** (MB.53, on
  the owner's word). It is `disabled` while the trimmed query and the checkbox
  match the filter the page shows, enabled once either differs, and disabled
  again when they are put back. `disabled` rather than `aria-disabled`, as
  the primitives reserve it for a submit with nothing to send.
- **`awaiting` is a bare flag**, read by its presence (MB.53, on the owner's
  word). A submit builds the address itself with `href.ts`'s `userListHref`,
  the pager's builder too, so it reads `?query=bo&awaiting` rather than
  `awaiting=1`, and opens it as a full load, as the pager's anchors do. Before
  hydration the form submits natively, with the checkbox as `awaiting=`, which
  the page reads the same, as it does an older link's `awaiting=1`.
- **Seven columns**: Name, Email, Role, Can create a coven, Signed up, Sign-in
  methods and Email verified. The last two are what an admin granting admin
  judges a person by (MB.59). Booleans read Yes or No. The signup is the UTC
  date, in a `<time>` carrying the full instant. A provider shows by its
  `SOCIAL_PROVIDERS` label, or by its id when the roster has none, so an
  account linked by a provider since removed still says so; an account with
  none says None.
- **No match is a sentence, not an empty table**: "No users match."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors:
  Prev and Next, an end with no page disabled, and nothing at all on a list of
  one page. A plain anchor is a full load, so the page's guard runs again, as with
  `AdminNav`.
- **Impersonate is an eighth column, only where impersonation is registered**
  (MB.53, [`auth/impersonation.md`](../auth/impersonation.md)). The page
  passes `canImpersonate` from `impersonationEnabled()`, so at production the
  column does not exist. Each non-admin row holds an Impersonate button named
  "Impersonate <name>", from `impersonate-button.tsx`, the one client file
  here. An admin's row holds none, because the endpoint refuses to
  impersonate an admin. A success is a full load of `/` as the user. A refusal
  says "<name> could not be impersonated." in the row, and the page stays.
  The endpoint is the guard: the button only puts it where an admin looks.
- **The controls M5.8 and MB.59 add sit on these rows.** Neither exists yet;
  each adds its own column in its own PR.

## Styling

Layout only, until the admin area's design review (MB.115). The filter is a
wrapping row of the field, the checkbox and the button, built on the
`.field`, `.input`, `.checkbox` and `.btn` primitives. The table is the
`.data-table` primitive, filling the layout's width and scrolling inside its
`.data-table-frame` on a narrow screen rather than widening the page: its rows
are banded and its header carries a hairline, as every admin list's does, and its pager is the shared `.pager` primitive: Prev and Next, centred ([`styling.md`](../styling.md), "Buttons"). Tokens: `space()`, `$text-muted` and `$surface-card`.

## Stories

[`index.stories.tsx`](../../src/components/UserList/index.stories.tsx) —
`Default`, `Filtered`, `NoMatch` and `WithImpersonation`, inside the admin
layout's frame. In the workshop an Impersonate reaches no server, so a click
shows the refusal.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/UserList/index.test.tsx` covers the Filter button's
disabled and enabled states, the bare `awaiting` it opens, the column headers, each
row's cells, the `<time>`, a provider outside the roster, the empty list, the
form's action, method, names and kept values, the pager's links, and the
Impersonate column: absent when off, on non-admin rows only, the call and
the landing, and the refusal.
`tests/app/admin/users/page.test.tsx` covers what the page hands it, the
impersonation gate included, and `awaiting` read by its presence.
