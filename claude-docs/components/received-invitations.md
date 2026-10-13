# ReceivedInvitations

`src/components/ReceivedInvitations/` — the coven invitations addressed to the signed-in account, one
row each (M10.32, stories 2 and 6): coven, role, who sent it and what they wrote, expiry, with an
Accept on each and the pager beneath. Its host is the account page's Invitations section
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
- **Accept** (`accept-control.tsx`) is the client island. It sends `acceptInvitationById` with the
  row's id, stays busy until the router has opened `/coven/<slug>`, and on a refusal says the
  service's words in a `Notice` beside the button and enables Accept again. Each button is named
  "Accept the invitation to <coven>", so the rows are told apart by name. After `router.push` it
  calls `router.refresh()`: a navigation keeps the shell's layout, so without the refresh the
  account menu's count would stay at its old figure.
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
- **Three tracks per row.** The coven (with who sent it) and Accept share the first line, Accept
  at the top right (the Accept column is `action: 'corner'`); Role and Expires sit side by side
  beneath, Role as wide as its word and Expires running on under Accept, so a date keeps to one
  line at a phone's width. Each cell is placed by its column's class
  (`received-invitations__coven`, `__role`, `__expires`).

These are the owner's calls at M10.32; the section's design review settles the rest.

## Tests

`tests/components/ReceivedInvitations/index.test.tsx`; the account page's section is in
`tests/app/(shell)/account/page.test.tsx`, and the landing's notice in `tests/app/(shell)/coven/landing.test.tsx`.
