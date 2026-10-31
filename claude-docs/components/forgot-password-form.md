# ForgotPasswordForm

`src/components/ForgotPasswordForm/` is the form on `/forgot-password`: one
Email Address field and a "Send Reset Link" button. It asks Better Auth's
`requestPasswordReset` (through `src/lib/auth-client.ts`) to mail a reset link
to the address, with `/reset-password` as where the link lands. The wiring
behind it is [`auth/passwords.md`](../auth/passwords.md), "Reset and change".
It takes no props.

## Contracts

- **Every address gets the same answer.** Better Auth answers a known and an
  unknown address alike, and the form words every accepted request as one
  notice naming the address typed: if it has an account, a link to choose a
  new password has been sent, and the link works once, within 15 minutes. The
  page never says whether an address has an account (DESIGN.md §8). The notice
  says "if it has an account" rather than "if it has a password", because
  Better Auth mails an account with providers alone too, and following the
  link gives that account its first password.
- **The submit is disabled until the field has something in it**, and is a
  `BusyButton` ("Sending Link") while the request is out
  ([`busy-button.md`](busy-button.md)). The address goes trimmed. An
  accepted request replaces the form with the sent notice, which takes focus,
  and two buttons: Send Again asks again for the same address, and Use a
  Different Address brings back an empty form with the cursor in it.
- **Refusals.** A 429 is the sign-in form's `TOO_MANY_ATTEMPTS`; anything else,
  a network failure included, is `GENERIC_RESET_REQUEST_ERROR`. Both are the
  shared `Notice` ([`notice.md`](notice.md)) in an alert region.

## Styling

`.forgot-password-form` is a column with the standard gap; its width and
ground are the page's `.page-frame--narrow` and `.panel`, as the sign-in page's
are. Nothing past the tokens.

## Stories

[`index.stories.tsx`](../../src/components/ForgotPasswordForm/index.stories.tsx),
titled "Sign In / Forgot Password Form": `States`, Default, inside the page's
own frame, panel and heading. Nothing is mocked: a submit in the workshop
fails into the alert region.

## Testing

`tests/components/ForgotPasswordForm/index.test.tsx`: the disabled and busy
submit, the call Better Auth gets, the same notice for every accepted request,
the 429 and the generic refusal. Story 71 walks it in the browser
(`tests/e2e/stories/16-password.spec.ts`).
