# MB.74 — Better Auth's plugin roster: what lands before launch, what waits

**Decided 2026-09-27.** Scoping only; nothing here is built. Better Auth ships
about twenty-five plugins. This record says, for each, whether it lands before
launch, waits for v2, or is never used here. Two had been decided already and
are unchanged: the `organization` plugin is not used
([`mb.30-organization-plugin.md`](mb.30-organization-plugin.md)), and the
`admin` plugin is registered outside production for impersonation alone, with
every other endpoint unreachable (MB.53,
[`m2.9-granting-admin.md`](m2.9-granting-admin.md)).

The outcome is four follow-up tasks and one change to §13:

- **MB.75 and MB.76** pin the rate limiter Better Auth already runs, which is
  on in every deploy and counts per instance. MB.76 also turns on encryption
  of the stored OAuth tokens and pins the session lifetimes.
- **MB.77** marks the provider a browser last signed in with on the sign-in
  page.
- **MB.78** registers the OAuth proxy on previews, so a hotfix preview can
  complete a real sign-in.
- **Passkeys become the v2 first-party credential** in DESIGN.md §13, in
  place of email and password.

The approved plan that produced this record is beside it as
[`mb.74-plan.md`](mb.74-plan.md).

## The frame

The site signs in through four OAuth providers and nothing else, and it is
invite-gated: an account earns nothing until an invitation or an admin grants
it (DESIGN.md §2, §8). Most of Better Auth's roster exists to secure a
credential the site holds itself, such as a password or a mailed code, or to
serve a client that is not a browser. This app has neither. So each plugin has
to earn its place against a rule that already excludes it, and against two
architecture rules:

- **Rule 1.** Every plugin mounts routes under `/api/auth/*`, the one path
  outside `/api/graphql`. That exception covers establishing identity, not
  application data.
- **Rule 3.** A plugin writes through Better Auth's adapter, outside
  `withAudit`. That is acceptable for Better Auth's own adapter tables
  (`sessions`, `accounts`, `verifications`), which carry no audit spread, and
  not for anything that is application data.

## Where things stand

Everything below was read from the installed Better Auth, `1.7.5`, in
`node_modules/better-auth/dist` and `node_modules/@better-auth/core/dist`,
not from its documentation.

- **No plugin is registered.** `src/lib/auth.ts` has no `plugins` key and
  `src/lib/auth-client.ts` none either. The one import from a plugin module is
  `createAccessControl` from `better-auth/plugins/access`, which is a helper
  and not a plugin (M6.3).
- **The rate limiter is already on in every deploy.**
  `context/create-context.mjs` defaults `rateLimit.enabled` to
  `NODE_ENV === 'production'`, which every Vercel build is, staging and hotfix
  previews included (`auth.md`, "Config"). Its storage defaults to `memory`, a
  module-level `Map` in `api/rate-limiter/index.mjs`, so on Fluid Compute each
  function instance counts alone. The built-in rules give sign-in paths 3
  requests per 10 seconds and `/send-verification-email` 3 per 60 seconds,
  keyed on client IP and path. Nothing in the repo configures or pins any of
  it.
- **An unresolved client IP collapses every visitor into one bucket.**
  `getIP` in `@better-auth/core/dist/utils/ip.mjs` reads `x-forwarded-for`
  unless told otherwise, and trusts it only when it holds a single address or
  when `advanced.ipAddress.trustedProxies` is set. Otherwise it returns
  `null`, and the rate limiter keys the request as `no-trusted-ip|<path>`,
  logging a warning once. On `/sign-in/social` that would be three sign-ins
  per ten seconds for the whole site. Whether it happens depends on what
  Vercel sends, which nobody has checked.
- **Database storage for the limiter is built in.** `storage: 'database'`
  uses a `rateLimit` model (`key` unique, `count`, `lastRequest` as a bigint of
  milliseconds), increments it atomically through the adapter's
  `incrementOne`, and prunes expired rows in the background. The Drizzle
  adapter implements `incrementOne`. The table does not exist yet.
- **OAuth tokens are stored in plaintext.** `accounts` holds each provider's
  access, refresh and id tokens as the provider issued them.
  `account.encryptOAuthTokens`, off by default, encrypts them under
  `BETTER_AUTH_SECRET`. `oauth2/utils.mjs` decrypts only a value that looks
  encrypted, so rows written before the switch keep reading. Nothing in the app
  reads these tokens.
