# ResetPasswordForm

`src/components/ResetPasswordForm/` is the form on `/reset-password`, where a
mailed reset link lands. It takes the link's token and a new password and
calls Better Auth's `resetPassword` (through `src/lib/auth-client.ts`). The
wiring behind it is [`auth/passwords.md`](../auth/passwords.md), "Reset and
change".

Props: `token` is optional (`types.ts`). The page passes it only when the URL carries a non-empty `token` and no `error` (Better Auth's).

## Contracts

- **No token, no form.** Better Auth sends a spent or expired link to
  `/reset-password?error=INVALID_TOKEN`, and the page then passes no token.
  The form shows a quiet notice instead, that the link has expired or has been
  used and works once, within 15 minutes, and a link styled as a button, "Ask
  for a New Link", to `/forgot-password`. A token Better Auth refuses at the
  submit gets the same notice.
- **One field.** New Password is a [`PasswordField`](password-field.md) with
  `purpose="new"`, so it carries the strength meter and
  `autocomplete="new-password"`. The submit is disabled until it has something
  in it, and is a `BusyButton` ("Setting Password") while the request is out.
- **Each refusal is said where it belongs.** A length or breached-list refusal
  goes under the field, through the sign-in form's `newPasswordRefusal`, in
  the same words as at sign-up. A 429 is `TOO_MANY_ATTEMPTS`; a 500, the
  breached-password check unable to answer, is `PASSWORD_CHECK_UNAVAILABLE`;
  anything else is `GENERIC_RESET_ERROR`.
- **Success says what happened and where to go.** The form is replaced by a
  notice that the new password is set and every device signed in to the
  account has been signed out, and a "Sign In" link styled as a button to
  `/sign-in`. A reset gives no session.
- **A submit's result takes focus**: the invalid field, else the notice (`useResultFocus`).

## Styling

`.reset-password-form` is a column with the standard gap, inside the page's
`.page-frame--narrow` and `.panel`. Nothing past the tokens.

## Stories and tests

`src/components/ResetPasswordForm/index.stories.tsx` (nothing is mocked: a submit in the workshop fails into the alert region); `tests/components/ResetPasswordForm/index.test.tsx`; `tests/app/reset-password-page.test.tsx` (which URLs pass a token); story 71 in `tests/e2e/stories/16-password.spec.ts`.
