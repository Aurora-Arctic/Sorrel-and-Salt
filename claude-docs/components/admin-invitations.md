# Admin Invitations

`src/components/AdminInvitations/` — the admin invitations section of
`/admin/users` (MB.70): **Invite Admin**, and the pending invitations, each
with its address, its reason, when it expires and **Revoke**. Render-only: the
page reads the list through `listPendingAdminInvitations` and whether this
admin is held by the pause, and hands both down. The rules are
[`auth/admin-users.md`](../auth/admin-users.md), "Inviting an admin".

## Contracts

- **Props.** `invitations`, newest first, each `{ id, email, note, expiresAt }`;
  and `locked`, the pause's reason (`ADMIN_CHANGES_PAUSED_REFUSAL`) while
  admin changes are paused and this admin is not the primary one, absent
  otherwise. The page sets it from `adminRoleChangePauseState`: paused and
  not `canToggle`.
- **The user list's own parts.** Revoke asks first through
  `UserList/confirmed-action.tsx`'s `ConfirmedAction`, naming the address,
  and a locked control is `UserList/locked-control.tsx`'s `LockedControl`:
  `aria-disabled` with the reason in a tip and said again as an alert on a
  click. The component imports the user list's stylesheet for their classes,
  so it stands on its own in the workshop.
- **Invite Admin** (`invite-form.tsx`) opens a modal with the address and an
  optional **Reason**, spaced as the user list's confirmation spaces its own.
  **Send Invitation** stays disabled until there is an address, and shows a
  spinner while sending; Cancel is quiet. A `VALIDATION` refusal on `email`
  is said beside the field; anything else in an alert in the modal. A sent
  invitation closes the modal, says "Invitation sent to …" beside the button,
  and refreshes the page, whose re-read lists it. No link is ever shown: the
  mutation answers none.
- **The expiry** is `inUtc` (`src/lib/utc.ts`), in a `<time>`: a date and a
  time, since a link lasts seven days to the minute.

## Styling

Layout only, until the admin area's design review (MB.115). The table is the
`.data-table` primitive in its scrolling frame, and no cell wraps, as in the
user list (the owner's call during MB.59). `.field.admin-invitations__note`
and `.notice.admin-invitations__sent` are compounded with their primitives,
which the app scopes as `body .x`. Tokens used: `space()` and `$text-muted`.

## Tests

`tests/components/AdminInvitations/index.test.tsx` covers the list and the
empty state; sending, with Send disabled until there is an address, the
trimmed variables and the refresh; a refused address beside its field;
Revoke after its confirmation; and both controls locked with the pause's
reason. `tests/e2e/admin-invitations.spec.ts` invites, follows the mailed
link and revokes against the built server, with axe.
