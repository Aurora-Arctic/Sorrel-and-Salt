## Email and password (M16.2)

A person with none of the four providers signs up and in with an email
address and a password, through Better Auth's `emailAndPassword` option in
`src/lib/auth.ts`. The rules a password is held to, and the source of each,
are DESIGN.md §8, "Passwords"; this page is how they are wired. The form is
[`components/sign-in-panel.md`](../components/sign-in-panel.md), "Email and
password", and its password control
[`components/password-field.md`](../components/password-field.md).

### The config

| Option                     | Value   | Why                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minPasswordLength`        | 15      | DESIGN.md §8: the password may be the only factor                                                                                                                                                                                                                                                                 |
| `maxPasswordLength`        | 128     | DESIGN.md §8. scrypt hashes the whole password, so two that differ after the 72nd character stay different                                                                                                                                                                                                        |
| `requireEmailVerification` | `false` | On, Better Auth gives an unverified account no session, and `/verify-email` verifies only from the row's own session ([`admin-bootstrap.md`](admin-bootstrap.md)), so the link could never be followed. `requireSession()` holds an unverified account at `/account/email` instead, as it does a provider account |
| `autoSignIn`               | `true`  | A new account lands signed in; `requireSession()` holds it at the email page. Better Auth then refuses a held address with a 422, so the `before` hook answers that case first ("A sign-up to a held address" below)                                                                                              |

`emailVerification.sendOnSignUp` was already on, so a password sign-up is
mailed the same one-hour verification link a provider sign-up is.

### The breached-password check

`breachedPasswordCheck` (`src/lib/breached-password.ts`) is the project's own
plugin, in place of Better Auth's `haveIBeenPwned`. It works the same way:
its `init` wraps `ctx.password.hash`, so every password Better Auth hashes on
one of its paths is checked first, from the browser or from `auth.api`. It
differs in three things:

- **A bounded wait.** The range request carries
  `AbortSignal.timeout(BREACHED_CHECK_TIMEOUT_MS)`, three seconds. Better
  Auth's plugin has no timeout, so a range API that accepted the connection
  and never answered would hold the sign-up open until the platform killed it.
- **It fails closed.** A timeout, a refused connection, a non-2xx answer or a
  count that is not a whole number all refuse the password with a 500 and
  "We couldn't check your password just now. Please try again later." A
  password the check could not see is never accepted.
- **Its paths.** `BREACHED_CHECK_PATHS` is `/sign-up/email`,
  `/change-password`, `/reset-password` and `/set-password`: every endpoint
  where a person chooses a password. Better Auth's list also names the
  `email-otp`, `phone-number` and `admin` plugins' endpoints, none of which
  is registered here, and leaves out `/set-password`.

Only the first five characters of the password's upper-case SHA-1 hash leave
the server, with `Add-Padding: true` so the answer's size says nothing about
the prefix. A breached password is refused with a 400, the code
`PASSWORD_COMPROMISED`, and a message saying why, which the form puts under
the password field.

Choosing this over the stock plugin goes against the project's preference
for the standard tool. The stock plugin takes no timeout option and no
`fetch`, so the bound could not be added from outside it.

### A sign-up to a held address

The answer to a sign-up does not say whether the address already had an
account in its body (OWASP Auth; DESIGN.md §8). Two pieces make it so:

- **The holder is mailed instead.** The `before` hook's `answerHeldSignUp`
  finds the holder, calls `mailExistingHolder`, and answers 200
  `{ status: true }` before Better Auth runs, so no second account is made
  and no 422 names the address as taken. `mailExistingHolder` sends
  `src/emails/account-exists.tsx` to the held address: someone tried to make
  an account with it, no second account was made, and how to sign in (with
  the password, the linked providers, or both). It names no one, since
  whoever made the sign-up need not be the holder. It has no cooldown; the
  rate limiter on `/sign-up/email` bounds it ([`rate-limiting.md`](rate-limiting.md)).
  A placeholder address is never mailed.
- **The same body.** The `after` hook replaces a new account's body with
  `{ status: true }` too, since Better Auth's own carries the user row.

The one difference left is the session cookie: a new account is signed in and
a held address is not. The form reads that with `getSession`.

The `before` hook runs the lapsed-account sweep on `/sign-up/email` as it does
on an OAuth callback, so a lapsed unverified row holding the address is gone
before Better Auth looks it up ("Provisional accounts",
[`admin-bootstrap.md`](admin-bootstrap.md)).

### Signing in

`/sign-in/email` answers a wrong password and an unknown address with the
same 401, which the form words as one sentence. After a sign-in, the form
does a full load of `/sign-in?next=…`, whose server redirect already sends a
signed-in account on: to `next` or its landing, and an unverified one to the
email page first. A sign-up is signed in (`autoSignIn: true`): the form
checks for a session and follows it on to `/sign-in?next=…`, which sends the
unverified account to the email page. With no session the address was held,
and the form says a mail has been sent to it.

The lockout per account is M16.5's; until it lands, the rate limiter is the
only bound on guesses.

### Tests

- `tests/db/password-sign-in.test.ts`: the length rules, the 72-character
  case, the breached refusal and the prefix-only request, the check failing
  closed when the service is unreachable and when it never answers (within the
  three-second bound), the held-address answer and mail, the same 401, and
  that a sign-up earns no `canCreateWorkspace`. The range API is MSW
  (`tests/support/password.ts`), never the real service.
- `tests/e2e/stories/16-password.spec.ts`, story 70: the browser flow, with
  the e2e servers' stand-in for the range API
  ([`testing/e2e.md`](../testing/e2e.md), "A password sign-in in the browser").
