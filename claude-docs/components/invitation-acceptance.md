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
  page with the link as its `next`, offered as **Confirm Your Email**. No
  message names a workspace.
- **`acceptable`** — what the invitation grants, by tier, and **Accept
  Invitation**. A site invitation names its role, `siteRole`, curator or
  admin (M11.20). The click sends `acceptInvitation`, which checks everything
  again and decides; the button stays busy, with a spinner, until
  `router.push` reaches `landing` (`/admin` for a site invitation,
  `/coven/[slug]` for a coven's, the slug coming from the standing; the
  sentence names the coven, `covenName`, which only this state carries: the
  standing reaches it after the address checks, so no refusal can say it). A
  refusal is said in an alert in the service's words, and Accept is offered
  again.

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
the root is `panel invitation-acceptance`, and its `.header` (the layout primitive's) holds the
`h1` and the grant sentence as a `.lede`. A refusal has no grant, so its header is the heading
alone and the alert says the rest. The page has no AppShell, the signed-in pages' shared frame, so
its `main` is the page frame, `.page-frame.page-frame--narrow`
([`styling.md`](../styling.md), "The page frame"): it centres the panel,
holds it clear of the top inset and caps it at the forms' column,
`$narrow-column` (28rem), so the panel sets no width of its own.
`.invitation-acceptance` only stacks the header, the alert and the button a
`space(3)` apart. Both notices, the refusal and a failed accept, are
`Notice` ([`notice.md`](notice.md)) as errors, so each is an alert; a
failed accept is read by `readGraphqlFailure` (`src/lib/graphql-failure.ts`),
whose `GENERIC_FAILURE` is the sentence when the server sent none. The
buttons and the spinner are the primitives', Accept drawn through
`BusyButton` ([`busy-button.md`](busy-button.md)). Tokens used: `space()`.

## Stories

[`index.stories.tsx`](../../src/components/InvitationAcceptance/index.stories.tsx) —
`Pages / Invitation Acceptance`, each inside the page's own
`main.page-frame.page-frame--narrow`, so the workshop shows what the page shows. Render-only.

- **The states:** `SignedOut`, `Acceptable`, `AcceptableCurator`, `AcceptableCoven`, `Unverified`, and one for each other
  refusal: `Invalid`, `Accepted`, `Revoked`, `Expired`, `Declined`, `DeletedCoven`,
  `DifferentAddress` and `Paused`. The refusal sentences are copied from the service's `MESSAGES`,
  as a story cannot import a server-only module.
- **Phone and both themes:** `SignedOut`, `AcceptableCoven`, `Unverified` and `DeletedCoven` each
  have `PhoneDark` and `PhoneLight` (375px), covering a sentence and a button, an alert and a
  button, and an alert alone.

## Tests

`tests/components/InvitationAcceptance/index.test.tsx` renders each state,
sends the accept against MSW with the token as its variable and checks the
landing, names the role a site invitation grants, and shows a refusal. `tests/e2e/invite.spec.ts` follows a mailed
link signed out and signed in against the built server, with axe.
`tests/e2e/workspace-invitation.spec.ts` walks a coven's invitation (M7.7):
the owner invites by mail, the invited account accepts and lands in the
coven, and a used link and a revoked one are each refused with a different
message, neither naming the coven.
