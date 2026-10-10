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
  a `<search>` landmark: a search box labelled "Name or Email" (`query`), a
  native Role select (`role`: All roles, Admin or User), a "Needs Approval"
  checkbox (`awaiting`), each label in title case on the owner's call, and a
  Filter button. All roles submits natively as `role=`, which the page reads
  as no role. A
  filtered page is an address, and filtering starts again from the first page,
  since the form carries no cursor. It is `filter.tsx`, one of three client files
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
- **Six columns, in the owner's order**: Name, Email, Role, Sign-In Methods,
  Signed Up and Can Create a Coven, each heading in title case (DESIGN.md §9). The Email
  cell leads with whether the address is verified, then the address, so the
  two are one column. Sign-in methods and the verified mark are what an admin
  granting admin judges a person by (MB.59). A yes-or-no is a mark, on the
  owner's call: a green check (`$accent`) or a red cross (`$secondary`), from
  `icons.tsx`, its word beside it in `.visually-hidden` since the mark is
  drawn alone, and the icon `aria-hidden`. The email's says Verified or
  Unverified, and on hover in a tip bubble too (`tip-bubble`, the form tips'
  look, opened by `tip-bubble-open`), so the eye learns what it marks: a
  native `title` showed too late to be seen, on the owner's review. The bubble
  is `aria-hidden`, the reader having the hidden word. The creation flag's
  says Yes or No, which its heading asks, and has no bubble.
  An admin's role is bold, on the owner's call. The signup is the UTC
  date, in a `<time>` carrying the full instant. A provider shows as its
  logo, on the owner's call: the sign-in page's own mark (`SignInPanel/icons.tsx`)
  on a small circle of its brand's ground, white for Google and Microsoft,
  blurple for Discord, Facebook's its own blue, the colours hex literals as the
  panel's are. Each is named by its `SOCIAL_PROVIDERS` label in hidden text and
  in the same tip bubble on hover as the email's mark (`.user-list__hint`). A
  provider the roster no longer has keeps its id as text, so an account linked
  by one since removed still says so; an account with none has an empty cell.
- **No match is a sentence, not an empty table**: "No users match."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors:
  Prev and Next, an end with no page disabled, and nothing at all on a list of
  one page. A plain anchor is a full load, so the page's guard runs again, as with
  `AdminNav`.
- **Impersonate is a seventh column, only where impersonation is registered**
  (MB.53, [`auth/impersonation.md`](../auth/impersonation.md)). The page
  passes `canImpersonate` from `impersonationEnabled()`, so at production the
  column does not exist. Each non-admin row holds an Impersonate button named
  "Impersonate <name>", from `impersonate-button.tsx`, a client file. An admin's row holds none, because the endpoint refuses to
  impersonate an admin. A success is a full load of `/` as the user. A refusal
  says "<name> could not be impersonated." in the row, and the page stays.
  The endpoint is the guard: the button only puts it where an admin looks.
  The column, heading and cells, has a red rule down its left. The column is
  tinted a faded red with red text, and its heading's hairline is red where
  every other is the muted ink.
  Its
  button is `.btn--destructive`, on the owner's call: it is the one control
  that acts as someone else.
- **Can create a coven holds its control** (M5.8,
  [`auth/admin-users.md`](../auth/admin-users.md), "Approving workspace
  creation"), from `creation-control.tsx`, beside the mark it changes: one
  column rather than a second saying the same thing, on the owner's review,
  and the heading says what is approved so the buttons stay one word. A user
  who may not yet create a coven has Approve, quiet, named "Approve <name>";
  one who may has Revoke, red, named "Revoke approval for <name>", on the
  owner's call; an admin's row has the
  mark alone, since every admin holds the flag (MB.177). Each asks first, in a
  `Modal` ([`modal.md`](modal.md)) titled "Approve Coven Creation" or "Revoke
  Coven Creation", on the owner's call, the name in bold: "Let <name> create covens?", or "Stop
  <name> from creating covens? Covens they own stay theirs.", with the action
  again, which takes focus, and a quiet Cancel, which closes it and hands focus
  back to the row's button. The modal's Revoke is `.btn--destructive`, its
  Approve `.btn--solid`. Every button in the table, Impersonate included, is
  `.btn--small`, so a row is no taller than its text. The modal's action sends
  the mutation and stays busy, spinner and "Approving" or "Revoking", until
  `router.refresh()` re-reads the page, whose row then offers the other
  action: the control is keyed by its action, so the refreshed row mounts a
  fresh one, without the modal, rather than keeping the busy state. A refusal
  closes the modal, puts the service's message in the row as an alert, and
  offers the action again. The service is the guard.
- **MB.59's grant control sits on these rows too.** It does not exist yet, and
  adds its own column in its own PR.

## Styling

Layout only, until the admin area's design review (MB.115). Its cells are centred on the row rather than on the text's baseline, the
primitive's rule, since its rows mix text with logo circles, marks and
buttons whose baselines sit at different heights, and the signup date never
breaks at its hyphens (the owner's review). The filter is a
wrapping row of the field, the checkbox and the button. The creation cell is
a wrapping row of the mark and the control, and the confirmation is the
`Modal`'s own layout, its buttons in `.modal__actions`, all built on the
`.field`, `.input`, `.checkbox` and `.btn` primitives. The table is the
`.data-table` primitive, filling the layout's width and scrolling inside its
`.data-table-frame` on a narrow screen rather than widening the page: its rows
are banded and its header carries a hairline, as every admin list's does, and its pager is the shared `.pager` primitive: Prev and Next, centred ([`styling.md`](../styling.md), "Buttons"). Tokens: `space()`, `$text-muted` and `$surface-card`.

## Stories

[`index.stories.tsx`](../../src/components/UserList/index.stories.tsx) —
`Default`, `Filtered`, `NoMatch` and `WithImpersonation`, inside the admin
layout's frame; the list holds an admin, a user awaiting approval and an
approved user, so each control shows. In the workshop neither Impersonate nor Approve or Revoke reaches a
server, so a click shows the refusal.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/UserList/index.test.tsx` covers the Filter button's
disabled and enabled states, the bare `awaiting` it opens, the Role select
and the `role` it opens, the column headers, each
row's cells, the `<time>`, a provider outside the roster, the empty list, the
form's action, method, names and kept values, the pager's links, and the
Impersonate column: absent when off, on non-admin rows only, the call and
the landing, and the refusal; the yes-or-no marks and their words; and the creation cell: Approve on rows awaiting
approval, Revoke on approved ones and nothing on an admin's, each modal
and its focus, Cancel sending nothing, each call and its busy state until the
refresh, and the refusal. `tests/e2e/admin.spec.ts` approves and revokes a user
against the built server, with axe over the open modal.
`tests/app/admin/users/page.test.tsx` covers what the page hands it, the
impersonation gate included, and `awaiting` read by its presence.
