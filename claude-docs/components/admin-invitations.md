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
  click. Each brings its own rules (`UserList/controls.scss`), so the section
  stands on its own in the workshop without the list's stylesheet (MB.115).
- **Invite Admin** (`invite-form.tsx`) opens a modal with the **Email Address**,
  required and marked with the shared red asterisk, and an optional
  **Reason**, its hint a line beneath the label, spaced as the user list's
  confirmation spaces its own; both are the shared field shell around their
  input ([`field.md`](field.md)). **Send Invitation** stays disabled until
  there is an address, and is a `BusyButton` ([`busy-button.md`](busy-button.md)),
  a spinner and "Sending" while the request is out; Cancel is quiet. A `VALIDATION` refusal on `email`
  is said beside the field; anything else in an alert in the modal. A sent
  invitation closes the modal, says "Invitation sent to …" beside the button,
  and refreshes the page, whose re-read lists it. No link is ever shown: the
  mutation answers none.
- **Four columns**: Email, Reason, Expires and Revoke, the headings and each
  cell's `data-label` from one `COLUMNS` list, the table's roles written out
  so it can stack into cards at phone width.
- **The expiry** is `inUtc` (`src/lib/utc.ts`), in a `<time>`: a date and a
  time, since a link lasts seven days to the minute.

## Styling

The table is the `.data-table` primitive with the `--stack` modifier in its
`.data-table-frame` ([`styling.md`](../styling.md), "Tables at phone
width"). At desktop width no cell wraps and the table scrolls in its frame, as
the user list's does (the owner's call during MB.59). Under
`$table-stack-width` of its frame each invitation is a card, its cells
wrapping, each led by its column's name, and Revoke across the card's foot
with no label. Its own stylesheet holds the section's column and its
`space(7)` of room above, the heading row with Invite Admin at its end, the
muted "None given", the Reason field's wrapper (`.admin-invitations__note`,
a step of room above and `space(6)` below) and the sent confirmation's
margin, `.notice.admin-invitations__sent` compounded with its primitive,
which the app scopes as `body .notice`. The look past the tokens waits for
the section's sign-off (MB.115).

The sent confirmation and the modal's refusal are `Notice`s
([`notice.md`](notice.md)), the confirmation taking
`admin-invitations__sent` as its `className`. A refused send is read by
`readGraphqlFailure` with `email` as the one field the form draws an error
under, so the address's error goes beside it and any other refusal into the
alert (MB.116).

## Stories

[`index.stories.tsx`](../../src/components/AdminInvitations/index.stories.tsx),
`Admin / Admin Invitations`, inside the admin layout's frame: `Pending`,
`NoneWaiting` and `Paused` (both controls locked with the pause's reason),
and `PhoneDark`/`PhoneLight`, the invitations as cards at 375px. The
proposal for MB.115's sign-off on the invite form's Reason (1d.12) is
`ProposalInviteReasonTipA` (the hint in a tip, the label "Reason
(Optional)") and `ProposalInviteReasonVisibleB` (today's line), each with
`PhoneDark` and `PhoneLight`, story-only markup deleted with the loser.
Invite and Revoke reach the network only when sent, so a send in the workshop
fails into its alert. Render-only, no test ids, no snapshots.

## Tests

`tests/components/AdminInvitations/index.test.tsx` covers the list and the
empty state; sending, with Send disabled until there is an address, the
trimmed variables and the refresh; a refused address beside its field;
Revoke after its confirmation; and both controls locked with the pause's
reason. The cards at phone width are presentation.
`tests/e2e/admin-invitations.spec.ts` invites, follows the mailed link and
revokes against the built server, with axe.
