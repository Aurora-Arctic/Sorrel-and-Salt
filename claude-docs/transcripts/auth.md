# Auth — transcript

## 2026-09-11 — M2.2: Install Better Auth with the Drizzle adapter

Installed `better-auth` (1.7.4). `@better-auth/drizzle-adapter` (also 1.7.4)
came in as a transitive dependency and is what `better-auth/adapters/drizzle`
resolves to.

`@better-auth/cli` (the tool that normally generates a Drizzle schema file
from a `betterAuth()` config) is still on 1.4.x/1.5.0-beta — behind the
installed 1.7.4 core. Rather than risk a version-mismatched schema, used the
schema generator the installed `@better-auth/drizzle-adapter` bundles
internally (`generateDrizzleSchema` in its `generate-drizzle-schema-*.mjs`,
not part of its public `exports` but reachable by direct file path) as a
one-off script, run against this project's real config (`usePlural: true`,
`advanced.database.generateId: 'uuid'`). Its output included a `relations-v2`
block (`defineRelationsPart`) that isn't in the installed `drizzle-orm`
(0.45.2 only has the legacy `relations()` API) — dropped it; Better Auth's
adapter reads plain schema tables, not the relational query API, so nothing
needs it. Then hand-split the single generated file into
`src/db/schema/users.ts` (`users` alone) and `src/db/schema/auth.ts`
(`sessions`/`accounts`/`verifications`) — TASKS.md's MB.5 already names
`schema/users.ts` as where the `auditColumns` self-reference gets wired once
`users` has every column, so `users` needed its own file now rather than
a later split.

`npm run db:generate` (`drizzle-kit generate`) diffed those schema files
against the existing migration and wrote
`src/db/migrations/0001_lucky_centennial.sql` itself — the schema files are
the only hand-written part; the SQL is generated the same way every other
table's will be.

Mounted `src/app/api/auth/[...all]/route.ts` with `toNextJsHandler(auth)`;
confirmed Vitest's `include: ['src/**/*.test.{ts,tsx}']` glob does discover
a test file inside a directory literally named `[...all]` (worth confirming
since `[...]` is glob metacharacter syntax) before relying on it.

**`BETTER_AUTH_SECRET` throws at import, not just at first request** — and
`next build` traces every route while collecting page data, so an unset
secret fails the _build_, confirmed by running `npm run build` both ways.
First pass required it everywhere (`app`, `devcontainer`, every CI job) by
mirroring `connection.ts`'s unconditional guard exactly. Reworked after the
user asked to cut the duplication: scoped the requirement to
`NODE_ENV=production` instead, since that's the only condition under which
it actually matters and it's also what `next build`/`next start` always run
at — `app` (`next dev`) and Vitest (`NODE_ENV=test`) never need it. That cut
the required spots from five to three: `.github/workflows/build.yml`,
`.github/workflows/playwright.yml`, and `Docker/docker-compose.yaml`'s `e2e`
service (its `npm run build && npm run start` runs at production despite the
service's own `NODE_ENV: test`, since the `build` script's own
`NODE_ENV=production` prefix overrides that for its one process). Reverted
the `app`/`devcontainer`/`vitest.yml` additions.

Tried leaning on Better Auth's own equivalent check first (`validateSecret`,
documented to throw under the same production-only condition) instead of a
custom guard, which would have needed the value in **no** file at all
outside real deploys. Built and served `/api/auth/*` with the secret unset
and `secret` left for Better Auth to resolve itself: the build _succeeded_
and the running server answered `200` on both `/ok` and `/get-session`,
logging `[Error [BetterAuthError]: You are using the default secret...]`
but not actually blocking anything — its check runs inside an async context
builder whose rejection gets swallowed rather than surfacing. That's not a
gate that can be trusted for something like this, so kept the repo's own
synchronous, production-scoped `authSecret()` guard in `src/lib/auth.ts`
rather than deleting it, and only trimmed _where_ it's required, not
whether it exists. `build.yml` didn't previously set `DATABASE_URL` at all,
since nothing it built imported `src/db/connection.ts` until this route did.

