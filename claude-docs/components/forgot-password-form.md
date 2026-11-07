# ForgotPasswordForm

`src/components/ForgotPasswordForm/` is the form on `/forgot-password`. It asks
Better Auth's `requestPasswordReset` (through `src/lib/auth-client.ts`) to mail a
reset link to the address, with `/reset-password` as where the link lands. The
wiring behind it is [`auth/passwords.md`](../auth/passwords.md), "Reset and change".

## Contracts

- **Every address gets the same answer.** Better Auth answers a known and an
  unknown address alike, and the form words every accepted request as one
  notice naming the address typed: if it has an account, a link to choose a
  new password has been sent, and the link works once, within 15 minutes. The
  page never says whether an address has an account (DESIGN.md §8). The notice
  says "if it has an account" rather than "if it has a password", because
  Better Auth mails an account with providers alone too, and following the
  link gives that account its first password.
- **Submit** is disabled until the field has something in it. The address goes
  trimmed. An accepted request replaces the form with the sent notice, which takes
  focus, with Send Again (same address) and Use a Different Address (an empty form,
  cursor in it).
- **Refusals.** A 429 is the sign-in form's `TOO_MANY_ATTEMPTS`; anything else,
  a network failure included, is `GENERIC_RESET_REQUEST_ERROR`. Both are the
  shared `Notice` ([`notice.md`](notice.md)) in an alert region.

The story does not mock the request: a submit in the workshop fails into the alert region.