- **Two-factor never challenges an OAuth sign-in.** The plugin's `after` hook
  in `plugins/two-factor/index.mjs` matches only `/sign-in/email`,
  `/sign-in/username` and `/sign-in/phone-number`. Registered today it would
  add a `two_factors` table and a `users.two_factor_enabled` column and
  protect nothing.
- **Last-login-method is a cookie unless told otherwise.**
  `plugins/last-login-method/index.mjs` sets a readable, non-`httpOnly` cookie
  holding the provider id whenever a response sets the session cookie, which
  for this app is `/callback/:id`. It writes to the database only with
  `storeInDatabase`, which would add `users.last_login_method`.
- **The OAuth proxy can serve a preview through a fixed callback.**
  `plugins/oauth-proxy/index.mjs` rewrites a sign-in started on a preview so
  the provider calls back to a fixed `productionURL`. That deployment exchanges
  the code, encrypts the profile and tokens with the shared secret, and
  redirects to the preview's `/callback/:id/oauth-proxy`, which creates the
  user and session there. The redirect target must be a trusted origin, and
  `getTrustedOrigins` in `context/helpers.mjs` derives trusted origins from
  `baseURL.allowedHosts`, which already names `hotfix-*.sorrelandsalt.com`.
  The payload expires after 60 seconds by default.
