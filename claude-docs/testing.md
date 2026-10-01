# Testing — summary

Vitest 5, configured as four projects in `vitest.config.mts` (`.mts`, not
`.ts` — the root `package.json` deliberately carries no `"type"` field per
`MODULE_TYPELESS_PACKAGE_JSON`, so an explicit `.mts` extension is what tells
Vite's native config loader this file is ESM instead of warning about it), plus
the acceptance suite on a config of its own, `vitest.stories.config.mts` (M1.28,
below). `db` and the acceptance config share the Postgres harness through
`tests/support/db-project.mts` — `.mts` and imported with its extension for the
same reason, since a config's imports run at config-load time.

**Every section is a file under `testing/`**, moved there whole. This page keeps
each `## ` and `### ` heading with a link to where it lives; a citation in code
names that file, not this page.

## Where tests live

Every Vitest file sits under `tests/` mirroring `src/`, a path glob assigns it to the `unit`, `dom`, `db` or `rsc` project, `db` re-clones each worker's database from the seeded `sorrel_test_template` before every file, and `npm run test:coverage` runs all four against an 80% threshold. [`testing/where-tests-live.md`](testing/where-tests-live.md)

## The db test harness — `tests/support/db/` (MB.51)

`tests/support/db/` is the one part of `tests/support/` allowed a runtime `drizzle-orm` import, and holds `useTestDatabase`'s per-file client and catalogue reads, `tableFacts` and the audit lists, and the `insertIngredient` and `insertSpell` setup inserters. [`testing/db-harness.md`](testing/db-harness.md)

## Acceptance — `make test-stories` (M1.28)

`npm run test:stories` runs `tests/acceptance/` on its own `vitest.stories.config.mts`, outside coverage, and prints a checklist of the v1 stories read from DESIGN.md §10, each status folded from every suite whose `describe` names the story. [`testing/acceptance.md`](testing/acceptance.md)

## Acting as a fixture user, and asserting a refusal (M1.26)

`asUser(user)` in `tests/support/as-user.ts` returns a fresh `Session` as if that user had signed in, with `A` to `E` re-exported from the seed's `FIXTURE_USERS` and no database touched, and a refusal test asserts the `Forbidden` or `NotFound` type, never the message. [`testing/acting-as-fixture-users.md`](testing/acting-as-fixture-users.md)

## Fixture factories (M1.25)

`makeIngredient`, `makeSpell` and `makeWorkspace` in `tests/support/fixtures/` build typed objects, never inserts, with invented default names, merging overrides, replacing arrays and agreeing fields derived together, while setup rows go through the raw `postgres` client and the shared inserters, never `withAudit`. [`testing/fixture-factories.md`](testing/fixture-factories.md)

### Overrides merge; arrays replace

In [`testing/fixture-factories.md`](testing/fixture-factories.md#overrides-merge-arrays-replace).

### The fields that have to agree with each other

In [`testing/fixture-factories.md`](testing/fixture-factories.md#the-fields-that-have-to-agree-with-each-other).

### `…Columns` for the raw-SQL tests

In [`testing/fixture-factories.md`](testing/fixture-factories.md#columns-for-the-raw-sql-tests).

### Who uses them

In [`testing/fixture-factories.md`](testing/fixture-factories.md#who-uses-them).

## E2E — Playwright (M1.11)

Playwright runs `tests/e2e/` against a production build, giving each of `E2E_WORKERS` slots its own `next start` on `8001 + n` and its own `sorrel_e2e_<n>` clone, reseeded per spec file, and `signInAs()` signs in without a provider. [`testing/e2e.md`](testing/e2e.md)

## Accessibility — axe-core (M1.12)

Accessibility is asserted in Playwright, not `vitest-axe`: `tests/e2e/axe.ts`'s `assertNoAccessibilityViolations(page)` runs `@axe-core/playwright` and fails with a per-rule summary, and `axe.spec.ts` seeds an `<img>` missing `alt` to prove it can fail. [`testing/accessibility.md`](testing/accessibility.md)

## Coverage — monocart-coverage-reports (M1.13)

Playwright's e2e coverage is JS only, collected per test by `tests/e2e/fixtures.ts` into monocart-coverage-reports under `.reports/coverage-e2e/`, and mapped back to `src/**` through `productionBrowserSourceMaps` and an order-sensitive `sourceFilter` that excludes `node_modules` first. [`testing/coverage.md`](testing/coverage.md)

## Debugging tests (MB.22)

`npm run test:debug` halts single-worker Vitest under `--inspect-brk` on 9230, `test:ui` opens `@vitest/ui`, `e2e:ui` and `e2e:trace` debug Playwright, and an e2e run inside the devcontainer needs the remote browser `PLAYWRIGHT_WS_ENDPOINT` names. [`testing/debugging-tests.md`](testing/debugging-tests.md)
