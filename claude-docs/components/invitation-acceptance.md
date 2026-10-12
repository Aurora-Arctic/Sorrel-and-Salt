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

Layout only. The page has no AppShell, the signed-in pages' shared frame, so
its `main` is the page frame, `.page-frame.page-frame--narrow`
([`styling.md`](../styling.md), "The page frame"): it centres the panel,
holds it clear of the top inset and caps it at the forms' column,
`$narrow-column` (28rem), so the panel sets no width of its own.
`.invitation-acceptance` only stacks its heading, sentences and button a
`space(3)` apart. Both notices, the refusal and a failed accept, are
`Notice` ([`notice.md`](notice.md)) as errors, so each is an alert; a
failed accept is read by `readGraphqlFailure` (`src/lib/graphql-failure.ts`),
whose `GENERIC_FAILURE` is the sentence when the server sent none. The
buttons and the spinner are the primitives', Accept drawn through
`BusyButton` ([`busy-button.md`](busy-button.md)). Tokens used: `space()`.

## Stories

[`index.stories.tsx`](../../src/components/InvitationAcceptance/index.stories.tsx) —
`SignedOut`, `Acceptable`, `Unverified` and `Expired`, each inside the
page's own `main.page-frame.page-frame--narrow`, so the workshop shows what
the page shows. Render-only.

## Tests

`tests/components/InvitationAcceptance/index.test.tsx` renders each state,
sends the accept against MSW with the token as its variable and checks the
landing, and shows a refusal. `tests/e2e/invite.spec.ts` follows a mailed
link signed out and signed in against the built server, with axe.
