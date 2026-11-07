# PendingInvitations

`src/components/PendingInvitations/` — a coven's open invitations, one row each:
address, role and status, newest first, with a Revoke or a Remove on each and the pager beneath. Open means
pending, or declined by the invitee and not yet removed by a steward. The Invitations tab of the
coven's Members page renders it (`claude-docs/auth/coven-guard.md`, "The invitations page").

## Props

`PendingInvitationsProps` (`types.ts`). `declinedAt` is `null` while an invitation is pending; the invitations are newest first as the page read them.

## Contracts

- **No permission check lives here.** The page decides who sees it and reads through services that
  check `member: invite` (CLAUDE.md rule 1).
- **The Status column** says "Expires <time>" for a pending invitation and "Declined
  <time>" for one the invitee declined. "Declined" is a badge in the `attention` palette's red,
 the account menu's count's, so a declined row stands out among the expiry dates. A declined row stays listed past its expiry, since an
  answer is something to read and not a link that lapses, until a steward removes it.
- **The Action column** (heading "Action") offers Revoke on a pending row and
  Remove on a declined one.
- **Revoke** (`revoke-control.tsx`) is a `ConfirmedAction`, as admin's invitation Revoke and the
  roll's Remove are: it names the address, sends `revokeInvitation` with the coven and the id, and
  refreshes the page, and the status region says "The invitation to <address> is revoked.". A
  refusal is said in a callout under the control, which keeps the focus
  ([`click-feedback.md`](click-feedback.md)). It is `btn btn--quiet btn--small`, plain as a row's control is; the red is the confirm's own.
- **Remove** (`remove-control.tsx`) is a `ConfirmedAction` too, titled "Remove Invitation":
  it asks to remove the declined invitation to the address from the list, then sends the same
  `revokeInvitation` mutation with the coven and the id, and refreshes the page, so the row leaves
  the list. Nothing is withdrawn, because the invitee already said no; the stamp only clears the
  row, which stays in the table for the audit. The coven's revoke accepts a declined row, expired
  or not. The declined link keeps saying it was declined, not withdrawn. Once removed, the
  status region says "The declined invitation to <address> is removed."; a refusal is said under
  Remove as Revoke's is.
- **It lives in a `ListFrame`**, since the soft pager ends navigate through it.
- **No region of its own.** The table is named "Pending Invitations" and nothing wraps it in a
  `<section>` repeating that name, so a screen reader hears it once; the page's heading and open
  tab already say what the page is. The e2e spec finds the table by that name.
- **No token or hash** is a prop: the page passes only the five fields.

## Styling

Tokens and the `.data-table` primitives only. `index.scss` holds one rule, the "Declined" badge in
a declined row's Status (`@include badge('attention')`, with a `space(2)` gap before the date). It
styles a span inside the table, so it does not depend on any wrapper.

## Stories and tests

`src/components/PendingInvitations/index.stories.tsx` ("Coven / Invitations Sent"; the Revoke and Remove questions are `ConfirmedAction`'s, [`user-list.md`](user-list.md)) and `tests/components/PendingInvitations/index.test.tsx`.
