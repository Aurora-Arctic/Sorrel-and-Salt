# Invitation Acceptance

`src/components/InvitationAcceptance/` — the panel of `/invite/[token]`, the
one route an invitation's mailed link opens (MB.70 built it with the site
tier, M7.5 added the workspace's). Server component `src/app/invite/[token]/page.tsx` reads where the
visitor stands and hands down one of three states; this component shows it
and sends the accept. The rules it shows are
[`auth/admin-users.md`](../auth/admin-users.md), "Inviting an admin".

## The three states

- **`signed-out`** — no session. The page reads nothing of the invitation,
  so a stranger holding the link learns nothing of it, and offers **Sign In**,
  `signInPath` of the link itself, so the sign-in comes back here.
- **`refused`** — the accept service's own reason, in its words, from
  `invitationStanding`: a dead link, a different address, a pause, or an
  address not yet verified. Only the last carries `emailHref`, the email
  page with the link as its `next`, offered as **Confirm Your Email**. An account
  that already used the card carries `startCovenHref` (`/coven/new`), offered as
  **Start a Coven**. No message names a workspace.
- **`acceptable`** — what the invitation grants, by tier, and **Accept
  Invitation**. A site invitation names its role, `siteRole`, curator or
  admin (M11.20). The click sends `acceptInvitation`, which checks everything
  again and decides; the button stays busy, with a spinner, until
  `router.push` reaches `landing` (`/admin` for a site invitation,
  `/coven/[slug]` for a coven's, the slug coming from the standing; the
  sentence names the coven, `covenName`, which only this state carries: the
  standing reaches it after the address checks, so no refusal can say it). A
  refusal is said in the service's words by `useClickFeedback`'s callout
  ([`click-feedback.md`](click-feedback.md), M12.31): an alert floating under
  Accept, which keeps the focus and is described by "Last try failed: …"; a
  dismissed callout comes back from the badge beside it, and the next press
  clears it. Accept is `aria-disabled` while it sends, not `disabled`, so the
  browser does not take the focus off it, and `accept()` ignores a second
  press itself. A success says nothing of its own: the landing is the answer,
  so the hook's `announce` is not called.

The page uses `getSession()`, not `requireSession()`: an unverified account
would otherwise be redirected to the email page without being told why, and
the signed-out state is the page's to show.

## What a refused link says

Each reason has one sentence, from `MESSAGES` in
`src/modules/identity/services/invitation-acceptance.ts`, and no sentence names a coven. Two are
worth knowing:

- **A declined link** (M10.34) says "This invitation was declined. If you change your mind, ask
  whoever sent it for a new one." The invitee's answer outranks the owner's Remove that may follow.
- **A link into a deleted coven** (MB.119, decision f) has a reason of its own, `closed`: "The coven
  this invitation was for has been deleted, so it can't be accepted." It sits after the dead-link
  and address checks, so a link in two states reports the earlier (an accepted one still says
  accepted) and another address learns nothing of the coven.

## Styling

A `.panel` (MB.119, decision c), as sign-in's panel, the email page's and the create page's are:
the root is `panel invitation-acceptance`, and its `PageHeader` ([`page-header.md`](page-header.md)) holds the
`h1` and the grant sentence as its `lede`. A refusal has no grant, so its head is the heading
alone, its row's margin dropped so the panel's gap spaces it, and the alert says the rest. The page has no AppShell, the signed-in pages' shared frame, so
its `main` is the page frame, `.page-frame.page-frame--narrow`
([`styling.md`](../styling.md), "The page frame"): it centres the panel,
holds it clear of the top inset and caps it at the forms' column,
`$narrow-column` (28rem), so the panel sets no width of its own.
`.invitation-acceptance` only stacks the header, the alert and the button a
`space(3)` apart. A refused link's reason is a `Notice`
([`notice.md`](notice.md)) as an error, so it is an alert the server renders;
a failed accept is the click-feedback callout instead, read by
`readGraphqlFailure` (`src/lib/graphql-failure.ts`), whose `GENERIC_FAILURE`
is the sentence when the server sent none. Accept's wrapper is a `div`, not
the other states' `p`, because the callout is a `div`. The
buttons and the spinner are the primitives', Accept drawn through
`BusyButton` ([`busy-button.md`](busy-button.md)). Tokens used: `space()`.

## Stories

[`index.stories.tsx`](../../src/components/InvitationAcceptance/index.stories.tsx) —
`Pages / Invitation Acceptance`, each inside the page's own
`main.page-frame.page-frame--narrow`, so the workshop shows what the page shows. The `States` dropdown opens with Signed Out, the sign-in prompt a visitor with no session gets for any link, valid or not (the page reads nothing of the invitation until someone is signed in). Render-only, bar
the failed accept.

- **The states:** `SignedOut` is its own story; `States`, with a control that chooses Default, Acceptable Curator, Acceptable Coven, Unverified, and one for each other
  refusal: Invalid, Accepted, Revoked, Expired, Declined, Deleted Coven,
  Different Address and Paused. The refusal sentences are copied from the service's `MESSAGES`,
  as a story cannot import a server-only module.
- **A failed accept:** `AcceptRefused` presses Accept on mount
  (`usePressOnMount`); the workshop has no API, so the request fails and the callout says
  `GENERIC_FAILURE` under the button.

## Tests

`tests/components/InvitationAcceptance/index.test.tsx` renders each state,
sends the accept against MSW with the token as its variable and checks the
landing, names the role a site invitation grants, and checks a failed accept: the callout says the
service's sentence, the focus stays on Accept with its "Last try failed" description, the badge
brings a dismissed callout back, a second press is not sent while busy, and the next press clears
the callout and lands. `tests/e2e/stories/01-invitations.spec.ts` walks the page for stories 4–7;
story 7's test presses Accept on a page left open after its link expired, and checks in the
browser that the callout appears, the focus stays on Accept, Escape closes it, the badge reopens
it, axe passes and the page does not scroll sideways at 375px.
`tests/e2e/workspace-invitation.spec.ts` walks a coven's invitation (M7.7):
the owner invites by mail, the invited account accepts and lands in the
coven, and a used link and a revoked one are each refused with a different
message, neither naming the coven.
