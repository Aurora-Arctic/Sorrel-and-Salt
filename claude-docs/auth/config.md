## Config (`src/lib/auth.ts`)

- **`BETTER_AUTH_SECRET` is required, but only at `NODE_ENV=production`** —
  `next dev` and Vitest (`NODE_ENV=test`) never need it set. This is
  `src/lib/auth.ts`'s own check, `requiredInProduction('BETTER_AUTH_SECRET')`
  (`src/lib/env.ts`), called before `betterAuth()`
  — **not** Better Auth's built-in equivalent (`validateSecret`, which is
  documented to throw under the same condition). That internal check runs
  inside an async context builder whose rejection gets swallowed somewhere
  rather than surfacing: confirmed by building and serving `/api/auth/*`
  with `BETTER_AUTH_SECRET` unset and `secret` left for Better Auth to
  resolve itself — it logs `[Error [BetterAuthError]: You are using the
default secret...]` but still answers `200`, live, using the well-known
  default secret. Not safe to depend on, hence the explicit guard — same
  "no default, no silent fallback" rule `src/db/connection.ts` applies to
  `DATABASE_URL`, scoped to production because unlike `DATABASE_URL` this
  one has a use case (local dev) where being unset is genuinely fine.
- **`next build`/`next start` always run at `NODE_ENV=production`**,
  regardless of which Vercel environment (or local/CI job) triggers them —
  Next.js sets it internally, and this repo's own `build` script pins it
  explicitly (`NODE_ENV=production next build`). So it's required wherever
  one of those actually runs: `checks.yml`'s `build` leg (`npm run
build`), `.github/workflows/playwright.yml` and `Docker/docker-compose.yaml`'s
  `e2e` service (both run `npm run build && npm run start` via
  `playwright.config.ts`'s `webServer`). It is **not** required by `app`
  (`next dev`), `devcontainer` (idle), or any CI `vitest` job — confirmed by
  running the full suite and a `next build` both ways. Each of those three
  required spots sets the same fixed, non-secret local value (same
  convention as the `sorrel`/`sorrel` Postgres credentials already there).
  Production and staging get a real value via M0.27's secrets matrix
  (`claude-docs/secrets.md`).
- **`ADMIN_BOOTSTRAP_EMAIL` is required on the same terms** (MB.60), by the
  same `requiredInProduction`, which `src/lib/primary-admin.ts` calls: unset at
  `NODE_ENV=production`, importing `src/lib/auth.ts` throws
  `ADMIN_BOOTSTRAP_EMAIL is not set`, so a deploy fails its build rather than
  running with no primary keeper. The three places above that build set the
  fixed placeholder `placeholder@admin-bootstrap.invalid` — `.invalid` is
  reserved (RFC 2606), so no sign-in can ever match it. `next dev` and Vitest
  are exempt, and unset there promotes nobody.
- **`baseURL()` resolves the right origin per request, in code, with no
  `BETTER_AUTH_URL` env var at all.** Production actually spans three real
  origins — `sorrelandsalt.com`, the fixed `staging.sorrelandsalt.com`
  alias, and one `hotfix-<slug>.sorrelandsalt.com` per open hotfix PR
  (`deploy.yml`) — and a single Vercel Preview-scoped env var can't tell
  `staging` and a hotfix preview apart, so it would leak staging's URL
  into every hotfix preview's OAuth `redirect_uri`. Better Auth's own
  `allowedHosts` (wildcard-capable, `src/lib/auth.ts`) solves exactly
  this: `['sorrelandsalt.com', 'staging.sorrelandsalt.com',
'hotfix-*.sorrelandsalt.com']`, `protocol: 'https'` (forced rather than
  trusting `x-forwarded-proto`, since `advanced.trustedProxyHeaders` isn't
  enabled), `fallback: 'https://sorrelandsalt.com'` for any other `Host`.
  Verified against a built server with `Host: staging.sorrelandsalt.com`,
  `Host: hotfix-foo-bar.sorrelandsalt.com`, and a spoofed `Host:
