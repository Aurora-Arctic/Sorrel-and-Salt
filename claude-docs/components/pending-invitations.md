# PendingInvitations

`src/components/PendingInvitations/` — a coven's open invitations, one row each (M7.6, story 5):
address, role and status, with a Revoke or a Remove on each and the pager beneath. Open (M10.34) is
pending, or declined by the invitee and not yet removed by the owner. The Invitations tab of the
coven's People page renders it (`claude-docs/auth/coven-guard.md`, "The invitations page").

## Props

`PendingInvitationsProps` (`types.ts`): `workspaceId`, `invitations` (`id`, `email`, `role`,
`expiresAt`, `declinedAt` (`null` while pending), newest first as the page read them), `previousHref` and `nextHref`, and `position`
for the pager's "Page X of Y".

## Contracts

- **No permission check lives here.** The page decides who sees it and reads through services that
  check `member: invite` (CLAUDE.md rule 1).
- **The Status column** (M10.34) says "Expires <time>" for a pending invitation and "Declined
  <time>" for one the invitee declined. "Declined" is a badge in the `attention` palette's red,
  the account menu's count's, so a declined row stands out among the expiry dates (the owner's
  call). It replaced the Expires column. A declined row stays listed past its expiry, since an
  answer is something to read and not a link that lapses, until the owner removes it.
- **The Action column** (heading "Action", it was "Revoke") offers Revoke on a pending row and
  Remove on a declined one.
- **Revoke** (`revoke-control.tsx`) is a `ConfirmedAction`, as admin's invitation Revoke and the
  roll's Remove are: it names the address, sends `revokeInvitation` with the coven and the id, and
  refreshes the page; a refusal is said beside the control. It is `btn btn--small btn--destructive`.
- **Remove** (`remove-control.tsx`, M10.34) is a `ConfirmedAction` too, titled "Remove Invitation":
  it asks to remove the declined invitation to the address from the list, then sends the same
  `revokeInvitation` mutation with the coven and the id, and refreshes the page, so the row leaves
  the list. Nothing is withdrawn, because the invitee already said no; the stamp only clears the
  row, which stays in the table for the audit. The coven's revoke accepts a declined row, expired
  or not. The declined link keeps saying it was declined, not withdrawn.
- **It lives in a `ListFrame`**, since the soft pager ends navigate through it.
- **No token or hash** is a prop: the page passes only the five fields.

## Styling

Tokens and the `.data-table` primitives only; the section's design review settles the rest.

## Tests

`tests/components/PendingInvitations/index.test.tsx`.