Verified against the devcontainer's real Postgres (`postgres:5432`,
reachable despite `docker`/`make` not being installed in this shell — the
session runs as one of docker-compose's own service containers): ran
`npx drizzle-kit migrate` against `sorrel` directly, confirmed all four
tables and their column types via `information_schema`, then started
`next dev` and curled the running server —
`GET /api/auth/ok` → `200 {"ok":true}`, `GET /api/auth/get-session` →
`200 null` (a real, unauthenticated Drizzle-adapter query against the new
`sessions` table, not an error), `GET /api/graphql` → `404` (doesn't exist
yet, confirming no accidental data path). Left `sorrel`'s schema migrated —
this is what `make db-migrate` is supposed to do, not a throwaway action.

Did not touch `sorrel_template`: `claude-docs/db.md` and
`Docker/Dockerfile.postgres` are explicit that it stays schema-less until
M1.27 bakes migrations and seed into the Postgres image. This means the
Vitest `db` project can't yet run a catalogue-introspection test against
these tables — a cloned `sorrel_test_<n>` has no schema either — so
`src/app/api/auth/[...all]/route.test.ts` targets `/api/auth/ok`
specifically, Better Auth's one built-in endpoint that never touches the
database, and runs in the `unit` project instead.

## 2026-09-11 — M2.4/M2.5/M0.27: OAuth provider wiring and the secrets matrix