evil.example.com` — the first two resolve correctly, the third falls
  back to the production URL rather than being reflected into the
  redirect.
- **Outside production, a fixed `http://localhost:8000` — not Better
  Auth's own per-request default.** `next dev --hostname 0.0.0.0` (this
  repo's fixed `dev` script, every environment) computes the request's
  origin from its own bind address, not the client's `Host` header:
  confirmed by curling a running dev server with `localhost`, `127.0.0.1`,
  and a spoofed `Host` header and getting `http://0.0.0.0:8000` back every
  time, regardless. Left to Better Auth's default, every local OAuth
  `redirect_uri` would be `0.0.0.0:8000` — not `http://localhost:8000/...`,
  what's actually registered with Google/GitHub (`claude-docs/secrets.md`)
  — and sign-in would fail with `redirect_uri_mismatch`. `next dev`'s port
  is fixed at 8000 (no `PORT` override, unlike `start`), so this is safe
  to hardcode. Verified with real credentials against a running dev
  server: the resulting authorization URLs (fetched directly) show a real
  Google sign-in screen and GitHub correctly resolving the registered
  app's name and scopes — not a `redirect_uri_mismatch`/`invalid_client`
  error.
- **This doesn't make hotfix sign-in actually work.** `allowedHosts` only
  fixes what URL this app tells Google/GitHub to send a user back to —
  Google and GitHub still require that URL to be a pre-registered
  redirect URI, and a hotfix slug doesn't exist to register ahead of
  time. Real sign-in only completes on `staging` and Production;
  `claude-docs/secrets.md` covers this in more depth.
- **Stored OAuth tokens are encrypted** (`account.encryptOAuthTokens`,
  MB.76). Better Auth encrypts each provider's access and refresh token under
  `BETTER_AUTH_SECRET` as it writes the `accounts` row; the id token is stored
  as issued, since Better Auth does not encrypt it, and nothing in the app reads
  any of the three. No migration came with it: Better Auth decrypts only a value
  that looks like its own ciphertext (a `$ba$` prefix, or an even-length hex
  string) and returns anything else as it is, so a row written before the switch
  keeps reading. A plaintext token that happened to be even-length hex would
  be misread; none of the four providers' token formats is. A token
  is encrypted under the current versioned key, so a new key leaves it
  readable ("Rotating the secret", below).
- **Session lifetimes are Better Auth's defaults, pinned by test** (MB.76).
  DESIGN.md sets none, so `src/lib/auth.ts` sets none: a session lasts seven
  days, is extended at most once a day while in use, and counts as fresh for a
  day. `tests/lib/auth.test.ts` reads the resolved values off `auth.$context`,
  so a dependency bump that moves a default fails there rather than changing
  how long someone stays signed in.

### Rotating the secret

Better Auth signs cookies and links with the auth secret, and encrypts the
providers' tokens and the two-factor secrets and backup codes under it
([`two-factor.md`](two-factor.md)). Replacing the one value would make every
encrypted row unreadable, so the secret is **versioned**: `secrets` in
`src/lib/auth.ts` comes from `authSecrets()` (`src/lib/auth-secrets.ts`).

- **Unset `BETTER_AUTH_SECRETS`**, the default everywhere today:
  `BETTER_AUTH_SECRET` is version 1, and every value encrypted starts
  `$ba$1$`.
- **`BETTER_AUTH_SECRETS`**, Better Auth's own format,
  `<version>:<secret>` entries separated by commas, newest first. The first
  key signs and encrypts everything new; every listed key still decrypts what
  was written under its version. `BETTER_AUTH_SECRET`, passed as `secret`, is
  Better Auth's legacy key, read only for a value with no version: a provider
  token written before versions existed, as bare hex.

To rotate:

