# Testing — transcript

## 2026-09-10 — M1.7: Configure Vitest with unit and db projects

Added `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, and
`@testing-library/jest-dom`, plus `vitest.config.mts` (two projects: `unit`
jsdom, `db` node — see `../testing.md`), `npm run test` / `test:coverage`,
and `src/vitest-env.d.ts` for jest-dom's type augmentation under `tsc`.
Removed tsconfig's now-stale `src/**/*.test.tsx` exclusion (it existed only
because `vitest`/`@testing-library/react` weren't installed yet).

`ThemeToggle`'s pre-paint CSS test (M0.29) used
`fileURLToPath(new URL('./index.scss', import.meta.url))` to read its own
`.scss` file — the first time any test actually ran under this config, it
failed: Vitest's jsdom environment resolves `import.meta.url` against the
mocked browser `location`, giving an `http://localhost:3000/...` URL rather
than a `file://` one, matching what a real browser would hand a bundled ES
module. Switched it to `path.join(process.cwd(), …)`. Documented in
`../testing.md` so the next jsdom test that wants its own file's path doesn't
rediscover this.

Fixed a stale milestone reference while in the area: `docker-compose.yaml`'s
port-5432 comment credited "the host-side Vitest `db` project (M0.7)" — M0.7
is design tokens, not this. Corrected to M1.7.

Scoped out, on purpose: the coverage-below-80%-fails-the-build behavior is
demonstrated as-is (`npm run test:coverage` exits non-zero today, since only
`ThemeToggle` has tests) rather than backfilled with tests for existing
untested files — that's not this task. CI wiring (a real `vitest.yml`,
coverage-artifact upload) stays out per the M1.14 stub comments in
`pr-gate.yml`/`merge-queue.yml`; confirmed with the user before proceeding
rather than assuming either scope.

## 2026-09-10 — M1.8: Port vitest.setup.ts

Ported `vitest.setup.ts` from `resume-2026`, scoped to exactly what the task
names: `afterEach(cleanup)`, the `localStorage` polyfill, and MSW server
lifecycle hooks. Left `resume-2026`'s fourth hook (a `webcrypto` polyfill for
jsdom's missing `crypto.subtle`) behind — it exists there for that repo's
`src/utils/crypto.ts` AES-GCM calls, and this repo has no `crypto.ts` and no
task naming it.

