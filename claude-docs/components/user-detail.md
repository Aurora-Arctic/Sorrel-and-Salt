# UserDetail

`src/components/UserDetail/` is the body of the modal that opens over
`/admin/users` when an admin presses a user's name (M9.19): the covens the user
belongs to, preceded by the facts the users table holds about them, and, where
impersonation is registered, Impersonate. It is render-only and a server component. The page reads the memberships through the
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

- **Laid out as the ingredient modal is, not as a table** (the owner's call,
  2026-10-12): two sections, Account and Covens, each under a small title in
  the heading face and parted by hairlines, with Impersonate under the last
  one, where the other modals stand their actions. A table at a modal's width
  stacks into cards that repeat every label on every coven.
- **The table's facts come first**: a `<dl>` of Email (verified
  or not, the word with the check or cross to its right), Role (bold for an admin or a curator, with the
  primary-admin crown), Coven Creation (Yes or No, the mark to its right),
  Sign-In Methods and Signed Up, the terms in one column and their values in
  the next. The address itself is not repeated: the heading carries it, under
  the name.
- **The row's controls sit beside the facts they change, at the right edge**
  (the owner's call, 2026-10-12): Change Role beside Role, Approve or Revoke of coven creation beside Coven Creation (none for a curator or an admin, as on the row). They are the row's own `RoleControl` and
  `CreationControl`, keyed by their action, locked by `changesPaused` as the
  row's are (MB.63). With `inModal`, `ConfirmedAction` asks over this modal's
  body through `ConfirmOverlay`, its warning and Reason field included,
  rather than open a second modal on top; a success reads the page again, so
  the modal shows the new value and the other action. A refusal is the
  callout under the control, with its badge, as on the row, rather than a
  notice in the modal (`refusalInModal="callout"`; the owner's exception to
  M12.31's rule 6, 2026-10-20): it floats over the rows, so nothing below
  moves, and Escape closes it and leaves the modal open.
- **The marks are the list's own.** `ProviderLogo` lives in
  `UserList/marks.tsx` beside the table's `Mark`, and imports the list's
  stylesheet, so both draw the same; the check and cross are the list's icons
  in its `user-list__mark` colours; `PrimaryAdminMark` is `UserList/primary-admin-mark.tsx`.
- **A coven's name is text, never a link.** An admin is no member of the
  covens they read about, and `/coven/[slug]` answers a non-member 404.
- **The covens are a list, ordered here**: owners, then members, then
  viewers, each by coven name. The service's order is unspecified, and the list
  is bounded by the user's own memberships. Each item is the coven's name, then
  its role and the day they joined (a `<time>` with the UTC date, as the list's
  Signed Up is) in the muted ink at the caption size, as a folded ingredient
  section's summary reads. Role labels live in `roles.ts`; M6.13's members page
  may move them somewhere shared.
- **No memberships** draws a sentence in place of the list.
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

## Stories

[`index.stories.tsx`](../../src/components/UserDetail/index.stories.tsx),
`Admin / User Detail`, on invented people. Impersonate reaches Better Auth,
which the workshop does not serve: the question can be seen, its answer cannot.

`States` has a control that chooses:

- Default: a user with three covens, each role once, and Impersonate.
- No Covens: the same user holding none.
- Several Providers: four sign-in methods and an unverified address.
- Admin: the primary admin, marked, with no Impersonate, as the endpoint
  refuses an admin. Curator and Other Admin are the other roles.
- Without Impersonation: the user where impersonation is not registered.
- Changes Paused, May Create Covens and No Providers.
- `InAModal`: the detail inside a `Modal`, in its own iframe, so Impersonate's
  question draws over it.

## Tests

`tests/components/UserDetail/index.test.tsx`, with the component inside a
`Modal` (the question draws into its layer): the facts (a term and definition each, the sign-up `<time>`, the providers, the primary-admin mark only on the primary admin), Change Role and Approve beside their facts and no creation control on a curator or an admin, each asking inside the one dialog and sending its write, both locked while paused, the order, role and joining date of each coven,
no links, no coven list when empty, Impersonate present for a user and absent for an
admin or when off, the question before any send, Cancel, a confirm sending
`{ userId }` then landing on `/`, and a refusal showing an alert and not
navigating.

## The modal body

The component is the body of the modal that opens over `/admin/users` on a user. It shows the facts the users table holds about them, read-only, then the covens they belong to and, where impersonation is registered, the action to act as them. The row's Grant or Revoke and Approve or Revoke sit beside the facts they change, and each asks over this modal rather than opening another.

It is laid out as the ingredient modal is, in sections parted by hairlines, because a table's labels repeat on every card at a modal's width. It only renders: the page reads the memberships through the coven service.
