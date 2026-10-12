# UserDetail

`src/components/UserDetail/` is the body of the modal that opens over
`/admin/users` when an admin presses a user's name (M9.19): the covens the user
belongs to and, where impersonation is registered, Impersonate. It is
render-only and a server component. The page reads the memberships through the
coven service and builds the modal around it; this draws only the body.

## Props

`UserDetailProps` (`types.ts`):

| Prop             | What it is                                                       |
| ---------------- | ---------------------------------------------------------------- |
| `user`           | `{ id, name, role }`, the row the modal is open on               |
| `memberships`    | The user's live covens as `UserCoven`s, in any order             |
| `canImpersonate` | Whether impersonation is registered here (MB.53); off by default |

A `UserCoven` is `workspaceId`, `name`, `slug`, the user's `role` there and
`joinedAt`.

## Contracts

- **A coven's name is text, never a link.** An admin is no member of the
  covens they read about, and `/coven/[slug]` answers a non-member 404.
- **The table is ordered here**: owners, then members, then viewers, each by
  coven name. The service's order is unspecified, and the list is bounded by
  the user's own memberships. Columns are Coven, Role and Joined (a `<time>`
  with the UTC date, as the list's Signed Up is). Role labels live in
  `roles.ts`; M6.13's members page may move them somewhere shared.
- **No memberships** draws a sentence in place of the table.
- **Impersonate shows only for a non-admin, where `canImpersonate`**, the
  list's own rule: Better Auth refuses an admin target whatever this shows.
- **It asks first inside the modal**, through `ConfirmQuestion`
  ([`modal.md`](modal.md)) rather than `ConfirmedAction`, which would open a
  second modal on top. `impersonate-action.tsx` is the one client file. The
  wording, landing and send are `UserList/impersonation.tsx`, shared with the
  list's row button, so the two cannot drift. A success does a full load of
  `/`, the question busy until it opens; a refusal closes the question and
  shows an error notice.
- **Tokens only**: spacing from `space()`; the button row is the page's own
  `btn btn--destructive`. No styling past the tokens before the section's
  design review.

## Tests

`tests/components/UserDetail/index.test.tsx`, with the component inside a
`Modal` (the question draws into its layer): the order and role of each row, no
links, no table when empty, Impersonate present for a user and absent for an
admin or when off, the question before any send, Cancel, a confirm sending
`{ userId }` then landing on `/`, and a refusal showing an alert and not
navigating.
