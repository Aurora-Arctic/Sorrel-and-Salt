# ResetPasswordForm

`src/components/ResetPasswordForm/` is the form on `/reset-password`, where a
mailed reset link lands. It takes the link's token and a new password and
calls Better Auth's `resetPassword` (through `src/lib/auth-client.ts`). The
wiring behind it is [`auth/passwords.md`](../auth/passwords.md), "Reset and
change".

## Props

`ResetPasswordFormProps` (`types.ts`):

| Prop    | What it is                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `token` | Optional: the link's token. The page passes it only when the URL carries a non-empty `token` and no `error` (Better Auth's) |

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

## Styling

`.reset-password-form` is a column with the standard gap, inside the page's
`.page-frame--narrow` and `.panel`. Nothing past the tokens.

## Stories

[`index.stories.tsx`](../../src/components/ResetPasswordForm/index.stories.tsx),
titled "Sign In / Reset Password Form": `States`, with Default (a token to
spend) and Spent Link (no token), each inside the page's own frame, panel and
heading. Nothing is mocked: a submit in the workshop fails into the alert
region.

## Testing

`tests/components/ResetPasswordForm/index.test.tsx`: the form with and without
a token, the call Better Auth gets, each refusal and where it lands, the
refused token, and the success notice and link. `tests/app/reset-password-page.test.tsx`:
which URLs pass a token. Story 71 walks it in the browser
(`tests/e2e/stories/16-password.spec.ts`).

The result of a submit takes focus: the invalid field, else the notice (`useResultFocus`).
