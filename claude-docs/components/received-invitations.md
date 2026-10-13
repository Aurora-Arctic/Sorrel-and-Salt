# ReceivedInvitations

`src/components/ReceivedInvitations/` — the coven invitations addressed to the signed-in account, one
row each (M10.32, stories 2 and 6): coven, role, who sent it and what they wrote, expiry, with an
Accept and a Decline on each (M10.34) and the pager beneath. Its host is the account page's Invitations section
(`id="account-invitations"`, `src/app/(shell)/account/page.tsx`), always shown, with the table's
empty state when none wait. The `/coven` landing does not render it: it tells the account how many
wait and links to that section, and the account menu shows the same count
(`claude-docs/design-decisions/mb.57-post-sign-in-landing.md`,
`claude-docs/design-decisions/m10.32-accept-from-the-landing.md`).

## Props

`ReceivedInvitationsProps` (`types.ts`): `invitations` (`id`, `covenName`, `covenSlug`, `role`,
`inviterName`, `expiresAt`, `note`, in the order the service pages them), `previousHref` and
`nextHref`, and `position` for the pager's "Page X of Y". The page maps the service's
`ReceivedInvitation` straight onto an entry.

The page pages the list with `?after=` and `?before=`, read by `readPageCursors`, and builds the
pager links with the section's id on the end (`#account-invitations`), so moving to another page
of invitations keeps the reader at the section rather than the top of the account page.

## Contracts

- **No permission check lives here.** The page reads through `listReceivedInvitations`, which
  filters in SQL by the session's own verified address, workspace tier only. Nothing here decides
  whose row it is. The account page cannot be reached by an unverified account (`requireSession()`
  sends it to the email page), and the service reads nothing for one in any case.
- **No token or hash** is a prop, and none can be: the service never reads one for this list.
- **The answer column.** Its heading is "Answer", and the cell is `.received-invitations__answer`, a
  flex row holding Accept and Decline side by side, wrapping if the card is narrow. A refusal's
  `Notice` takes a line of its own above the buttons (`flex-basis: 100%`).
- **Accept** (`accept-control.tsx`) is the client island. It sends `acceptInvitationById` with the
  row's id, stays busy until the router has opened `/coven/<slug>`, and on a refusal says the
  service's words in a `Notice` beside the button and enables Accept again. Each button is named
  "Accept the invitation to <coven>", so the rows are told apart by name. After `router.push` it
  calls `router.refresh()`: a navigation keeps the shell's layout, so without the refresh the
  account menu's count would stay at its old figure.
- **Decline** (`decline-control.tsx`, M10.34) is the second client island, a `ConfirmedAction` as the
  owner's Revoke is. The button is "Decline", `btn btn--small btn--destructive`, named "Decline the
  invitation to <coven>". It opens a "Decline Invitation" dialog that names the coven and says the
  owner will see that the invitation was declined and its link will stop working; confirming sends
  `declineInvitationById` with the row's id. On success the page and the shell are read again
  (`router.refresh()`), so the row and the account menu's count go. On a refusal the service's words
  appear in a `Notice` beside the button, as Accept's do. Nothing is granted or seated: the person
  is not a member, and the invitation cannot be accepted afterwards by link or by id. Declining
  is final; to join, they ask the owner to invite them again.
- **The inviter** is shown as "from <name>" only when known; a deleted account shows nothing.
  **The sender's note** sits on its own line beneath (`received-invitations__note`, a block), where
  it used to run straight on from the name.
- **No region of its own.** It is a `div.received-invitations`, not a labelled `<section>`: the
  account page's Invitations section is the region, named by its heading, so a second landmark
  with the same name would only repeat it.
- **It lives in a `ListFrame`**, since the soft pager ends navigate through it, as
  `PendingInvitations` does.

## Styling

Tokens and the `.data-table` primitives, plus `index.scss` (M10.32). The account page's card is
narrow, so the table is always in its stacked form there. The primitives draw a stacked row as a
card of its own on the same colour as the panel, whose padding read as an inset with nothing to
explain it. Here, in a stacked table:

- **Rows run the card's full width**, with a `$hairline` between them and `space(5)` of room
  either side of it, so two invitations never read as one.
  The first row has no padding above it.
- **Three tracks per row.** The coven (with who sent it) and the answer buttons share the first
  line, Accept and Decline at the top right (the Answer column is `action: 'corner'`); Role and Expires sit side by side
  beneath, Role as wide as its word and Expires running on under the buttons, so a date keeps to one
  line at a phone's width. Each cell is placed by its column's class
  (`received-invitations__coven`, `__role`, `__expires`).

These are the owner's calls at M10.32; the section's design review settles the rest.

## Tests

`tests/components/ReceivedInvitations/index.test.tsx`; the account page's section is in
`tests/app/(shell)/account/page.test.tsx`, and the landing's notice in `tests/app/(shell)/coven/landing.test.tsx`.
