# Passkeys

`src/components/Passkeys/` — the list inside the account page's Passkeys
section (M16.8, Story 74): each passkey the signed-in account holds, with
Rename and Remove, and Add a Passkey beneath. Server component
`src/app/(shell)/account/page.tsx` reads the list with `accountPasskeys()`
(`src/lib/request-session.ts`) and hands it down. The section's heading and
intro, which says a passkey is tied to this website's address and to the
device or password manager that holds it, are the page's ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The
account page").

Every call is the passkey plugin's own route through `passkey` in
`src/lib/auth-client.ts`, not GraphQL: the plugin owns the `passkeys` table
and its ceremonies, as Better Auth owns the provider links SignInMethods
makes ([`auth/plugins.md`](../auth/plugins.md), "Passkeys").

## The props contract

| Prop       | Meaning                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `passkeys` | The account's passkeys as `{ id, name, createdAt }` (`AccountPasskey`, `src/lib/types.ts`): `name` is null for one never named, `createdAt` an ISO timestamp. |

The list is held in state, seeded from the prop, and each action answers in
place rather than reloading the page.

## The rows

Each passkey is a `PasskeyRow` (`passkey-row.tsx`): its name, "Passkey" for
one never named (`passkeyLabel`, `label.ts`), then "Added" and the day, in
UTC, then two small buttons:

- **Rename** (`.btn--quiet.btn--small`) opens a dialog titled "Rename
  Passkey" holding `RenameFields` (`rename-fields.tsx`): one required Name
  field and Save Name, disabled until the trimmed name is new and not empty,
  with a spinner while saving. Cancel with a typed change asks before
  discarding it. A refusal is a notice in the dialog; a success closes it and
  the row shows the new name.
- **Remove** (`.btn--quiet.btn--small`, drawn plain as the destructive-control
  rule has it) asks first, through `ConfirmedAction`
  ([`user-list.md`](user-list.md), "Actions that ask first"), as an admin
  invitation's Revoke does: a dialog titled "Remove Passkey" asks "Remove
  <name>? You will need another passkey or your password to sign in from
  that device." and holds the red Remove (`.btn--destructive`) and Cancel.
  Nothing is sent until Remove. A refusal closes the dialog and is a callout
  under the row's button.

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
and says "No passkey was added. Try again, or add one from another device."
under the button.

## The last way in

The server refuses to remove an account's only passkey when the account has
no account for a roster provider and no password, with the code `LAST_SIGN_IN_METHOD`
([`auth/plugins.md`](../auth/plugins.md), "Passkeys"). The component shows
that refusal as "This passkey is your only way to sign in, so it cannot be
removed. Add another way first." under Remove, and keeps the row. It does not
grey the button beforehand, since the page does not read the password.

## Tests

`tests/components/Passkeys/index.test.tsx` covers the list, add, a cancelled
add, rename, the ask-first remove, and the last-way-in refusal, with the plugin's
client actions mocked. `tests/db/passkey-account.test.ts` covers the server:
rename and remove by the owner, another account's id refused for both, and
the last-way-in rule. `tests/e2e/stories/74-passkeys-on-the-account-page.spec.ts`
walks add (named after the browser), rename and a confirmed remove in Chromium with a virtual authenticator.
