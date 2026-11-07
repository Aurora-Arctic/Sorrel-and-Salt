# Passkeys

`src/components/Passkeys/` — the list inside the account page's Passkeys
section (story 74): each passkey the signed-in account holds, with
Rename and Remove, and Add a Passkey beneath. `src/app/(shell)/account/page.tsx`
reads the list with `accountPasskeys()` (`src/lib/request-session.ts`) and hands it
down; the section's heading and intro are the page's ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The
account page").

Every call is the passkey plugin's own route through `passkey` in
`src/lib/auth-client.ts`, not GraphQL: the plugin owns the `passkeys` table
and its ceremonies, as Better Auth owns the provider links SignInMethods
makes ([`auth/plugins.md`](../auth/plugins.md), "Passkeys"). The list is held in state, seeded from
the prop, and each action answers in place rather than reloading the page.

## The rows

A `PasskeyRow` shows its name ("Passkey" for one never named), "Added" and the day, in UTC.

- **Rename** opens a dialog holding `RenameFields`: Save Name is disabled until the trimmed name is
  new and not empty. Cancel with a typed change asks before discarding it. A refusal is a notice in
  the dialog.
- **Remove** asks first, through `ConfirmedAction` ([`user-list.md`](user-list.md), "Actions that ask
  first"), as a keeper invitation's Revoke does, and warns that another passkey or the password is
  needed to sign in from that device. Nothing is sent until Remove. A refusal closes the dialog and
  is a callout under the row's button.

## Add a Passkey

Add a Passkey asks the browser to make a passkey, sending no name, then reads
the list again (`listUserPasskeys`) so the new row is the server's own. The
server names it from the request's `User-Agent` header, such as "Chrome on
Linux" (`defaultPasskeyName`, `src/lib/passkey-name.ts`, set in the plugin's
`afterVerification` in `src/lib/auth.ts`): a small table of the common
browsers and platforms rather than a parsing library, which names whichever
of the two it can read and falls back to "Passkey" when it reads neither. A
name the client sends wins, and Rename changes it. A
cancelled prompt, or one the device cannot answer, leaves the list as it was
and says so under the button.

## The last way in

The server refuses to remove an account's only passkey when the account has
no account for a roster provider and no password, with the code `LAST_SIGN_IN_METHOD`
([`auth/plugins.md`](../auth/plugins.md), "Passkeys"). The component shows
that refusal under Remove and keeps the row. It does not grey the button
beforehand, since the page does not read the password.

`tests/db/passkey-account.test.ts` owns the server rules; the e2e story runs Chromium with a virtual authenticator.
