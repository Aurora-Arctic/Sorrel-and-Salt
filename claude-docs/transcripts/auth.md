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
