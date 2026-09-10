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
