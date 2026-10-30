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
  flex row holding Accept and Decline side by side, wrapping if the card is narrow. A refusal
  floats under its button, out of the flow, so the row holds nothing else.
- **Accept** (`accept-control.tsx`) is the client island. It sends `acceptInvitationById` with the
  row's id, stays busy until the router has opened `/coven/<slug>`, and on a refusal says the
  service's words and is usable again. While it sends it is `aria-disabled`, not `disabled`, so
  the focus stays on it and a second press sends nothing. A refusal is said in a callout under
  Accept, which keeps the focus, with a badge on it to bring the callout back
  ([`click-feedback.md`](click-feedback.md), M12.31). A success announces nothing, since it
  opens the coven. Each button is named
  "Accept the invitation to <coven>", so the rows are told apart by name. After `router.push` it
  calls `router.refresh()`: a navigation keeps the shell's layout, so without the refresh the
  account menu's count would stay at its old figure.
- **Decline** (`decline-control.tsx`, M10.34) is the second client island, a `ConfirmedAction` as the
  owner's Revoke is. The button is "Decline", `btn btn--destructive btn--small`, named "Decline the
  invitation to <coven>". It opens a "Decline Invitation" dialog that names the coven and says the
  owner will see that the invitation was declined and its link will stop working; confirming sends
  `declineInvitationById` with the row's id. On success the page and the shell are read again
  (`router.refresh()`), so the row and the account menu's count go, and the status region says "The
  invitation to <coven> is declined.". On a refusal the service's words appear in a callout under
  Decline, which has the focus back, as `ConfirmedAction`'s refusals do. Nothing is granted or seated: the person
  is not a member, and the invitation cannot be accepted afterwards by link or by id. Declining
  is final; to join, they ask the owner to invite them again.
- **The inviter** is shown as "from <name>" only when known; a deleted account shows nothing.
  **The sender's note** sits on its own line beneath (`received-invitations__note`, a block), where
  it used to run straight on from the name.
- **No region of its own.** It is a `div.received-invitations`, not a labelled `<section>`: the
  account page's Invitations section is the region, named by its heading, so a second landmark
  with the same name would only repeat it. The table keeps its own name, "Your Invitations", rather
  than taking the heading's through `aria-labelledby`: the heading already names the region, the
  lede sits between the two, and the same words twice in a row is what the review set out to stop.
- **The empty line is live.** The account page draws the section whether or not anything waits, so
  "There are no invitations yet." shows when the list is empty (MB.119 checked this).
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

These are the owner's calls at M10.32. MB.119 reviewed the rest and added nothing. A
refusal's callout is `ClickFeedback`'s, styled there.

## Stories

`Account / Invitations Received` (`index.stories.tsx`), each inside the account page's section as the
page draws it (a panel in the narrow frame, under its head), since the
stacked rows depend on the panel's width: `States`, with a control that chooses Default (several invitations), One Invitation,
Empty (the empty line), and Last Page (the pager). At 375px, from the toolbar viewport menu, the rows stack.

## Tests

`tests/components/ReceivedInvitations/index.test.tsx` (a refused Accept or Decline is said under its button,
which keeps the focus, with the badge bringing it back; Accept sends once while in flight and
announces nothing; a Decline is said in the status region); the account page's section is in
`tests/app/(shell)/account/page.test.tsx` and the landing's notice in `tests/app/(shell)/coven/landing.test.tsx`.
