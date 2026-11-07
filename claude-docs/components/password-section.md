# PasswordSection

`src/components/PasswordSection/` is the account page's Password section: changing the password an account holds, or setting a first one for an account that signs in with providers alone. `src/app/(shell)/account/page.tsx` reads whether the account has a credential row with `hasPassword` (`src/lib/request-session.ts`) and hands it down (`PasswordSectionProps`, `types.ts`). The wiring behind it is [`auth/passwords.md`](../auth/passwords.md), "Reset and change" and "Setting a first password".

## Contracts

- **The page writes the section's heading, "Password", and its lede.** The lede differs between the two forms and, for an account without a password, with whether it has a linked provider. The result of every submit takes focus (`useResultFocus`, the shared `Notice`'s `result`).
- **Both submits are disabled until every field has something in it**, and are a `BusyButton` while the request is out ([`busy-button.md`](busy-button.md)).
- **After a set or change the section calls `router.refresh()`**, so the page's server-rendered text and Sign-In Methods follow the account.
- **Password managers.** The form carries a visually hidden, read-only `username` input holding the account's email (`autocomplete="username"`), and its password fields are named `current-password` and `new-password`, so a manager can offer to save.

### Changing a password

- **The call** is Better Auth's `changePassword` with `revokeOtherSessions: true`, so every other device is signed out and this one stays signed in. The server forces the same flag, so the form is not what guarantees it.
- **Refusals.** A wrong current password (`INVALID_PASSWORD`) is said under Current Password; a length or breached-list refusal under New Password. The message constants are in the section's code.

### Setting a first password

- **No current password is asked for**, since there is none; the account's session is the proof.
- **The call** is the GraphQL `setPassword` mutation, because Better Auth's `setPassword` answers only on the server. Its failure is read by the shared `readGraphqlFailure(error, ['newPassword'])`, so a refusal of the password lands under the field and anything else in the alert region.
- **Success** switches the section to the change form.

### Forgotten password

An account with a password also gets a quiet, small Forgot Your Password? button It calls Better Auth's `requestPasswordReset` for the signed-in account's own address (read from `useSession`) with `redirectTo: '/reset-password'`, the same call as the forgot-password page, and says a link was sent without printing the address. The session cannot set a new password without that emailed link. The button is absent for a placeholder address.

## Two-factor

`two-factor.tsx` is `TwoFactorSettings`, which takes `enabled` (from `users.two_factor_enabled`). The account page draws it in its own section, "Two-Factor Sign-In", after Password, with its own entry in the page nav; the page writes the heading and intro. It is drawn only when the account holds a password, since two-factor guards password sign-ins alone ([`auth/two-factor.md`](../auth/two-factor.md)). Two-factor is not on until the code is confirmed.

- **Off**, it asks to "Confirm Your Password" (labelled so it reads differently from the change form above it) and offers "Turn On Two-Factor" (`twoFactor.enable`). The answer opens three steps:
  - a QR code for the authenticator app (`QrCode`, drawn with the printed card's dots from `src/lib/qr`);
  - the key for typing in instead, which Copy Key copies ungrouped;
  - the ten backup codes, shown once, with Copy, Download and Print buttons, each giving one code per line. Print opens a window of its own.

  "Code From Your App" and "Confirm and Turn On" (`twoFactor.verifyTotp`) turn it on; Cancel leaves it off.

- **Turning on without saving the codes asks first.** If none of Copy, Download or Print has been pressed (Copy Key does not count), Confirm and Turn On calls nothing and opens a `Modal` dialog, "Turn On Without Saving Your Codes?", with Turn On (destructive) then Go Back. Go Back, Esc, Close and a click outside only close it, and focus starts on Go Back. Turn On closes it and runs the confirm.
- **Leaving without saving asks first.** While the codes are on screen and none of Copy, Download or Print has been pressed, the page holds a leave guard (`useLeaveGuard`). Closing the tab or reloading raises the browser's own question. An in-app navigation through the app's navigation provider (the Account tabs, links built on it) asks in a `Modal` dialog ("Leave Without Saving Your Codes?", with Leave and then Stay; Escape and Stay keep the person on the page; the guard calls `proceed` only on Leave). Back and Forward are held too, where the browser has the Navigation API ([`modal.md`](modal.md), "Unsaved changes"); other browsers do not hold them. The leave dialog shares the same markup with its own title and labels.
- **Focus after a dismissed dialog.** The `Modal` hands the focus back to what opened it, which is the site nav link for a held navigation and the disabled-while-busy Confirm button for the Turn On dialog, and either scrolls the page away from the section. So when a dialog is dismissed without its acting answer (Stay, Go Back, Esc, Close, a click outside), `two-factor.tsx` moves the focus on and scrolls the section into view: to the section itself after Stay, to the code field after Go Back.
- **On**, it asks for the password and offers "Turn Off Two-Factor" (`twoFactor.disable`), a destructive button.
- **Refusals.** A wrong password and a wrong code are said under their fields; a locked password (`PASSWORD_SIGN_IN_PAUSED`) and a session too old to turn it off (`SESSION_NOT_FRESH`) in an alert.

## Styling

- **The QR code is always inverted**: `.two-factor` draws it as light modules (`#c0baac`, the invitation card's dot tone, a variable in the component's SCSS) on `$soot`, in both themes, so it matches the printed card. The design review must scan-test it in at least two authenticator apps, in both themes.

## Not here

Stories: `src/components/PasswordSection/index.stories.tsx` ("Account / Password Section", `States`, Change and Set inside the account page's frame; nothing is mocked, so a submit in the workshop fails into the alert region). Tests: `tests/components/PasswordSection/` (`index.test.tsx` for the forms, calls and refusals; `two-factor.test.tsx` for the setup steps, turning on only with a confirmed code, turning off and each refusal). Story 75 walks it in the browser.