MSW had no home here yet (`resume-2026` is fully static, no backend, so it
never used MSW either — this repo's use, mocking `/api/graphql`, is new).
Added `msw` as a devDependency and `src/test/msw/server.ts`
(`setupServer()`, no handlers) so the lifecycle hooks have something to
start/reset/close; the actual `/api/graphql` stub handler and its per-test
override helper are M1.10, not this task.

Wrote `src/test/vitest-setup.test.tsx` first and watched it fail before
wiring `vitest.setup.ts` into `vitest.config.mts`'s `unit` project
`setupFiles` — the RTL-cleanup and localStorage assertions passed
incidentally even unwired (nothing in this environment currently exercises
the Node-`localStorage`-shadow failure mode the polyfill exists for), but the
MSW assertion failed for the right reason (`ENOTFOUND`, no listening server)
until the hooks were wired in. All three acceptance criteria are exercised
by behavior, not by inspecting `vitest.setup.ts`'s source.

Confirmed the pre-existing `test:coverage` threshold failure (M1.7) is
unrelated to this task — same failure, same files, on the M1.7 merge commit
checked out clean in a worktree, coverage percentage unchanged in kind
(marginally higher only because the new files themselves are covered).

## 2026-09-10 — M1.9: Clone a per-worker test database from the baked template

Added `src/test/db-global-setup.ts` (Vitest `globalSetup` for the `db`
project): clones `sorrel_test_1..sorrel_template.config.maxWorkers` from
`sorrel_template` on start, drop-if-exists first so a crashed previous run
self-heals, drops them all again in the returned teardown.
`VITEST_WORKER_ID` is only set inside a worker process — not in the single
process `globalSetup` runs in — so it pre-clones one database per possible
worker (`project.config.maxWorkers`) rather than reading that env var
directly. `src/test/db-setup.ts`, a `setupFiles` entry (which does run
inside each worker), points that worker's `DATABASE_URL` at its own clone
before any test imports `connection.ts`.

`sorrel` needed `CREATEDB` and ownership of `sorrel_template` to run
`CREATE DATABASE ... TEMPLATE` at all — neither existed yet, since M0.18
only ever needed `sorrel` to own its own empty database. Added both to
`Docker/postgres-init/enable-extensions.sql`; `postgres`'s own password is
generated and discarded within that same build step, so `sorrel` is the
only role any runtime connection can authenticate as.

Recorded the rejected rolled-back-transaction alternative in
`design-decisions/m1.9-test-db-isolation.md` — it breaks specifically
because `withAudit`'s `SET LOCAL app.current_user_id` would escape a
per-test savepoint into the outer, never-committed wrapper transaction the
harness would need, leaking one test's audit identity into the next.

**`project.config.maxWorkers` is `undefined` unless set explicitly** — Vitest
resolves its actual worker count internally (`getDefaultThreadsCount` et al.)
without ever writing it back onto `config`. `globalSetup` reading that field
straight off the `TestProject` it's handed silently no-opped: the clone loop
never ran because `1 <= undefined` is `false`, so the file looked correct but
created nothing. Found by instantiating `createVitest()` directly (`node -e
"...".then(v => console.log(v.projects.find(...).config.maxWorkers))"`) and
logging it — `undefined` — before ever reaching a real Postgres. Fixed by
pinning `maxWorkers` explicitly on the `db` project in `vitest.config.mts`
(mirroring Vitest's own default: `os.availableParallelism() - 1`, floored at
1), so both the pool and `globalSetup` read the same resolved number.

Not runnable end-to-end in the devcontainer session this work started in —
no Docker/Postgres is available there (CLAUDE.md's Commands table — `make`/
`docker` aren't installed). Verified as much as possible without one first:
`tsc --noEmit` and `oxlint` pass; invoking `db-global-setup.ts`'s default
export directly with a stub `TestProject` confirmed it attempts real
connections (`ECONNREFUSED`, not a silent no-op) for the configured worker
count.

**Second bug, found once `make docker-up` was actually running** (the user
brought up the stack and this session turned out to already be the
`devcontainer` compose service — `postgres` resolves in `/etc/hosts` and
`DATABASE_URL` was already `postgres://sorrel:sorrel@postgres:5432/sorrel`).
Both new files hardcoded `postgres://sorrel:sorrel@localhost:5432/...` —
copied from `testing.md`'s "host-side Vitest `db` project" framing, which
describes running Vitest directly on the host machine against the
`5432:5432` port mapping. `localhost` inside a container is the container
itself, not the `postgres` service, so every connection attempt failed.
Fixed by deriving admin/per-worker URLs from `process.env.DATABASE_URL`
(same no-default-no-silent-fallback convention as `connection.ts`), rewriting
only the database name — portable across the devcontainer (`postgres` host),
a bare host machine (`localhost`, exported by hand per the pre-M1.9 note this
task's `testing.md` section carried), and CI.

With that fixed, ran the real thing: `npx vitest run --project db` against
the live `postgres` container — `src/db/test-database-isolation.test.ts`'s
three tests (worker-named `current_database()`, no `__drizzle_migrations`
table, a real writable table) all pass. Ran it twice back-to-back and via
`npm run test` (both projects together, 21 tests) to confirm the
drop-if-exists self-heals rather than erroring on a database the previous
run's teardown already cleaned up. Silenced the expected "does not exist,
skipping" `NOTICE`s (`onnotice: () => {}`) once they turned out to be loud
enough on every run to risk burying a real failure in CI log noise.