- **Hotfix previews cannot sign in today.** Every provider requires an exact
  redirect URI registered in advance, and a hotfix slug does not exist until
  its PR does (`secrets.md`, "Hotfix previews still can't complete a real
  sign-in with any provider"). That also leaves MB.53's impersonation unusable
  on a hotfix preview, since an admin has to sign in before they can
  impersonate anyone.
- **Passkeys, SSO, API keys and the OIDC provider are separate packages.**
  None ships in `better-auth` 1.7.5 and none is installed.
  `@better-auth/passkey` is at 1.7.6 and declares `better-auth ^1.7.6` as a
  peer, so adopting it means a core bump.
- **Better Auth's own account deletion is a hard delete.** `/delete-user` in
  `api/routes/update-user.mjs` calls `internalAdapter.deleteUser`, then
  deletes the user's sessions.

## The approaches

Each family is weighed against what it would protect or enable here.

### Rate limiting

**A. Leave it as shipped.** Memory storage, IP from `x-forwarded-for`.

- **Failure: it limits almost nothing.** Each Fluid Compute instance keeps its
  own count, so a burst spread across instances passes, and a cold instance
  forgets.
- **Failure: the fallback is an outage.** If Vercel's header ever carries more
  than one address, every visitor shares one bucket per path.

**B. Keep memory storage, pin the IP header.** Set `ipAddressHeaders` from a
real deployed request and test that the fallback is unreachable.

- **Cost:** fixes the outage and leaves the counting per instance.

**C. Database storage.** A `rate_limits` table owned by Better Auth's adapter,
plus B's header pin.

- **Cost: one read and one write per `/api/auth/*` request.** Those requests
  are a sign-in, a callback, a session read, a resend. The session read is the
  frequent one, and it already costs a query.
- **What it buys:** one count across every instance.

**Resolved: C.** The table is Better Auth's, like `sessions`, so it carries no
audit spread and no `set_updated_at` trigger (`auth.md`, "Tables"). It lands
alone first, as MB.75, under the table-then-behaviour convention, and MB.76
turns it on.

### Sign-in convenience

**`lastLoginMethod`, cookie only: adopt.** The sign-in page answers
`account_not_linked` with one sentence: sign in the way you did before, then
add this provider under Account (MB.71). It cannot say which way that was,
because the server naming the provider would confirm the address has an
account. The browser's own cookie can say it, and it reveals nothing the
browser did not already know. No schema, no query. `storeInDatabase` stays
off, since it would add a column for nothing a page reads. MB.77.

**`oneTap`: reject.** It loads Google's script on the public `/` to make
sign-up frictionless, which an invite-gated site does not want.

**`multiSession`: reject.** Several signed-in accounts per browser. One
address is one account (M2.9) and no story asks to switch.

### Preview sign-in

**`oAuthProxy`, on previews only: adopt.** Registered only at
`VERCEL_ENV=preview`, with `productionURL` set to staging's origin, which
already has registered redirect URIs. It is gated the way MB.53 gates the
`admin` plugin: at production, and locally, the plugin is never constructed,
so its endpoint is absent rather than refusing. MB.78.

- **Cost: the app's callback hooks do not run on the preview side.** The
  preview completes on `/callback/:id/oauth-proxy`, and `src/lib/auth.ts`
  matches `ctx.path === '/callback/:id'` for the provisional-account sweep and
  for the primary-admin promotion. On a preview that means no sweep and no
  promotion at sign-in. The sweep is housekeeping and runs on staging's side
  of the same callback anyway. Promotion at verification still works. MB.78
  decides whether either hook should also match the proxy path, from running
  code.
- **Cost: tokens transit staging.** The profile and tokens are encrypted under
  the Preview secret, which staging and every hotfix preview share already
  (`secrets.md`), and expire in a minute.
- **What it buys:** a hotfix preview a person can sign in to, and so an
  MB.53 impersonation that works where it is meant to. MB.78 lands
  immediately before MB.53.

### A first-party credential

**Passkeys: v2, and they replace email and password in §13.** §13 keeps email
and password out because a password needs a reset, and a reset is a backdoor
into any account. A passkey is a credential the site holds with no password
and no reset: someone who loses their device signs in through their provider
and enrols another. What it would need: `@better-auth/passkey` and a core
bump to match, a `passkeys` adapter table, an enrol control on MB.71's
`/account` page, and the understanding that a passkey is bound to its origin,
so staging's and production's are distinct.

**Magic link and email OTP: v2, behind passkeys.** Each is a sign-in for
someone who has none of the four providers, over MB.65's mail transport, with
the token or code stored hashed (`storeToken: 'hashed'`, `storeOTP:
'hashed'`). One interaction to settle first: a user who signs in by mail has
no `accounts` row, and MB.67's sweep treats a row with no `accounts` row as
unsweepable. `emailOTP` could also replace MB.66's link with a code typed into
`/account/email`, which is session-bound by construction; MB.66 is built and
its session check does the same job, so that is not worth reopening.

**Email and password: stays v2, and passkeys make it unnecessary.** §13's
reasoning stands for passwords. It no longer argues for a password as the only
way to have a first-party credential.

**Two-factor, `captcha` and `haveIBeenPwned`: only if email and password
lands.** Two-factor challenges password sign-ins only, and every provider
already offers its own; a passkey is phishing-resistant multi-factor on its
own. `captcha` and `haveIBeenPwned` default to password endpoints, and
invite-gating means a bot that signs up earns nothing. Site-wide bot control,
if it is ever needed, is the platform's: Vercel's WAF, already in
`backlog.md`.

### Other clients and tokens

**`jwt`: reject.** It does not replace the session cookie; it issues a token
beside it, at `/token` and in a `set-auth-jwt` header, for a separate service
to verify against a JWKS endpoint. This app has no such service. Its one
mode that stands in for the cookie, `sessionCookieCache`, requires
`session.cookieCache.strategy = 'jwt'`, and MB.59 pins the cookie cache off so
that a revoked admin is refused on their next request rather than after a
cache lifetime. The cookie plus one session read per request is the cost that
buys that.

**`bearer`: reject.** It rewrites an `Authorization` header into the same
session cookie, so it grants nothing a `Cookie:` header does not (MB.73).

**`oneTimeToken`, `deviceAuthorization`, `oauthPopup`: reject.** Each serves a
client that is not this app's one cookie-authenticated browser client per
origin.

### Account deletion

**Better Auth's `user.deleteUser`: reject.** It hard-deletes the `users` row.
Every `created_by` and `updated_by` in the schema references `users.id` with
no `ON DELETE` action (`src/db/audit.ts`), so the delete fails for anyone who
has written a single row, and succeeds only for a user who never did
anything. Soft-deleting instead is not safe either, for the reason MB.67
found: Better Auth finds a user by address with no `deleted_at` filter, so a
verified tombstone would take an implicit link from any provider vouching for
its address and bring the account back.

If v2 adds account deletion, it is a service of our own under `withAudit`:

- tombstone the `users` row, so every row it authored keeps its author;
- rewrite its email to `<id>@deleted.invalid`, which can never be mailed or
  matched, so no sign-in finds it;
- hard-delete its `accounts` and `sessions` rows, Better Auth's adapter
  tables, which cascade already;
- refuse the primary admin (MB.59).

No task is minted: v1 has no deletion story.

### Everything else

- **`username`, `phoneNumber`, `siwe`:** other sign-in schemes, each with its
  own columns. None fits OAuth-only.
- **`anonymous`:** a `users` row and a session for a visitor, so work done
  before signing up can be kept. Not a sign-in scheme this site wants, and
  not what a public read needs: MB.80 weighed it against the public
  compendium and declined it for v1. It is v2's try-before-sign-up
  (DESIGN.md §13) if that is ever wanted.
- **`genericOAuth`:** the mechanism for a provider outside Better Auth's
  built-in roster. Worth knowing; no such provider is wanted.
- **`openAPI`:** a reference page for `/api/auth/*`. The API a developer
  explores is GraphQL, and MB.73 serves Altair for it.
- **`customSession`:** reshapes `/get-session`. The app reads the session
  through `auth.api.getSession` and maps it itself (`src/lib/request-session.ts`).
- **`admin`** beyond MB.53's two endpoints, and **`organization`:** decided
  already, unchanged.
- **`@better-auth/stripe`:** weighed on its own, against the subscriptions the
  owner means to charge, by MB.79. v2 and not yet adopted; DESIGN.md §13's
  "Subscription billing" carries its fit.

## Decision

**Adopted before launch:**

| Task  | What                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------- |
| MB.75 | The `rate_limits` table, Better Auth's own                                                                 |
| MB.76 | Database-backed rate limiting, a pinned client-IP header, OAuth token encryption, session lifetimes pinned |
| MB.77 | `lastLoginMethod`, cookie only, marked on the sign-in page                                                 |
| MB.78 | `oAuthProxy` at `VERCEL_ENV=preview` only, so hotfix previews complete a sign-in                           |

**v2, in this order:** passkeys, then magic link or email OTP. Two-factor,
`captcha` and `haveIBeenPwned` only if email and password ever lands. The
Stripe plugin is v2 as well, decided separately by MB.79 and left to a
test-mode spike. `anonymous` is v2 too, only if try-before-sign-up is wanted
(MB.80, DESIGN.md §13).

**Never here:** `jwt`, `bearer`, `oneTimeToken`, `deviceAuthorization`,
`oauthPopup`, `multiSession`, `oneTap`, `username`,
`phoneNumber`, `siwe`, `genericOAuth`, `openAPI`, `customSession`, Better
Auth's `user.deleteUser`, and the `admin` and `organization` plugins beyond
what MB.53 and MB.30 already decided.

**The session lifetimes are pinned as they are.** DESIGN.md sets none, so
Better Auth's defaults apply: a session lasts seven days, is extended once a
day while in use, and counts as fresh for a day. MB.76 pins them by test
beside MB.59's `cookieCache` pin, so a dependency bump that moves a default
fails a test rather than changing how long someone stays signed in.

## Out of scope

- **Building any of it.** Each follow-up is its own task.
- **A shared cache for rate limiting** such as Upstash Redis through
  `secondaryStorage`. The database is already there; a second store is a
  second dependency for a site sending a few sign-ins a day.
- **Rate limiting `/api/graphql`.** Better Auth's limiter covers only
  `/api/auth/*`. GraphQL's protections are graphql-armor's (M3.3).
- **Vercel's WAF.** Stays in `backlog.md`.

## The follow-up

MB.75 through MB.78, written into `TASKS.md` with their acceptance criteria.

- **MB.75, MB.76 and MB.77 close Wave 7**, after MB.71. MB.75 before MB.76 is
  the table-then-behaviour rule. MB.77 follows MB.71 because its mark answers
  the sentence MB.71 writes.
- **MB.78 lands in Wave 8 immediately before MB.53**, whose impersonation it
  makes usable on hotfix previews.
- **DESIGN.md §13** names passkeys as the v2 first-party credential, and §14
  records this decision.