1. Generate the new key (`openssl rand -base64 32`).
2. Set `BETTER_AUTH_SECRETS="2:<new>,1:<old>"` in Vercel, for both
   environments, since they share the secret ([`secrets.md`](../secrets.md)).
   Leave `BETTER_AUTH_SECRET` as the old value, so
   unversioned tokens stay readable.
3. Deploy. Cookies are now signed with the new key, so **everyone is signed
   out** and signs in again; an email-verification link mailed before the
   deploy no longer verifies, since it is checked against the current key
   alone. The two-factor "Trust this device" cookies and any two-factor
   sign-in waiting for its code are signed the same way, so they are dropped
   too: everyone with two-factor on is asked for a code at their next sign-in.
   Two-factor enrolments and provider tokens keep working.
4. Retire version 1 only once no row holds a `$ba$1$` value: a person who
   turns two-factor off and on again, or a provider sign-in, rewrites theirs
   under version 2. Removing a version while rows still name it makes those
   rows unreadable, so those people must turn two-factor on again.

After a key has **leaked**, rotating is not enough: the old key still opens
every row written under it. Remove it at once and ask everyone with
two-factor on to turn it on again.

`tests/db/two-factor.test.ts` proves the procedure: an enrolment made under
version 1 still verifies with `2:<new>,1:<old>`, a new enrolment is written
`$ba$2$`, and with version 1 gone the old enrolment fails. The e2e servers
never set `BETTER_AUTH_SECRETS`.

### Deploying to staging/production

