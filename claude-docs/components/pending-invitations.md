# PendingInvitations

`src/components/PendingInvitations/` — a coven's open invitations, one row each:
address, role and status, newest first, with a Revoke or a Remove on each and the pager beneath. Open means
pending, or declined by the invitee and not yet removed by a steward. The Invitations tab of the
coven's Members page renders it (`claude-docs/auth/coven-guard.md`, "The invitations page").

## Contracts

- **No permission check lives here.** The page decides who sees it and reads through services that
  check `member: invite` (CLAUDE.md rule 1). No token or hash is a prop: the page passes only the five fields.
- **Status** says "Expires <time>" for a pending invitation and "Declined <time>" for one the invitee
  declined, the badge in the `attention` palette's red so a declined row stands out among the expiry
  dates. A declined row stays listed past its expiry, since an answer is something to read and not a
  link that lapses, until a steward removes it.
- **Revoke** (`revoke-control.tsx`) is a `ConfirmedAction`, as admin's invitation Revoke and the
  roll's Remove are: it names the address, sends `revokeInvitation` with the coven and the id, and
  refreshes the page. A refusal is said in a callout under the control, which keeps the focus
  ([`click-feedback.md`](click-feedback.md)). It is plain as a row's control is; the red is the confirm's own.
- **Remove** (`remove-control.tsx`) on a declined row sends the same `revokeInvitation` mutation. Nothing
  is withdrawn, because the invitee already said no; the stamp only clears the row, which stays in
  the table for the audit. The coven's revoke accepts a declined row, expired or not. The declined
  link keeps saying it was declined, not withdrawn.
- **It lives in a `ListFrame`**, since the soft pager ends navigate through it.
- **No region of its own.** The table is named "Pending Invitations" and nothing wraps it in a
  `<section>` repeating that name, so a screen reader hears it once. The e2e spec finds the table by that name.

The Revoke and Remove questions are `ConfirmedAction`'s ([`user-list.md`](user-list.md)).
