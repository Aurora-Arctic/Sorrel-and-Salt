# Invitation Acceptance

`src/components/InvitationAcceptance/` is the panel of `/invite/[token]`, the route an invitation's mailed link opens, for both the site tier and the workspace's. The server component `src/app/invite/[token]/page.tsx` reads where the visitor stands and hands down one of the states in `types.ts`; this component shows it and sends the accept. The rules are in [`auth/admin-users.md`](../auth/admin-users.md), "Inviting a keeper".

## Contracts

- **`signed-out`**: the page reads nothing of the invitation, so a stranger holding the link learns nothing of it. It offers **Sign In**, `signInPath` of the link itself.
- **`refused`**: the accept service's own reason, from `invitationStanding`: a dead link, a different address, a pause, or an unverified address. Only the last carries `emailHref` (the email page with the link as its `next`, **Confirm Your Email**). An account that already used a card carries `startCovenHref` (`/coven/new`, **Start a Coven**). No message names a workspace.
- **`acceptable`**: what the invitation grants, by tier, and **Accept Invitation**. A site invitation names its `siteRole`. The sentence names the coven (`covenName`) only in this state: the standing reaches it after the address checks, so no refusal can say it.
- **The click sends `acceptInvitation`**, which checks everything again and decides. The button stays busy until `router.push` reaches `landing`: `/keepers` for a keeper's site invitation, `/curator` for a curator's, `/coven/[slug]` for a coven's. Accept is `aria-disabled` while it sends, not `disabled`, so the browser keeps the focus on it, and `accept()` ignores a second press itself. A success says nothing, since the landing is the answer, so `announce` is not called.
- **A refusal on accept is `useClickFeedback`'s callout** ([`click-feedback.md`](click-feedback.md)): an alert floating under Accept, described by "Last try failed: …". `readGraphqlFailure` (`src/lib/graphql-failure.ts`) reads the failure; `GENERIC_FAILURE` is the sentence when the server sent none.
- **The page uses `getSession()`, not `requireSession()`:** an unverified account would be redirected to the email page without being told why, and the signed-out state is the page's to show.
- **A refused link has one sentence per reason**, from `MESSAGES` in `src/modules/identity/services/invitation-acceptance.ts`, none naming a coven. Two are worth knowing:
  - A declined link says to ask whoever sent it for a new one. The invitee's answer outranks a steward's Remove that may follow.
  - A link into a deleted coven has its own reason, `closed`. It sits after the dead-link and address checks, so a link in two states reports the earlier and another address learns nothing of the coven.

## Styling

A `.panel`; its `PageHeader` ([`page-header.md`](page-header.md)) holds the `h1` and the grant sentence as its `lede`. A refusal's lede says only that the invitation cannot be used, and the alert beneath says why; a Back to Home link follows it, so the page is never a dead end. The head is centred, as the other card pages' are (`.card-page-header`, with the heading at `.auth-title` size). The page has no AppShell, so its `main` is `.page-frame.page-frame--narrow` ([`styling.md`](../styling.md), "The page frame"), which sets the panel's width. A refusal's reason is an error `Notice` ([`notice.md`](notice.md)). Accept's wrapper is a `div`, not a `p`, because the callout is a `div`. Accept is a `BusyButton` ([`busy-button.md`](busy-button.md)).

## Stories and tests

`src/components/InvitationAcceptance/index.stories.tsx` (`Pages / Invitation Acceptance`: `SignedOut`, `States`, and `AcceptRefused`, which presses Accept on mount so the workshop's missing API fails the request). Its refusal sentences are copied from `MESSAGES`, as a story cannot import a server-only module. Tests: `tests/components/InvitationAcceptance/index.test.tsx`, `tests/e2e/stories/01-invitations.spec.ts` (stories 4 to 7) and `tests/e2e/workspace-invitation.spec.ts` (a used link and a revoked one each refused with a different message, neither naming the coven).