Every variable this subsystem needs, and the manual steps to set each one, is
`claude-docs/secrets.md` (M0.27) — not duplicated here. Short version:
`src/lib/auth.ts` is wired and the OAuth credentials are set (see ["Social
providers"](config.md)). `ADMIN_BOOTSTRAP_EMAIL` is set in Preview and
Production. Since MB.60 a deploy **fails its build** without it (`deploy.yml`'s
pulled-environment assertion names it first).

### The one exception to the GraphQL-only rule, and its boundary

CLAUDE.md rule 1 says every mutation and every read without a navigation goes
through `/api/graphql`. `/api/auth/*` is the one deliberate exception, and
it is narrower than it looks:

- **What it carries.** OAuth callbacks are browser redirects from Google and
  GitHub carrying query params, and the session cookie is set on an HTTP
  response — neither can travel over a GraphQL POST. `/api/auth/*` exists
  only to complete that handshake and manage the resulting session
  (sign-in, callback, sign-out, session read/refresh).
- **What it never carries.** No ingredient, workspace, spell, or compendium
  data is readable or writable through it. `src/app/api/auth/[...all]/
route.ts` does exactly one thing — hand every request straight to Better
  Auth's own handler (`toNextJsHandler(auth)`, `src/lib/auth.ts`) — and
  imports nothing from `src/modules/*/services/` or `src/graphql/`. There is no code
  path by which an auth endpoint could reach application data.
- **The rule this doesn't relax.** "Application data access" (CLAUDE.md rule 1)
  means the compendium, ingredients, and grimoire — not the protocol handshake
  that establishes who you are. Every later feature still goes through
  `/api/graphql`; nothing about this exception widens as the app grows. The two
  transports that do carry application data, and the rules that bind them, are
  [`graphql/two-transports.md`](../graphql/two-transports.md)'s "The two
  transports".

### The organization plugin is not used (MB.30)

Better Auth ships an organization plugin — organizations, members,
invitations, a last-owner guard, a creation gate — and it is **not
configured here**, deliberately. Workspaces, membership and invitations are
the hand-built `workspaces`, `workspace_members` and
`invitations` tables behind services, written through
`withAudit`, read under the `Membership` proof (DESIGN.md §5, §8). MB.30
ran the plugin against a real database before M4.1 made `workspaces` a
foreign-key target, and found the mismatch structural rather than
configurable:

- its writes bypass `withAudit` and its deletes are hard, so the audit
  spread, soft delete and rule 4's partial unique indexes cannot hold on its
  tables;
- the invitation id is the token — a plaintext primary key returned to every
  member by `getFullOrganization` and `listInvitations` — and acceptance is
  bound to the invited email with no option to relax it;
- five ways a link can be dead collapse into one `INVITATION_NOT_FOUND`, and
  the last-owner refusal carries no remedy, so the service would classify
  both itself anyway;
- it adds `active_organization_id` to `sessions`, writes it on create,
  accept and even a forbidden read, and any endpoint called without an
  explicit `organizationId` falls back to it — the session-held workspace §9
  exists to forbid;
- it mounts ~20 `/api/auth/organization/*` routes carrying workspace data,
  a third access path under rule 1 (`disabledPaths` hides them at the HTTP
  layer only, as an enumerated list).

The record with the code behind each finding is
[`design-decisions/mb.30-organization-plugin.md`](../design-decisions/mb.30-organization-plugin.md).
One byproduct worth knowing: `auth.api.*` does work inside the Vitest `db`
project given a real `sessions` row and an HMAC-signed
`better-auth.session_token` cookie (`<token>.<base64 HMAC-SHA256(secret,
token)>`); the recipe is in the record.

### Social providers (M2.4/M2.5, M2.6)

Facebook is hidden from `/sign-in` and from the account page's offer to link it (`hidden: true` on its roster entry in `src/lib/social-providers.ts`). Its registration and icons are kept, and an account that already links it still lists it so it can be removed; removing the flag brings it back.

The roster is `SOCIAL_PROVIDERS` in `src/lib/social-providers.ts`: Discord,
Google, Facebook and Microsoft, re-scoped at M2.6 (GitHub was the original
second provider and was dropped). `socialProviders()` in `src/lib/auth.ts`
registers a provider only when **both** halves of its pair are set as non-empty
strings (`clientCredentials`, `src/lib/social-providers-config.ts`), never with
an empty string, which Better Auth would treat as a configured but broken
provider rather than an absent one. The sign-in page greys out a provider that
is not configured.

What differs between the four registrations is `PROFILE`, beside the
credentials in `src/lib/social-providers-config.ts`: the profile field naming
the account (`sub`, `id`, `sub` or `id` for Facebook's two profile shapes,
`oid`), whether the provider vouches for an address, and Microsoft's tenant.
`mapProfile` in `src/lib/auth.ts` builds every `mapProfileToUser` from it
(MB.213). It is typed as one required entry per `ProviderId`, so a provider
added to the id without one fails `npm run typecheck`, and one on the roster
without an entry fails `tests/lib/provider-profiles.test.ts`; the switch it replaced had no
default, so a provider given its credentials built and never registered. A new provider is
its id, a roster entry, and the two entries the compiler then asks for, with
no edit to `auth.ts`. Facebook and Microsoft are pinned unverified on arrival (see
["First-party verification"](admin-bootstrap.md#first-party-verification-mb66)),
and Microsoft's tenant is stated as `common` so personal accounts can sign in.
Every provider's `mapProfileToUser` also stands in a placeholder for a profile
with no address (see ["The email
page"](admin-bootstrap.md#the-email-page-mb54)). MB.12 completed a real browser
sign-in with all four on staging; the credentials and the manual steps behind
them are `claude-docs/secrets.md`.

Facebook appends `#_=_` to the redirect URI it sends the browser back to, and
a fragment survives every redirect whose `Location` carries none, so it would
reach whatever page the sign-in lands on. The server never sees a fragment,
so the root layout strips exactly that one before first paint, in an inline
script beside the theme one (`src/app/pre-paint-scripts.tsx`); an in-page
anchor keeps its own.

Every e2e run confirms the route is mounted and responding, independent of
any provider being configured: `tests/e2e/database.ts` reads `/api/auth/get-session` from the worker's server each
time a spec recreates its database, and throws unless it answers 200.
