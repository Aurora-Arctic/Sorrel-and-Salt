# PasswordSection

`src/components/PasswordSection/` is the account page's Password section:
changing the password an account holds, or setting a first one for an account
that signs in with providers alone. `src/app/(shell)/account/page.tsx` reads
whether the account has a credential row with `hasPassword`
(`src/lib/request-session.ts`) and hands it down. The wiring behind it is
[`auth/passwords.md`](../auth/passwords.md), "Reset and change" and "Setting a
first password".

## Props

`PasswordSectionProps` (`types.ts`):

| Prop          | What it is                                                         |
| ------------- | ------------------------------------------------------------------ |
| `hasPassword` | Whether the account holds a password, which picks the form it gets |

The section's heading, "Password", and its lede, which differs between the
two forms and, for an account without a password, with whether it has a linked
provider, are the page's. The result of every submit takes focus
(`useResultFocus`, the shared `Notice`'s `result`).

## Changing a password

- **Two fields**: Current Password, a [`PasswordField`](password-field.md)
  with `purpose="current"`, and New Password with `purpose="new"` and its
  strength meter.
- **The call** is Better Auth's `changePassword` with
  `revokeOtherSessions: true`, so every other device is signed out and this
  one stays signed in. The server forces the same flag, so the form is not
  what guarantees it.
- **Refusals.** A wrong current password (`INVALID_PASSWORD`) is
  `WRONG_CURRENT_PASSWORD`, under the Current Password field. A length or
  breached-list refusal goes under New Password. A 429 is
  `TOO_MANY_ATTEMPTS`, a 500 `PASSWORD_CHECK_UNAVAILABLE`, anything else
  `GENERIC_CHANGE_ERROR`.
- **Success** clears both fields and says the password was changed and every
  other device has been signed out.

## Setting a first password

- **One field**, New Password. No current password is asked for, since there
  is none; the account's session is the proof.
- **The call** is the GraphQL `setPassword` mutation, because Better Auth's
  `setPassword` answers only on the server. Its failure is read by the shared
  `readGraphqlFailure(error, ['newPassword'])`, so a refusal of the password
  lands under the field and anything else in the alert region.
- **Success** switches the section to the change form, with a notice that the
  account can now sign in with its email address and this password as well as
  its providers.

## Forgotten password

An account with a password also gets a Forgot Your Password? button. It calls Better Auth's `requestPasswordReset` for the signed-in account's own address (read from `useSession`) with `redirectTo: '/reset-password'`, the same call as the forgot-password page, and says a link was sent without printing the address. The session cannot set a new password without that emailed link. The button is absent for a placeholder address.

## Refresh and password managers

After a set or change the section calls `router.refresh()`, so the page's server-rendered text and Sign-In Methods follow the account. The form carries a visually hidden, read-only `username` input holding the account's email (`autocomplete="username"`), and its password fields are named `current-password` and `new-password`, so a password manager can offer to save.

Both submits are disabled until every field has something in it, and are a
`BusyButton` ("Changing Password", "Setting Password") while the request is
out ([`busy-button.md`](busy-button.md)).

## Styling

`.password-section` is a column with the standard gap, on the section's
`.panel` inside the account page's `.page-frame--narrow`. Nothing past the
tokens.

## Stories

[`index.stories.tsx`](../../src/components/PasswordSection/index.stories.tsx),
titled "Account / Password Section": `States`, with Change and Set, each inside
the app shell and the account page's frame, section and panel. Nothing is
mocked: a submit in the workshop fails into the alert region.

## Testing

`tests/components/PasswordSection/index.test.tsx`: which form each prop gives,
the calls each makes, each refusal and where it lands, and the switch to the
change form after a first password is set.
