# PendingInvitations

`src/components/PendingInvitations/` — a coven's pending invitations, one row each (M7.6, story 5):
address, role and expiry, with a Revoke on each and the pager beneath. The Invitations tab of the
coven's People page renders it (`claude-docs/auth/coven-guard.md`, "The invitations page").

## Props

`PendingInvitationsProps` (`types.ts`): `workspaceId`, `invitations` (`id`, `email`, `role`,
`expiresAt`, newest first as the page read them), `previousHref` and `nextHref`, and `position`
for the pager's "Page X of Y".

## Contracts

- **No permission check lives here.** The page decides who sees it and reads through services that
  check `member: invite` (CLAUDE.md rule 1).
- **Revoke** (`revoke-control.tsx`) is a `ConfirmedAction`, as admin's invitation Revoke and the
  roll's Remove are: it names the address, sends `revokeInvitation` with the coven and the id, and
  refreshes the page; a refusal is said beside the control. It is `btn btn--small btn--destructive`.
- **It lives in a `ListFrame`**, since the soft pager ends navigate through it.
- **No token or hash** is a prop: the page passes only the four fields.

## Styling

Tokens and the `.data-table` primitives only; the section's design review settles the rest.

## Tests

`tests/components/PendingInvitations/index.test.tsx`.
