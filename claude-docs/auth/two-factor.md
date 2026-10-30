## Two-factor (M16.10)

Someone who signs in with a password can add a second step: a six-digit code
from an authenticator app, or one of ten backup codes. It is offered, never
required (DESIGN.md §8, "Passwords").

### The config

`twoFactor({ issuer: SITE_NAME })` from `better-auth/plugins/two-factor` is
registered in `src/lib/auth.ts`, with its table `two_factors` and the column
`users.two_factor_enabled` (M16.9, ["Tables"](tables.md)). Everything else is
the plugin's default:

- **TOTP** (time-based one-time password): six digits, a 30-second step, and
  the step either side of the current one accepted, for a clock that drifts.
- **`skipVerificationOnEnable` stays false.** `/two-factor/enable` takes the
  password and returns the app's `otpauth://` link and ten backup codes, but
  the account is not on until `/two-factor/verify-totp` takes a right code
  from the app. A person who never finishes the setup is left with two-factor
  off.
- **No emailed code.** The `otpOptions` method is not configured, so the
  second step is the app's code or a backup code.
- **"Trust this device"** is the plugin's own signed cookie, lasting 30 days.
  A sign-in from that browser skips the second step; any other browser is
  asked.

The client half is `twoFactorClient()` in `src/lib/auth-client.ts`, with no
options, so it does no redirect of its own: the password form reads
`twoFactorRedirect` from the sign-in answer and shows the second step
([`components/sign-in-panel.md`](../components/sign-in-panel.md),
"Two-factor"). Turning it on and off is in the account page's Password section
([`components/password-section.md`](../components/password-section.md),
"Two-factor").

### Which sign-ins are asked

Only `/sign-in/email`, the password sign-in. The plugin's hook answers that
path alone, so a provider or passkey sign-in makes its session with no second
step (`tests/db/passkey-sign-in.test.ts`): a provider holds its own second
factor, and a passkey is one already. The section is shown only to an account
that holds a password, and the plugin refuses `/two-factor/enable` from an
account without one, so no account with two-factor on is ever without a
password.

### Wrong codes

Wrong codes are held by the plugin's own lockout, not by the password count
of M16.5 (DESIGN.md §8):

- one sign-in's challenge takes 5 codes, then the person starts again from
  the password;
- 10 wrong codes on an account lock its second step for 15 minutes
  (`ACCOUNT_TEMPORARILY_LOCKED`, 429), and a right code is refused meanwhile;
- they leave `sign_in_failures` alone, so a wrong code never locks the
  password and a wrong password never locks the codes.

The plugin's own rate rule, 3 requests per 10 seconds per address on every
`/two-factor/*` path, applies in every deploy ([`rate-limiting.md`](rate-limiting.md)).

### What is encrypted, and under which key

The plugin stores the app's secret and the backup codes encrypted with the
auth secret. The app sets Better Auth's versioned `secrets` option
(`src/lib/auth-secrets.ts`), so every encrypted value starts `$ba$<version>$`
and names the key it was written under. A new key can then be added without
making any enrolment unreadable: how is in [`config.md`](config.md), "Rotating
the secret". The versions were in place before the first enrolment could
exist, so no two-factor row was ever written unversioned.

### Tests

`tests/db/two-factor.test.ts` drives Better Auth's own endpoints against the
database: turning on needs the password and a code, turning off the password;
the right password alone does not sign in, the right code does and a wrong one
does not; a backup code works once; a trusted device skips the step and
another does not; the code lockout leaves the password count alone; and an
enrolment made under the old key still verifies after a new key is added, and
fails once the old one is removed. The codes come from
`tests/support/two-factor.ts`, which computes them from the `otpauth://` link
as an app does. Story 75's browser flow is
`tests/e2e/stories/75-two-factor.spec.ts`: it turns two-factor on from the
account page with a code computed from the key the page shows, then signs in
with the password and a fresh code.