User asked, after the above landed, how to get auth working in staging and
production, then to actually do that work rather than just describe it, and
to open a PR for it — explicitly choosing one combined PR over separate
per-task PRs (this repo's own convention) when asked.

Added `socialProviders()` to `src/lib/auth.ts`: registers `google`/`github`
only when both halves of a client id/secret pair are non-empty env vars,
never with an empty string. Verified against a running `next dev` with fake
credentials — `POST /api/auth/sign-in/social {"provider":"google",...}`
returns a real `accounts.google.com` authorization URL with the expected
`redirect_uri=.../api/auth/callback/google`; same for GitHub, whose default
scope already includes `user:email` (satisfies M2.5's "matched by email"
criterion via Better Auth's own `accountLinking` default, not anything
added here). `src/app/api/auth/[...all]/route.test.ts` and
`src/lib/auth.test.ts` automate the same shape. **Not claiming M2.4/M2.5
done**: their real acceptance criteria ("sign-in completes on local and
staging") need an actually-registered OAuth client and a live callback
round-trip, neither possible from this session — see `claude-docs/
secrets.md` for the manual steps that unblock it.

Before writing that doc, checked Asana for M0.27 (the task it belongs to)
and found it deliberately **On Hold** since 2026-09-08, with the user's own
note explaining that writing the full matrix before Neon
branches/OAuth apps/Vercel environments exist would be speculative — almost
exactly what was about to be written. Flagged this rather than either
silently overwriting that decision or silently dropping the work; the user
chose to un-hold M0.27 and proceed. `claude-docs/secrets.md` records that
history in its own header so a future reader isn't left wondering why a
"deferred as speculative" task has a filled-in doc two days later.

The matrix itself: two tables (Vercel environment variables; GitHub Actions
repository secrets), each with a manual how-to-set section, since none of
it — Vercel dashboard, Neon console, Google/GitHub OAuth app registration,
GitHub Actions secrets — is reachable from this session. Confirmed the
last part directly: `gh secret list`/`gh variable list` both 403 against
this repo, so even the three Vercel deploy secrets the user already added
by hand (per M0.27's carve-out comment) couldn't have been set from here
either. Recorded which secrets are already set (the three deploy ones) vs.
still missing (`NEON_API_KEY`/`NEON_PROJECT_ID` and everything Vercel-side)
rather than presenting the whole matrix as uniformly undone.

## 2026-09-11 — correcting `BETTER_AUTH_URL`: no single Preview value is right

User asked what the `BETTER_AUTH_URL` values should be per environment —
a direct question about what `secrets.md` had just documented (a fixed
`Preview (staging + hotfix)` value, `https://staging.sorrelandsalt.com`).
Answering it surfaced that the doc's own recommendation was wrong: `staging`
and a hotfix preview are both `Preview`-scoped in Vercel, but a hotfix gets
its own ephemeral `hotfix-<slug>.sorrelandsalt.com` domain per open PR
(`deploy.yml`). A single Preview-scoped `BETTER_AUTH_URL` set to staging's
URL would have leaked into every hotfix preview's OAuth `redirect_uri`,
sending Google/GitHub's callback to the wrong origin.

Fixed properly rather than just correcting the doc: Better Auth's `baseURL`
option supports a dynamic config (`allowedHosts`, wildcard-capable, plus a
`fallback` and `protocol`) built for exactly this "one app, several real
domains" shape. Added `baseURL()` to `src/lib/auth.ts`, scoped to
`NODE_ENV=production` only (same reasoning as `authSecret()`) —
`allowedHosts: ['sorrelandsalt.com', 'staging.sorrelandsalt.com',
'hotfix-*.sorrelandsalt.com']`, `protocol: 'https'` (forced explicitly
rather than trusting `x-forwarded-proto`, since
`advanced.trustedProxyHeaders` isn't enabled), `fallback:
'https://sorrelandsalt.com'`. This removes `BETTER_AUTH_URL` as an env var
entirely — nothing to set in Vercel for it.

Verified against a real built-and-started server (`npm run build && npm run
start`, `NODE_ENV=production`), curling `/api/auth/sign-in/social` with a
spoofed `Host` header for each case: `sorrelandsalt.com` and
`staging.sorrelandsalt.com` resolved correctly, `hotfix-foo-bar
.sorrelandsalt.com` matched the wildcard correctly, and an untrusted `Host:
evil.example.com` fell back to the production URL rather than being
reflected into the OAuth `redirect_uri` — the actual security property
`allowedHosts` exists for, not just a config nicety. Caught one real bug in
the process of that verification: the first attempt still showed `http://`
in the redirect after adding `protocol: 'https'`, traced to a stale
`next start` process left running from an earlier build on the same port,
serving old code — killed by PID and re-verified against a fresh
build+start to confirm the fix actually took effect.

**Still true regardless of this fix**: a hotfix preview can't complete a
real Google/GitHub sign-in, because both require a pre-registered redirect
URI and a hotfix slug doesn't exist to register ahead of time.
`allowedHosts` only makes this app's own half of that handshake correct
and safe against Host header spoofing — it can't make an external OAuth
provider accept a URI it was never told about. Documented as a real,
permanent limitation in `claude-docs/secrets.md`, not something to fix
later.

Updated `src/lib/auth.test.ts` (asserts `baseURL()` is `undefined` outside
production and resolves to the exact allowedHosts/fallback/protocol object
at `NODE_ENV=production`), `claude-docs/auth.md`, and `claude-docs/secrets
.md` (removed the `BETTER_AUTH_URL` row, added the branch-scoped
`DATABASE_URL` override detail from `design-decisions/m1.1-neon-branch
-strategy.md` while in there, since the Vercel table was already wrong
about that row treating `staging`/hotfix identically too).

## 2026-09-11 — CI catches a real gap: the sign-in test needed schema

User set the real Google/GitHub OAuth credentials and Vercel env vars per
the walkthrough above, then asked to check what's checkable from here.
`gh pr checks 71` turned up a genuine failure — `vitest` — that hadn't
shown up locally: `POST /api/auth/sign-in/social redirects to the real
Google authorization URL...` returned `500`, not `200`.

The CI job's own Postgres service log had the answer directly: `ERROR:
relation "verifications" does not exist`. That test's endpoint isn't
side-effect-free the way `/ok` is — Better Auth's `signInSocial` persists
a `verifications` row (PKCE state) before it ever returns the redirect
URL, so it needs the migration's schema actually applied. It passed
locally purely by accident: this session had run `npx drizzle-kit migrate`
against its own local `sorrel` database hours earlier (to verify the
migration itself), so that table happened to exist here. CI's `sorrel` has
no such history — and more fundamentally, `unit`-project tests (this one
included) run against the plain `sorrel` database, not a per-worker
`sorrel_test_<n>` clone (only `db`-project tests get that rewrite, via
`src/test/db-setup.ts`'s `setupFiles`), so there's no clone-from-template
step to even consider baking schema into for this one.

This is the exact gap already documented for db-project introspection
tests (`sorrel_template` has no schema until M1.27) — just missed at
write time because the endpoint didn't look like a "database test" the
way querying `information_schema` obviously would. Removed the test
rather than working around it (e.g. mocking the adapter): the config
wiring it was partially redundant with is already covered by
`socialProviders()`'s tests, and the actual authorization-URL shape was
already verified by hand in the M2.4/M2.5 pass above and recorded here,
not just asserted in a test that couldn't reliably run. Confirmed the fix
by running the full suite and `pre-commit` locally before pushing again.

## 2026-09-11 — real credentials expose a second bug: `next dev` lies about its own origin

User added the real Google/GitHub credentials from the walkthrough to
`.env.local` and asked to check what's checkable. Beyond the CI fix
above, ran a real `next dev` locally with those credentials and hit
`/api/auth/sign-in/social` for both providers — the `redirect_uri` in
each response came back as `http://0.0.0.0:8000/api/auth/callback/...`,
not `http://localhost:8000/...`, the value actually registered with
Google/GitHub per the walkthrough. That mismatch would fail as
`redirect_uri_mismatch` the moment anyone tried a real interactive
sign-in.

Isolated the cause before trusting it: curled the same endpoint via
`localhost:8000`, `127.0.0.1:8000`, and with an explicit spoofed `Host:
totallyfakehost:9999` header — all three produced the identical
`0.0.0.0:8000` `redirect_uri`. That rules out anything client-controlled;
`next dev --hostname 0.0.0.0` (this repo's fixed `dev` script, used
identically by the bare devcontainer and every docker-compose variant)
computes the request's origin from its own bind address rather than the
incoming `Host` header at all. Confirmed this is specifically the
_undefined-baseURL_ code path (`getOrigin(request.url)` in Better Auth's
`getBaseURL`) by noting the earlier `NODE_ENV=production` verification
never hit this bug — that path uses the _dynamic_ `allowedHosts` config,
which reads the `Host` header directly and had already been confirmed
correct against real and spoofed hosts.

Fixed by giving `baseURL()` an explicit branch for non-production too,
instead of returning `undefined` and trusting Better Auth's own
derivation: a hardcoded `'http://localhost:8000'`, safe because `next
dev`'s port is fixed (no `PORT` override in that script, unlike `start`).
Re-verified against a fresh dev server: `redirect_uri` now correctly reads
`localhost:8000` for both providers. Went one step further than curling —
fetched the real, live Google and GitHub authorization URLs directly
(`WebFetch`) to check whether the providers themselves accept the
`client_id`/`redirect_uri` pair: Google renders a genuine sign-in screen
with no `redirect_uri_mismatch`/`invalid_client` error; GitHub correctly
resolves the `client_id` to "Sorrel & Salt (local)" requesting `read:user
user:email` and shows its normal login form — the "error while loading"
text on that page is GitHub's generic no-JS fallback banner (`WebFetch`
doesn't execute JavaScript), not an OAuth-specific rejection, and an
invalid client or redirect URI would have shown a 404 or an explicit
"redirect_uri is not associated with this application" instead. This is
the strongest verification possible without a real browser completing an
actual login and consent screen.

Updated `src/lib/auth.test.ts`'s "outside production" case to assert the
new fixed value instead of `undefined`, and `claude-docs/auth.md`'s
`baseURL()` bullet to match. `claude-docs/secrets.md`'s local redirect URI
guidance (`http://localhost:8000/api/auth/callback/{provider}`) turns out
to have been correct all along — it was the code, not the doc, that had
been wrong.
