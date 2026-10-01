## Config (`src/lib/auth.ts`)

- **`BETTER_AUTH_SECRET` is required, but only at `NODE_ENV=production`** —
  `next dev` and Vitest (`NODE_ENV=test`) never need it set. This is
  `src/lib/auth.ts`'s own `authSecret()` check, called before `betterAuth()`
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
- **`ADMIN_BOOTSTRAP_EMAIL` is required on the same terms** (MB.60): unset at
  `NODE_ENV=production`, importing `src/lib/auth.ts` throws
  `ADMIN_BOOTSTRAP_EMAIL is not set`, so a deploy fails its build rather than
  running with no primary admin. The three places above that build set the
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
  be misread; none of the four providers' token formats is. Rotating the
  secret makes every stored token unreadable; the next sign-in with each
  provider writes a fresh one.
- **Session lifetimes are Better Auth's defaults, pinned by test** (MB.76).
  DESIGN.md sets none, so `src/lib/auth.ts` sets none: a session lasts seven
  days, is extended at most once a day while in use, and counts as fresh for a
  day. `tests/lib/auth.test.ts` reads the resolved values off `auth.$context`,
  so a dependency bump that moves a default fails there rather than changing
  how long someone stays signed in.
