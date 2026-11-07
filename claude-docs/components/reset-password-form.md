# ResetPasswordForm

`src/components/ResetPasswordForm/` is the form on `/reset-password`, where a
mailed reset link lands. It takes the link's token and a new password and
calls Better Auth's `resetPassword` (through `src/lib/auth-client.ts`). The
wiring behind it is [`auth/passwords.md`](../auth/passwords.md), "Reset and
change". The page passes `token` only when the URL carries a non-empty `token` and no `error` (Better Auth's).

## Contracts

- **No token, no form.** Better Auth sends a spent or expired link to
  `/reset-password?error=INVALID_TOKEN`, and the page then passes no token.
  The form shows a quiet notice instead (the link has expired or has been
  used, and works once, within 15 minutes) and "Ask for a New Link" to
  `/forgot-password`. A token Better Auth refuses at the submit gets the same notice.
- **One field.** New Password is a [`PasswordField`](password-field.md) with
  `purpose="new"`. The submit is disabled until it has something in it.
- **Each refusal is said where it belongs.** A length or breached-list refusal
  goes under the field, through the sign-in form's `newPasswordRefusal`, in
  the same words as at sign-up. A 429 is `TOO_MANY_ATTEMPTS`; a 500, the
  breached-password check unable to answer, is `PASSWORD_CHECK_UNAVAILABLE`;
  anything else is `GENERIC_RESET_ERROR`.
- **Success** replaces the form with a notice that the new password is set and
  every device signed in to the account has been signed out, and a "Sign In"
  link. A reset gives no session.
- **A submit's result takes focus**: the invalid field, else the notice (`useResultFocus`).

The story does not mock the request: a submit in the workshop fails into the alert region.
`tests/app/reset-password-page.test.tsx` covers which URLs pass a token.
