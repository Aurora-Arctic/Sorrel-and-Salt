## Tests

- `tests/app/api/auth/[...all]/route.test.ts` — calls the exported `GET`
  against `/api/auth/ok` and asserts a real `200`/`{ ok: true }`, not a 404.
  Chosen specifically because it's the one built-in endpoint that never
  touches the database, so it exercises real route mounting without needing
  Postgres.
- `tests/lib/auth.test.ts` — asserts importing `@/lib/auth` throws when
  `BETTER_AUTH_SECRET` is unset at `NODE_ENV=production`, and doesn't
  throw when unset outside it; asserts `socialProviders()` registers a
  provider only once both its client id and secret are set; asserts
  `baseURL()` is the fixed `http://localhost:8000` outside production and
  resolves to the exact `allowedHosts`/`fallback`/`protocol` config at
  `NODE_ENV=production`.
  Uses `vi.resetModules()`/`vi.stubEnv()` throughout: ESM caches a module
  (including one that threw during evaluation) after its first import, so
  reusing one `import('@/lib/auth')` across cases in the same test file would
  otherwise replay the first result instead of re-evaluating against new
  env vars.
- **`@/lib/auth` once per file whose env does not change (MB.188).** The
  integration files that drive `auth.handler` — `tests/db/` account-linking,
  email-change, email-verification, sign-in-landing, last-login-method,
  oauth-token-encryption and impersonation, and
  `tests/modules/identity/services/{admin-role,provisional-accounts}.test.ts`
  and `tests/acceptance/08-email-and-admin.test.ts` — build Better Auth once,
  in `beforeAll`, through `tests/support/auth-module.ts`'s
  `importAuth(env)`: `vi.resetModules()`, the env applied for the import
  alone, `import('@/lib/auth')`, the env restored. The module reads its
  secret, provider credentials (`PROVIDER_CREDENTIALS` in
  `tests/support/oauth.ts`), origin, limiter and impersonation flags at
  import, so the `beforeAll` states the whole env the file runs under.
  `ADMIN_BOOTSTRAP_EMAIL` is read per request, so a file or test that varies
  it stubs it where it varies and needs no second import. `tests/lib/auth.test.ts`
  and `tests/lib/impersonation.test.ts` still import per test, since the env
  is what each of their cases varies.
- **`tests/lib/auth.test.ts` (M2.3, MB.60 additions)** — asserts `role` and
  `canCreateWorkspace` are registered with `input: false`; calls
  `databaseHooks.user.create.before` directly (no real Better Auth request, no
  database) to assert a new user is stamped as its own `createdBy`/ `updatedBy`
  and that `role` stays `undefined` even for the address `ADMIN_BOOTSTRAP_EMAIL`
  names; asserts the import throws on an unset `ADMIN_BOOTSTRAP_EMAIL` at
  `NODE_ENV=production` and does not outside it; and pins [the three
  options](admin-bootstrap.md#promotion-at-first-party-verification-mb68) off,
  with all four providers registered so the per-provider check cannot pass on an
  empty list.
- **`tests/modules/identity/services/admin-role.test.ts` (MB.60)** — `promotePrimaryAdmin`'s
  outcomes against the database, then the whole round trip through
  `auth.handler`: `POST /sign-in/social`, then `GET /callback/:id` with
  MSW standing in for each provider's token and profile endpoints (Google's
  and Microsoft's id tokens are unsigned, which is safe to fake because both
  decode the token they got from their own token endpoint without
  re-verifying it). Each refusal differs from a promoting case in one field,
  so it is the provider rule refusing and not a mismatched address. Every
  user it makes is on `@primary-admin.test`, deleted before each test, since
  the harness re-clones per file, not per test.
- **`tests/lib/auth.test.ts` (MB.66 additions)** — pins every
  `emailVerification` value, `requireLocalEmailVerified` at its default, no
  provider requiring verification. The Facebook and Microsoft mappers' pin went
  in MB.188: `tests/db/email-verification.test.ts`'s "which providers vouch"
  is their behaviour, and the placeholder mapping test keeps the rest.
- **`tests/db/email-verification.test.ts` (MB.66)** — the same
  `auth.handler` round trip, through `tests/support/oauth.ts` (shared with
  the admin-role test), with `@/lib/mail` mocked. A sign-up mails once and
  signs in; the mailed link verifies from the owner's session and is refused,
  row unchanged, from none or another user's, and the same link then
  succeeds from the owner's session, so the refusal was the session's. Each
  stamp assertion first hands `updated_by` to the bootstrap user, because
  the create hook already stamps a new row as itself. MB.68 adds the
  promotion's wiring: a Microsoft-only owner is promoted by following the
  link from their own session, and a change link to the bootstrap address,
  minted by hand, is sent to sign-in from no session with the row unchanged,
  then swaps the address and promotes from the row's own session. The link's
  refusals are the file's own "following the link" cases, and which address
  promotes is `tests/modules/identity/services/admin-role.test.ts`'s, which
  covers `promotePrimaryAdminAtVerification`'s outcomes directly (MB.188).
