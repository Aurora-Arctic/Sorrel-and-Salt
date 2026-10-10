# Invitation Acceptance

`src/components/InvitationAcceptance/` — the panel of `/invite/[token]`, the
one route an invitation's mailed link opens (MB.70; M7.5 adds the workspace
tier). Server component `src/app/invite/[token]/page.tsx` reads where the
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
  Invitation**. The click sends `acceptInvitation`, which checks everything
  again and decides; the button stays busy, with a spinner, until
  `router.push` reaches `landing` (`/admin` for an admin invitation). A
  refusal is said in an alert in the service's words, and Accept is offered
  again.

The page uses `getSession()`, not `requireSession()`: an unverified account
would otherwise be redirected to the email page without being told why, and
the signed-out state is the page's to show.

## Styling

Layout only: `.invitation-page` centres the panel without an AppShell, as
`.email-page` does, and `.invitation-acceptance` stacks it. The notice, the
buttons and the spinner are the primitives'. Tokens used: `space()` and
`$top-inset`.

## Tests

`tests/components/InvitationAcceptance/index.test.tsx` renders each state,
sends the accept against MSW with the token as its variable and checks the
landing, and shows a refusal. `tests/e2e/invite.spec.ts` follows a mailed
link signed out and signed in against the built server, with axe.
