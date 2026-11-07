# ReceivedInvitations

`src/components/ReceivedInvitations/` lists the coven invitations addressed to the signed-in account, one row each, with an Accept and a Decline on each and the pager beneath. Its host is the account page's Invitations section (`id="account-invitations"`, `src/app/(shell)/account/page.tsx`), always shown, with the table's empty state when none wait. The `/coven` landing does not render it: it tells the account how many wait and links to that section, and the account menu shows the same count ([`mb.57-post-sign-in-landing.md`](../design-decisions/mb.57-post-sign-in-landing.md), [`m10.32-accept-from-the-landing.md`](../design-decisions/m10.32-accept-from-the-landing.md)). The props and `ReceivedInvitationEntry` are in `types.ts`; the page maps the service's `ReceivedInvitation` straight onto an entry.

## Contracts

- **The page pages the list** with `?after=` and `?before=`, read by `readPageCursors`, and ends the pager links with `#account-invitations`, so another page keeps the reader at the section.
- **No permission check lives here.** The page reads through `listReceivedInvitations`, which filters in SQL by the session's own verified address, workspace tier only. An unverified account cannot reach the account page (`requireSession()` sends it to the email page), and the service reads nothing for one in any case.
- **No token or hash** is a prop, and none can be: the service never reads one for this list.
- **Accept** (`accept-control.tsx`) sends `acceptInvitationById` with the row's id and stays busy until the router has opened `/coven/<slug>`. While it sends it is `aria-disabled`, not `disabled`, so the focus stays for the refusal's callout and a second press sends nothing. A refusal is said in the service's words in a callout under Accept ([`click-feedback.md`](click-feedback.md)); a success announces nothing, since it opens the coven. After navigating it refreshes the router: a navigation keeps the shell's layout, so without it the account menu's count would stay at its old figure. Each button is named "Accept the invitation to <coven>", so rows are told apart by name.
- **Decline** (`decline-control.tsx`) is a `ConfirmedAction`, as the steward's Revoke is, named "Decline the invitation to <coven>". Confirming sends `declineInvitationById`; on success the router refresh drops the row and the menu's count, and the status region says "The invitation to <coven> is declined.". A refusal shows in a callout under Decline. Declining is final: the invitation cannot be accepted afterwards by link or by id, and to join the person asks the steward to invite them again.
- **The inviter** shows as "from <name>" only when known; a deleted account shows nothing.
- **No region of its own.** It is a `div.received-invitations`, not a labelled `<section>`: the account page's Invitations section is the region, so a second landmark with the same name would only repeat it. The table is named "Your Invitations" rather than by `aria-labelledby` to the heading, because the lede sits between the two and the same words twice in a row is what this avoids.
- **It lives in a `ListFrame`**, since the soft pager ends navigate through it, as `PendingInvitations` does.

## Styling

The account page's card is narrow, so the table is always stacked there. The `.data-table` primitives draw a stacked row as a card of its own, whose padding read as an inset with nothing to explain it, so here rows run the card's full width with a `$hairline` between them and `space(5)` either side, and the first row has no padding above it. The coven and the answer buttons share the first line (the Answer column is `action: 'corner'`); Role and Expires sit side by side beneath, so a date keeps to one line at a phone's width. A refusal's callout floats under its button, out of the flow, and is `ClickFeedback`'s.

## Not here

Stories: `Account / Invitations Received` (`index.stories.tsx`, inside the account page's section as the page draws it, since the stacked rows depend on the panel's width). Tests: `tests/components/ReceivedInvitations/index.test.tsx`, `tests/app/(shell)/account/page.test.tsx` and `tests/app/(shell)/coven/landing.test.tsx`.