- **The email page (MB.54, MB.111, MB.113)** —
  `tests/modules/identity/services/email.test.ts` (the service, with a fake
  sender), `tests/modules/identity/graphql/set-email.test.ts` (the
  mutation's `next` reaching the sender, and its `VALIDATION` on the wire), `tests/db/email-change.test.ts`
  (the whole round trip through Better Auth's endpoints, the one-a-minute
  resend and the change and resend links' landings; that a change leaves a
  verified account outside the sweep is `email.test.ts`'s untouched row and
  `provisional-accounts.test.ts`'s never-swept verified row), `tests/db/email-verification.test.ts`
  (the sign-up link's landing and its refusals), `tests/lib/account-email.test.ts`
  (`verifiedLanding` and `returnPathOf`), `tests/lib/auth.test.ts` (the
  placeholder mapping), `tests/app/account/email/page.test.tsx` (where
  Continue goes, by `next` or by role), `tests/db/sign-in-landing.test.ts`
  (the callback's landing, the email page's and the sign-up link's, by role
  and by return path), and `tests/acceptance/08-email-and-admin.test.ts`
  (stories 58 and 59).
- **`tests/db/account-linking.test.ts` (MB.71)**: `/link-social` and
  `/unlink-account` through `auth.handler`, on `tests/support/oauth.ts`'s
  `link` helper. A Microsoft profile reporting `email_verified: false` links
  to the signed-in Discord user, and a later Microsoft sign-in lands there. The
  guard is the same profile at a plain sign-in over that verified row, refused
  with `account_not_linked`. It fails with the vouch made unconditional, so it
  is the pin that refuses. The file also covers a link naming another user
  in its body and landing under another user's session, which still attaches
  to its starter; `/link-social` with no session; and unlinking. A removed
  provider is refused again, the last one survives, and a stranger holding
  two providers cannot remove the owner's. The different-address link and the
  last-provider refusal are `allowDifferentEmails` and `allowUnlinkingAll`
  in behaviour, so `tests/lib/auth.test.ts` no longer pins either (MB.188);
  it still pins `trustedProviders` empty, which this file proves for
  Microsoft alone. `tests/e2e/account.spec.ts` scans `/account` signed in (`tests/e2e/session.ts`).
- **`tests/db/rate-limiting.test.ts` (MB.76)**: `/sign-in/social` through
  `auth.handler` at the staging origin, at `NODE_ENV=production` with Vitest's
  `TEST` cleared. Better Auth reads `NODE_ENV` once, as it loads, so the stub
  precedes the first import; with either left as Vitest sets it, an unresolved
  address is taken for `127.0.0.1`. The fourth
  start inside ten seconds answers `429` with `X-Retry-After`, and the table
  holds that key at count 3, so the database counted. Two visitors whose
  `x-forwarded-for` Better Auth would refuse get a row each. The same options
  with only the header pin removed put both in one `no-trusted-ip` row, so
  the pin is what separates them. A client varying its own
  `x-forwarded-for` is still refused on the fourth start.
- **`tests/db/oauth-token-encryption.test.ts` (MB.76)**: a Google sign-in
  stores an access token that is not the one issued, and `getAccessToken`
  hands back the one issued; a token overwritten in plaintext still reads.
  `tests/lib/auth.test.ts` pins the limiter's `enabled` and the three session
  lifetimes; `storage`, the header and `encryptOAuthTokens` are proved by
  the two files above, so their pins went in MB.188.
- **`tests/db/last-login-method.test.ts` (MB.77)**: through `auth.handler`
  on `tests/support/oauth.ts`. A verified callback sets the last-used cookie to
  its provider, without `HttpOnly`, and so does an unverified one landing on
  the email page. `/sign-in/social` alone, a callback refused with
  `account_not_linked`, and a link callback set none. Each case first asserts
  whether the session cookie was set, since that is what the plugin keys on.
  `tests/lib/auth.test.ts` asserts Better Auth's `user` table gains no
  `lastLoginMethod`; the shared cookie name is this file's (MB.188).
- **`tests/lib/errors.test.ts` (M1.26)** — asserts each error is an `Error`
  that names itself and carries its message, and that `Forbidden`,
  `NotFound` and `ValidationError` are told apart by type. How Vitest's
  `rejects.toThrow(Class)` behaves is Vitest's, and not tested here (MB.229).
- **`tests/modules/identity/schema/users-schema.test.ts`** — asserts `users`' shape via Drizzle's
  own `getTableConfig()` introspection: `name`/`image` columns,
  `role`'s `user`/`admin` enum and `'user'` default, `canCreateWorkspace`'s
  `false` default, the exact column set with the audit spread (MB.188), and the email
  index being a partial unique index (`WHERE deleted_at IS NULL`) rather
  than a plain unique constraint. It was kept out of the schema directory from
  the start — a `*.test.ts` file there gets swept into `drizzle.config.ts`'s
  `schema` glob, and `drizzle-kit generate` fails trying to `require()` a
  file that imports Vitest; MB.41 moved the whole suite to `tests/`, which
  settles that by construction rather than by convention.
  Pure introspection, no real Postgres — see the next bullet for why.
- **No automated test for the sign-in redirect, and not for the same reason as
  the introspection gap below.** A `POST /api/auth/sign-in/social` case lived in
  `route.test.ts` briefly and broke CI: unlike `/ok`, that endpoint persists a
  `verifications` row (PKCE state) before redirecting, so it needs schema that
  is really there. `route.test.ts` is a **`unit`** test, so it reads the plain
  `sorrel` database — the per-worker `sorrel_test_<n>` clone is
  `db`-project-only and was never in this test's path, which also means M1.27's
  seeded template does not reach it. It passed locally only because this session
  had separately run `drizzle-kit migrate` by hand against its own `sorrel`;
  CI's was empty. See `claude-docs/testing/where-tests-live.md`. The
  Google/GitHub redirect shape (real authorization URL, PKCE params, correct
  callback path per environment) was verified by hand against a running server
  instead, and the ["Config" section](config.md) records what that verification
  established.
- **The db-project introspection gap closed with M1.27.** Until then the
  template carried no schema, so a test asserting these tables exist in a
  cloned `sorrel_test_<n>` database would have failed regardless of whether
  the migration was correct. Every clone now carries the full schema, and
  `tests/db/audit-columns.test.ts` reads `accounts`, `sessions` and
  `verifications` from the catalogue as its named counter-example — the
  three tables that carry `updated_at` and no audit id, and so no trigger.
- **`tests/acceptance/01-accounts.test.ts` (M2.1)** — stories 1 and 2,
  deliberately red. Both are blocked on UI Wave 6 hasn't built yet, not on the
  auth wiring: story 1 checks for `/sign-in` (DESIGN.md §9) at
  `src/app/sign-in/page.tsx`, which M2.6 adds; story 2 reads
  `src/app/ page.tsx`'s own source for the invite-only explanation M2.8 adds,
  since today's `/` is the same static splash for every visitor. Each reads its
  route's source from disk rather than importing or rendering it — the files
  don't exist yet (story 1) or don't yet say what the story needs (story 2), and
  a static import of a page that isn't there would fail typecheck rather than
  the test. `claude-docs/testing/acceptance.md`, "Acceptance" covers how CI
  tolerates this suite failing until M2 closes.
- **Route protection (M2.7)** — `tests/proxy.test.ts` pins the matcher and
  the public list, lookalikes included, and asserts the proxy's
  redirect, its return path, and the header it forwards, overwriting a
  client-supplied one. `tests/lib/request-session.test.ts` mocks Better Auth and
  asserts the mapping to `{ userId, role }`, the refusal of an unknown role, and
  `requireSession()`'s redirect. `tests/lib/sign-in.test.ts` round-trips a set
  of return paths through `signInPath()` and `safeReturnPath()`, and pins
  `postSignInLanding()` and `socialSignInTarget()`;
  `tests/db/sign-in-landing.test.ts` drives the callback's landing by role
  (MB.113).
  `tests/e2e/route-protection.spec.ts` runs the whole thing against the built
  server: a signed-out visit to a protected route lands on `/sign-in` with
  its `next`; `tests/e2e/invite.spec.ts` renders `/invite/*` signed out, not
  redirected, and `tests/e2e/smoke.spec.ts` renders `/` signed out. `requireSession()` has no end-to-end test until the first page
  calls it: a forged cookie passes the proxy by design, and only a real page
  can show the database-backed check refusing it. That page's PR adds the test,
  signing in with a `sessions` row plus a signed cookie (the MB.30 recipe,
  which `tests/e2e/session.ts`'s `signInAs()` writes) — into the calling
  worker's own slot database, which no other worker's reseed touches.
