# ReceivedInvitations

`src/components/ReceivedInvitations/` — the coven invitations addressed to the signed-in account, one
row each (M10.32, stories 2 and 6): coven, role, who sent it and what they wrote, expiry, with an
Accept on each and the pager beneath. The `/coven` landing renders it for someone who is in no coven
yet, above the Create Coven link or the invite-only note (`claude-docs/design-decisions/mb.57-post-sign-in-landing.md`).

## Props

`ReceivedInvitationsProps` (`types.ts`): `invitations` (`id`, `covenName`, `covenSlug`, `role`,
`inviterName`, `expiresAt`, `note`, in the order the service pages them), `previousHref` and
`nextHref`, and `position` for the pager's "Page X of Y". The page maps the service's
`ReceivedInvitation` straight onto an entry.

## Contracts

- **No permission check lives here.** The page reads through `listReceivedInvitations`, which
  filters in SQL by the session's own verified address, workspace tier only. Nothing here decides
  whose row it is.
- **No token or hash** is a prop, and none can be: the service never reads one for this list.
- **Accept** (`accept-control.tsx`) is the client island. It sends `acceptInvitationById` with the
  row's id, stays busy until the router has opened `/coven/<slug>`, and on a refusal says the
  service's words in a `Notice` beside the button and enables Accept again. Each button is named
  "Accept the invitation to <coven>", so the rows are told apart by name.
- **The inviter** is shown as "from <name>" only when known; a deleted account shows nothing.
- **It lives in a `ListFrame`**, since the soft pager ends navigate through it, as
  `PendingInvitations` does.

## Styling

Tokens and the `.data-table` primitives only; the section's design review settles the rest.

## Tests

`tests/components/ReceivedInvitations/index.test.tsx`; the landing's states are
`tests/app/(shell)/coven/landing.test.tsx`.
