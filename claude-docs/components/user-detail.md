# UserDetail

`src/components/UserDetail/` is the body of the modal that opens over
`/admin/users` when an admin presses a user's name (M9.19): the covens the user
belongs to, preceded by the facts the users table holds about them, and, where impersonation is registered, Impersonate. It is
render-only and a server component. The page reads the memberships through the
coven service and builds the modal around it; this draws only the body.

## Props

`UserDetailProps` (`types.ts`):

| Prop             | What it is                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`           | `UserDetailUser`: a `Pick` of the list's `UserListEntry` (id, name, email, emailVerified, role, primaryAdmin, canCreateWorkspace, providers, createdAt) |
| `memberships`    | The user's live covens as `UserCoven`s, in any order                                                                                                    |
| `canImpersonate` | Whether impersonation is registered here (MB.53); off by default                                                                                        |

A `UserCoven` is `workspaceId`, `name`, `slug`, the user's `role` there and
`joinedAt`.

## Contracts

- **The table's facts come first, read-only** (the owner's call): a `<dl>`
  of Email (verified or not), Role (bold for an admin, with the primary-admin
  crown), Coven Creation, Sign-In Methods and Signed Up, two columns where they
  fit and one on a phone. The address itself is not repeated: the modal's
  heading carries it. Name is the heading's. No Grant, Revoke or Approve
  here; those stay on the row, and Impersonate is the modal's only action.
- **The marks are the list's own.** `Mark` and `ProviderLogo` live in
  `UserList/marks.tsx`, which imports the list's stylesheet, so both draw the
  same; `PrimaryAdminMark` is `UserList/primary-admin-mark.tsx`.
- **A coven's name is text, never a link.** An admin is no member of the
  covens they read about, and `/coven/[slug]` answers a non-member 404.
- **The table is ordered here**: owners, then members, then viewers, each by
  coven name. The service's order is unspecified, and the list is bounded by
  the user's own memberships. Columns are Name, Role and Joined (a `<time>`
  with the UTC date, as the list's Signed Up is). Role labels live in
  `roles.ts`; M6.13's members page may move them somewhere shared.
- **Each coven is a card in the narrow modal** (the owner's call,
  2026-10-12): the name a step larger under its Name label, Role and Joined
  side by side beneath. `index.scss` does it under the primitive's own
  container query, on the `user-detail__covens` class doubled to outrank the
  primitive's row rule.
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
`Modal` (the question draws into its layer): the facts (a term and definition each, the sign-up `<time>`, the providers, the primary-admin mark only on the primary admin, no Grant/Revoke/Approve), the order and role of each row, no
links, no table when empty, Impersonate present for a user and absent for an
admin or when off, the question before any send, Cancel, a confirm sending
`{ userId }` then landing on `/`, and a refusal showing an alert and not
navigating.
