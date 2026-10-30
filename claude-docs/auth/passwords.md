## Email and password (M16.2)

A person with none of the four providers signs up and in with an email
address and a password, through Better Auth's `emailAndPassword` option in
`src/lib/auth.ts`. The rules a password is held to, and the source of each,
are DESIGN.md §8, "Passwords"; this page is how they are wired. The form is
[`components/sign-in-panel.md`](../components/sign-in-panel.md), "Email and
password", and its password control
[`components/password-field.md`](../components/password-field.md).

### The config

| Option                     | Value                | Why                                                                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minPasswordLength`        | 15                   | DESIGN.md §8: the password may be the only factor                                                                                                                                                                                                                                                                 |
| `maxPasswordLength`        | 128                  | DESIGN.md §8. scrypt hashes the whole password, so two that differ after the 72nd character stay different                                                                                                                                                                                                        |
| `requireEmailVerification` | `false`              | On, Better Auth gives an unverified account no session, and `/verify-email` verifies only from the row's own session ([`admin-bootstrap.md`](admin-bootstrap.md)), so the link could never be followed. `requireSession()` holds an unverified account at `/account/email` instead, as it does a provider account |
| `autoSignIn`               | `false`              | What makes Better Auth answer a sign-up to a held address as it answers a new one, and call `onExistingUserSignUp`                                                                                                                                                                                                |
| `onExistingUserSignUp`     | `mailExistingHolder` | Mails the holder instead of making a second account ("A sign-up to a held address" below)                                                                                                                                                                                                                         |

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
- **Its endpoints.** `BREACHED_CHECK_PATHS` is `/sign-up/email`,
  `/change-password` and `/reset-password`, and `setPassword` is checked
  too: every endpoint where a person chooses a password. `setPassword`
  answers only on the server and has no route, and Better Auth gives its
  handler no path or name to match, so its one caller, `passwordSetter`
  ("Setting a first password" below), runs it inside `withBreachedCheck`,
  which turns the check on for every hash in that call. Better Auth's list
  also names the `email-otp`, `phone-number` and `admin` plugins'
  endpoints, none of which is registered here, and leaves out setting a
  first password.
- **The guard.** The list names the routes it checks, so an endpoint a
  Better Auth upgrade or a new plugin adds would take a password unchecked.
  `tests/guards/breached-password-paths.test.ts` reads every endpoint the
  configured instance registers and fails on one whose body takes a
  `password` or `newPassword` and that is on none of: `BREACHED_CHECK_PATHS`;
  its list of endpoints that check a password the account already holds
  (`/sign-in/email`, `/verify-password`, `/delete-user`); or its list of
  server-only endpoints, each of which it checks is called inside
  `withBreachedCheck`. An endpoint whose body has no schema to read must be
  named with the reason it takes no password. A new endpoint goes on one of
  those lists in the PR that registers it.

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
account (OWASP Auth; DESIGN.md §8). Two pieces make it so:

- **The same answer.** The `after` hook's `sameSignUpAnswer` replaces every
  accepted sign-up's body with `{ status: true }`. Better Auth's own answer
  carries the user row, and for a held address it builds a synthetic one
  whose database-filled fields differ from a real row's.
- **The holder is mailed instead.** `mailExistingHolder` sends
  `src/emails/account-exists.tsx` to the held address: someone tried to make
  an account with it, no second account was made, and how to sign in (with
  the password, the linked providers, or both). It names no one, since
  whoever made the sign-up need not be the holder. It has no cooldown; the
  rate limiter on `/sign-up/email` bounds it ([`rate-limiting.md`](rate-limiting.md)).
  A placeholder address is never mailed.

The `before` hook runs the lapsed-account sweep on `/sign-up/email` as it does
on an OAuth callback, so a lapsed unverified row holding the address is gone
before Better Auth looks it up ("Provisional accounts",
[`admin-bootstrap.md`](admin-bootstrap.md)).

### Signing in

`/sign-in/email` answers a wrong password and an unknown address with the
same 401, which the form words as one sentence. After a sign-in, the form
does a full load of `/sign-in?next=…`, whose server redirect already sends a
signed-in account on: to `next` or its landing, and an unverified one to the
email page first. A sign-up gets no session (`autoSignIn: false`): the form
returns to sign-in with the address filled, and the person signs in, then
follows the mailed link from that browser.

### Lockout

Better Auth's rate limiter counts per client address, so guesses spread over
many addresses pass it. Failed password sign-ins are also counted per account,
in `sign_in_failures` (DESIGN.md §8, "Passwords"), by
`src/modules/identity/services/sign-in-lockout.ts` and hooks on
`/sign-in/email` and every endpoint that checks the password an account
already holds, in `src/lib/auth.ts`:

- **The schedule.** Every 5th failure starts a lock: the 5th for 1 minute,
  the 10th for 5 minutes, the 15th for 15 minutes, and the 20th and every 5th
  after it for 1 hour, the ceiling. A count between two of these adds no lock
  of its own. No count switches the password off for good, since anyone who
  knows an address could otherwise do that to its owner.
- **The count decays.** `last_failed_at` records the latest failure, and a
  failure more than 24 hours after it starts the count again at 1, so
  failures spread over days never climb the ladder. The upsert in
  `repository/sign-in-failures.ts` decides it in one statement.
- **The owner is told.** When a failure starts a lock, `countFailure` mails
  `src/emails/password-locked.tsx` to the account: how long the lock lasts,
  and a reset link, so the owner can choose a new password at once instead of
  waiting. The link is made as Better Auth makes its own (a `reset-password:`
  verification row, valid 15 minutes, `callbackURL` fixed to
  `/reset-password`), and goes, like the reset mail, only to a verified, real
  address. The whole mail runs in the background, after the answer, so a
  failure that starts a lock answers like any other. A mail that fails there
  is logged and otherwise silent, by design: the answer has already gone, and
  failing the guess it followed would tell the guesser the mail was tried.
- **Only the first lock of a series is mailed.** A lock whose previous lock
  ended within the 24-hour quiet period sends nothing, so someone guessing on
  through every lock cannot mail the owner a live reset link each hour. The
  failure upsert leaves `locked_until` alone, so the row it returns still
  holds the previous lock, and `recordFailedPasswordSignIn` reports whether
  the new one opens a series. A completed reset or a successful sign-in
  deletes the row, so the next lock after either is mailed again.
- **`password_disabled`** is left from the first schedule and read by
  nothing; a later task drops it.
- **Only an account with a password is counted.** The before hook looks the
  address up the way Better Auth's sign-in does, with its accounts, and goes
  no further when it has no `credential` row holding a password. Guesses at a
  provider-only account are refused by Better Auth as wrong and count nothing,
  so they cannot lock it.
- **The before hook** (`holdLockedSignIn`) looks the address up and, while its
  account is locked, replaces the submitted password with 32 random bytes in
  hex, which no stored hash matches. Better Auth then runs its own lookup and
  its own scrypt verify and refuses with its own `INVALID_EMAIL_OR_PASSWORD`.
  A locked attempt therefore gets the same response as a wrong password, built
  by the same code, and takes as long, since the slow part of both is the same
  verify. Refusing in the hook instead would skip the verify and answer
  measurably faster, which would show the lock and so that the address has an
  account. What is left between the two is one indexed upsert that the wrong
  password adds, a millisecond against the verify's tens.
- **The after hook** (`countPasswordSignIn`) adds one when the endpoint
  returned that error for an account that was not locked, and deletes the row
  on a successful sign-in. Attempts made during a lock are not counted, so a
  lock ends when its time does.
- **Every check of a held password counts too.** A wrong password at an
  endpoint that checks the signed-in account's own password is a guess at the
  same password, so it counts the same way. `HELD_PASSWORD_FIELDS` in
  `src/lib/held-password-paths.ts` names each such endpoint and the body field
  it reads: `/change-password` (`currentPassword`), `/verify-password`,
  `/delete-user`, `/two-factor/enable`, `/two-factor/disable`,
  `/two-factor/get-totp-uri` and `/two-factor/generate-backup-codes`. For
  each, the before hook (`holdHeldPassword`) swaps the password for random
  bytes while the account is locked, so the request is refused as Better
  Auth's own `INVALID_PASSWORD`, and the after hook (`countHeldPassword`)
  adds one for a wrong password on an unlocked account and deletes the row
  once a password is accepted. Like a sign-in, it counts only an account with
  a `credential` row holding a password. `/verify-password` is reachable
  from the server only and `/delete-user` is not enabled; both are on the
  list so a later use of either is counted from the start.
  `tests/guards/breached-password-paths.test.ts` builds its list of endpoints
  that check a held password from `HELD_PASSWORD_FIELDS`, so an endpoint that
  takes one is on the list, and so under the lock, or fails that test.
- **What it leaves open.** A provider or passkey sign-in never reads the row.
  A completed reset deletes it, in `onPasswordReset`, and so does a passkey
  sign-in, in the after hook on `/passkey/verify-authentication`, since a
  passkey proves the owner as the password would.
- **Two-factor codes are not counted here.** A wrong code at the second step
  goes to the `twoFactor` plugin's own lockout, and the password row never
  hears of it ([`two-factor.md`](two-factor.md), "Wrong codes").
- **Outside `withAudit`.** A failed sign-in has no session to audit; the
  counter's repository file, `src/db/repository/sign-in-failures.ts`, is one of the two
  repository files CLAUDE.md rule 3 names as writing outside it
  ([`design-decisions/m16.4-repository-writes-outside-the-audit.md`](../design-decisions/m16.4-repository-writes-outside-the-audit.md)).

### Reset and change

The rules for both are DESIGN.md §8, "Passwords". Both are Better Auth's own
endpoints, configured in `emailAndPassword` and the hooks in
`src/lib/auth.ts`; the forms are
[`components/forgot-password-form.md`](../components/forgot-password-form.md),
[`components/reset-password-form.md`](../components/reset-password-form.md) and
[`components/password-section.md`](../components/password-section.md).

- **Asking for a link.** `/forgot-password`, linked as "Forgot Password?"
  from the sign-in form, posts to `/request-password-reset`. Better Auth
  answers every address alike. `mailResetLink` mails
  `src/emails/reset-password.tsx` to a verified address only, so a reset
  never reaches an inbox the account has not proved, and never to a
  placeholder address. It sets the link's `callbackURL` to `/reset-password`
  whatever the request asked, so a request cannot point the link anywhere
  else.
- **The mail runs after the answer.** Better Auth hands the send to
  `advanced.backgroundTasks.handler`, which is `runInBackground` in
  `src/lib/background-tasks.ts`: Next's `after()` runs it once the response
  is sent. Without it the request waited for the mail transport for a
  verified address and not for any other, so the time an answer took showed
  whether the address has an account. Every mail Better Auth sends goes the
  same way: the verification mail at sign-up, at sign-in and on a resend,
  the mail to an address that signs up again, the change-email mails, and the
  link-account verification. So does the rate limiter's sweep of expired
  rows. Outside a request, where `after()` throws, a task is held until
  `settleHeldTasks()` is awaited; `importAuth` in
  `tests/support/auth-module.ts` does that after every call, so a test sees
  the mail its call sent. `tests/db/password-reset-background.test.ts` holds
  the send open and proves the answer arrives first.
- **The link.** It is Better Auth's `/reset-password/:token`, which
  redirects to `/reset-password?token=…`, or to
  `/reset-password?error=INVALID_TOKEN` for a token spent or past its life.
  `resetPasswordTokenExpiresIn` is 15 minutes, short because Better Auth
  stores the token unhashed in `verifications`; a reset deletes it, so it
  works once.
- **Resetting.** `/reset-password` posts the token and the new password.
  `revokeSessionsOnPasswordReset` signs out every session the account had.
  A reset gives no session: the person signs in with the new password.
- **Changing.** The account page's Password section posts the current and
  the new password to `/change-password`. A `before` hook sets
  `revokeOtherSessions: true` whatever the request says, so every other
  session is signed out and the one that made the change is kept.
- **The rules.** `/reset-password` and `/change-password` are hashed
  through `ctx.password.hash`, so the length rules and the breached-password
  check, failing closed, hold for both as they do at sign-up. No rule makes
  anyone change a password on a schedule (DESIGN.md §8).
- **The notice.** A reset (`onPasswordReset`), a change (an `after` hook on
  `/change-password`) and a first password set each mail
  `src/emails/password-changed.tsx` through `mailPasswordChanged`
  (`src/lib/password-notice.ts`): the password was replaced, how, and a link to
  `/forgot-password` for a holder who made no change.

Both pages are public routes in `src/proxy.ts`
([`route-protection.md`](route-protection.md)), since a person who has
forgotten their password has no session. A signed-in visitor is not sent
away from either, by the owner's decision of 2026-10-30: `/forgot-password`
is the only way back for a signed-in person who has forgotten their
password, and a reset link opened in a browser where another account is
signed in must still work.

Both pages ask search engines not to index them: each page's `metadata`
sets `robots: { index: false }`, which Next renders as a
`<meta name="robots" content="noindex">` tag (the owner's decision of
2026-10-30). It is a second guard: on production `robots.txt` already leaves
both paths out of its allow list, and off production `src/proxy.ts` sends
`X-Robots-Tag: noindex` on every response. The tag covers a crawler that
fetches either page anyway. The reset link's life stays at 15 minutes, which
the owner confirmed the same day.

### Setting a first password

An account that signs in with providers alone has no credential row, so it
has no current password to give. Better Auth's `setPassword` gives it one,
but that endpoint answers only on the server, so the account page reaches it
through the GraphQL mutation `setPassword(newPassword: String!)`:

- The service `setPassword` (`src/modules/identity/services/password.ts`)
  refuses an account whose address is unverified, as every service but `me`
  and `setEmail` does. It then refuses a session older than Better Auth's
  `freshAge` (one day), with a `Forbidden` that says to sign out and sign in
  again, the check Better Auth makes before adding a passkey: whoever holds a
  stolen or forgotten session cannot give the account a password that outlives
  it. Only then does it call the setter it is handed.
- The setter is `passwordSetter(request)` (`src/lib/password-setter.ts`),
  put on the GraphQL context as `context.passwords`, because a service may
  not import `auth`. Its `sessionIsFresh` reads the request's session from
  Better Auth for the service's freshness check. It calls `auth.api.setPassword` with the request's own
  headers, so the only account it can name is the caller's. It runs the call
  inside `withBreachedCheck`, so the breached-password check holds here too
  ("The breached-password check" above), and words every refusal of the
  password, and Better Auth's `PASSWORD_ALREADY_SET`, as a `ValidationError`
  on `newPassword`.
- The write is Better Auth's, to its `accounts` table, so it is outside
  `withAudit` as every write to that table is.
- A first password signs no session out, and mails the notice.

A provider account that never sets one can still use "Forgot Password?":
following the mailed link gives it its first password the same way.

### Tests

- `tests/db/password-sign-in.test.ts`: the length rules, the 72-character
  case, the breached refusal and the prefix-only request, the check failing
  closed when the service is unreachable and when it never answers (within the
  three-second bound), the held-address answer and mail, the same 401, and
  that a sign-up earns no `canCreateWorkspace`. The range API is MSW
  (`tests/support/password.ts`), never the real service.
- `tests/db/password-reset.test.ts`, story 71 through Better Auth's real
  endpoints: the same answer for every address, the link working once and not
  after 15 minutes, every session signed out by a reset, every other one by a
  change, the rules for a new password, each notice, the current password a
  change needs, a first password set without one and refused from a session
  older than a day, and no periodic change.
- `tests/db/password-lockout.test.ts`, story 72 through the real
  `/sign-in/email`: each step of the schedule up to its ceiling, the right
  password refused in a lock and accepted after, no count switching the
  password off, the count starting over after 24 quiet hours and not before,
  the lock mail at each lock with its length, its link resetting the password
  during the lock, and no mail below a lock or for an unknown address, a lock
  that leaves another account and the same account's provider sign-in open,
  the count cleared by a sign-in, by a completed change and by a completed
  reset, a wrong current password at a change counted and a change refused
  during a lock, and a locked attempt's response compared
  whole (status, headers but `date`, body) with a wrong password's and an
  unknown address's. Each shows the guard refuses by deleting the row.
- `tests/db/passkey-sign-in.test.ts` also shows a passkey sign-in clearing the
  count and a refused one leaving it.
- `tests/modules/identity/graphql/set-password.test.ts`: the mutation's
  refusals, a stale session among them, and that it sets the caller's own
  password.
- `tests/e2e/stories/16-password.spec.ts`, story 70: the browser flow, with
  the e2e servers' stand-in for the range API
  ([`testing/e2e.md`](../testing/e2e.md), "A password sign-in in the browser"),
  and story 71: forgot, the mailed link, the reset, and signing in with the
  new password, with axe on both pages, and story 72: the fifth wrong
  password in the browser, the right one refused with the same words, and
  signing in once the row is gone.
