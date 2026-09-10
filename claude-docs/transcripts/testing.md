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
