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

An account with a password also gets a quiet, small Forgot Your Password? button (`btn btn--quiet btn--small`). It calls Better Auth's `requestPasswordReset` for the signed-in account's own address (read from `useSession`) with `redirectTo: '/reset-password'`, the same call as the forgot-password page, and says a link was sent without printing the address. The session cannot set a new password without that emailed link. The button is absent for a placeholder address.

## Refresh and password managers

After a set or change the section calls `router.refresh()`, so the page's server-rendered text and Sign-In Methods follow the account. The form carries a visually hidden, read-only `username` input holding the account's email (`autocomplete="username"`), and its password fields are named `current-password` and `new-password`, so a password manager can offer to save.

Both submits are disabled until every field has something in it, and are a
`BusyButton` ("Changing Password", "Setting Password") while the request is
out ([`busy-button.md`](busy-button.md)).

## Two-factor

`two-factor.tsx` is `TwoFactorSettings`, which takes `enabled` (from
`users.two_factor_enabled`). The account page draws it in its own section,
"Two-Factor Sign-In", after Password, with its own entry in the page nav; the
page writes the heading and intro. It is drawn only when the account holds a password, since two-factor guards
password sign-ins alone ([`auth/two-factor.md`](../auth/two-factor.md)).

- **Off**, it asks to "Confirm Your Password" (labelled so it reads differently from the change form above it) and offers "Turn On Two-Factor"
  (`twoFactor.enable`). The answer opens three steps: a QR code for the
  authenticator app (Ark UI's `QrCode`, `role="img"`), the key the code
  holds for typing in instead (grouped in fours, with an icon-only Copy Key button left-aligned under it that
  copies the key ungrouped), and the ten backup codes, said to be shown
  once, with icon-only Copy, Download and Print buttons (the `IconTip` icon-button pattern, `icon-tip__edit--plain`,
  tip above, left-aligned under the codes panel), each giving one code
  per line. Print opens a window of its own with a heading ("Sorrel & Salt Backup Codes"), the
  account's email, the print date, a line saying what the codes are for, and the codes in the same two centred columns. "Code From Your App" and "Confirm and Turn On" (`twoFactor.verifyTotp`)
  turn it on; Cancel leaves it off. If none of Copy, Download or Print has been pressed (Copy Key does not count), Confirm and Turn On calls nothing and opens a dialog on the `Modal`, "Turn On Without Saving Your Codes?", with Turn On (destructive) then Go Back; Go Back, Esc, Close and a click outside only close it, and focus starts on Go Back. Turn On closes it and runs the confirm. The leave dialog shares the same markup with its own title and labels. While the codes are on screen and none of Copy, Download or Print has
  been pressed, the page holds a leave guard (`useLeaveGuard`): closing the tab or reloading raises the
  browser's own question, and an in-app navigation through the app's navigation provider (the Account tabs,
  links built on it) asks in a dialog on the `Modal` ("Leave Without Saving Your Codes?", with Leave and then Stay; Escape and Stay keep the person on the page; the guard calls `proceed` only on Leave). Back and the browser's own history moves are not held. Two-factor is not on until that code is
  confirmed.
- **On**, it asks for the password and offers "Turn Off Two-Factor"
  (`twoFactor.disable`), a destructive button.
- **Refusals.** A wrong password (`INVALID_PASSWORD`) is `WRONG_PASSWORD`
  under the Password field; a wrong code is the sign-in step's `WRONG_CODE`
  under the code field; a locked password (`PASSWORD_SIGN_IN_PAUSED`) is
  `PASSWORD_SIGN_IN_PAUSED_MESSAGE`, in an alert; a session too old to turn it off (`SESSION_NOT_FRESH`)
  is `STALE_SESSION`, in an alert; a 429 is `TOO_MANY_ATTEMPTS`, anything else
  `GENERIC_TWO_FACTOR_ERROR`.
- **Success** says two-factor is on or off in a success notice.

Each submit is disabled until its field has something in it, and is a
`BusyButton` ("Turning On", "Turning Off") while the request is out.

## Styling

`.password-section` is a column with the standard gap, on the section's
`.panel` inside the account page's `.page-frame--narrow`. Nothing past the
tokens. `.two-factor` draws the QR code as light modules (`#c0baac`, the invitation card's dot tone, a
variable in the component's SCSS) on `$soot`, in both themes, so it matches the printed card. The code
is therefore always inverted (light on dark): the design review must scan-test it in at least two
authenticator apps, in both themes. The backup codes sit in two equal columns,
each code centred in its column, with no list marker. The setup key and the backup codes each sit
on their own in a `.two-factor__well`: `$surface-page` (darker than the card in both themes) with
`radius('surface')` and `space(3)` padding. The QR code and the codes' panel have `space(3)` above and below them, the key's `space(2)`.

## Stories

[`index.stories.tsx`](../../src/components/PasswordSection/index.stories.tsx),
titled "Account / Password Section": `States`, with Change and Set, each inside
the app shell and the account page's frame, section and panel. Nothing is
mocked: a submit in the workshop fails into the alert region.

## Testing

`tests/components/PasswordSection/index.test.tsx`: which form each prop gives,
the calls each makes, each refusal and where it lands, and the switch to the
change form after a first password is set. `tests/components/PasswordSection/two-factor.test.tsx`:
the setup steps, turning on only with a
confirmed code, turning off, and each refusal. Story 75 walks it in the browser.
