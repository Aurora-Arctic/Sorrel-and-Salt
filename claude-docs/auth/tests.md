## Tests

The test files own what each case asserts. This page keeps the harness rules
that are not visible from one file.

- **`/api/auth/[...all]` has no Vitest test.** It hands every request to Better
  Auth, and every e2e run proves it is mounted: `tests/e2e/database.ts` reads
  `/api/auth/get-session` from the worker's server each time a spec recreates
  its database and throws unless it answers 200.
- **No automated test for the sign-in redirect.** `POST /api/auth/sign-in/social`
  persists a `verifications` row (PKCE state) before redirecting, so it needs a
  real schema. A `unit` test reads the plain `sorrel` database, not the
  per-worker `sorrel_test_<n>` clone, which only the `db` project gets
  ([`../testing/where-tests-live.md`](../testing/where-tests-live.md)). The
  redirect shape (authorization URL, PKCE parameters, callback path per
  environment) was verified by hand against a running server, and the
  ["Config" section](config.md) records what that established.
- **`tests/lib/auth.test.ts` imports `@/lib/auth` per test**, with
  `vi.resetModules()` and `vi.stubEnv()`: ESM caches a module, including one
  that threw during evaluation, so reusing one import across cases would replay
  the first result instead of evaluating against new env vars.
  `tests/lib/impersonation.test.ts` does the same, since the env is what each of
  its cases varies.
- **`@/lib/auth` once per file whose env does not change.** The integration
  files that drive `auth.handler` (`tests/db/` account-linking, email-change,
  email-verification, sign-in-landing, last-login-method, oauth-token-encryption
  and impersonation, and
  `tests/modules/identity/services/{admin-role,provisional-accounts}.test.ts`)
  build Better Auth once, in `beforeAll`, through `tests/support/auth-module.ts`'s
  `importAuth(env)`: `vi.resetModules()`, the env applied for the import alone,
  `import('@/lib/auth')`, the env restored. The module reads its secret,
  provider credentials (`PROVIDER_CREDENTIALS` in `tests/support/oauth.ts`),
  origin, limiter and impersonation flags at import, so the `beforeAll` states
  the whole env the file runs under. `ADMIN_BOOTSTRAP_EMAIL` is read per
  request, so a test that varies it stubs it where it varies and needs no
  second import.
- **OAuth round trips** go through `auth.handler` and `tests/support/oauth.ts`,
  with MSW standing in for each provider's token and profile endpoints. Google's
  and Microsoft's id tokens are unsigned, which is safe to fake because both
  decode the token from their own token endpoint without re-verifying it. Give
  each refusal case one field that differs from a promoting case, so it is the
  rule refusing and not a mismatched address.
- **`tests/modules/identity/services/admin-role.test.ts`** makes every user on
  `@primary-admin.test` and deletes them before each test, since the harness
  re-clones per file, not per test.
- **`tests/db/email-verification.test.ts`** mocks `@/lib/mail`. Each stamp
  assertion first hands `updated_by` to the bootstrap user, because the create
  hook already stamps a new row as itself.
- **`tests/db/rate-limiting.test.ts`** runs at `NODE_ENV=production` with
  Vitest's `TEST` cleared, stubbed before the first import: Better Auth reads
  `NODE_ENV` once as it loads, and with either left as Vitest sets it, an
  unresolved address is taken for `127.0.0.1`.
- **`tests/db/last-login-method.test.ts`** asserts first whether the session
  cookie was set in each case, since that is what the plugin keys on.
- **Users-schema tests live under `tests/modules/identity/schema/`, not beside
  the schema**: a `*.test.ts` in the schema directory is swept into
  `drizzle.config.ts`'s `schema` glob, and `drizzle-kit generate` fails trying
  to `require()` a file that imports Vitest.
- **`tests/db/audit-columns.test.ts`** reads `accounts`, `sessions` and
  `verifications` from the catalogue as its named counter-example: the three
  tables that carry `updated_at` and no audit id, and so no trigger.
- **`requireSession()` has no end-to-end test until a page calls it.** A forged
  cookie passes the proxy by design, and only a real page can show the
  database-backed check refusing it. That page's PR signs in with a `sessions`
  row plus a signed cookie (`signInAs()` in `tests/e2e/session.ts`), into the
  calling worker's own slot database, which no other worker's reseed touches.
- **Stories 1 and 2** are browser flows in
  `tests/e2e/stories/01-accounts.spec.ts`, tagged `@story-1` and `@story-2`
  ([`../testing/acceptance.md`](../testing/acceptance.md), "Acceptance").
