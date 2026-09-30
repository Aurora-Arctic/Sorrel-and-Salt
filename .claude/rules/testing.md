---
paths:
  - 'tests/**'
  - 'vitest*.mts'
  - 'playwright.config.ts'
---

# Testing rules

The long form of `CLAUDE.md`'s Testing section. `CLAUDE.md` wins over this file; `claude-docs/testing.md` carries the argument and the harness.

## Process

TDD throughout: write the failing test, watch it fail, write the minimum, refactor. Each wave opens with an acceptance-test scaffold PR that intentionally lands red — anchored to the wave rather than the milestone, since a milestone no longer opens as a block. Bug fixes start with a regression test.

**Verify with `npm run test:coverage`, not `npm run test`.** A plain pass can still fail CI on the 80% threshold (lines, branches, functions, statements) alone. Under Claude Code the run prints only the summary (MB.142), so when a threshold fails, read the files dragging it down from the last run's summary — here for branches, the fifteen with the most uncovered:

```sh
jq -r --arg m branches 'del(.total) | to_entries | map({f: .key, miss: (.value[$m].total - .value[$m].covered), pct: .value[$m].pct}) | sort_by(-.miss) | .[:15][] | "\(.miss)\t\(.pct)%\t\(.f)"' .reports/coverage/coverage-summary.json
```

## Where tests live

**Every Vitest file lives under `tests/`, mirroring `src/`** (MB.41): `tests/db/`, `tests/modules/<name>/`, `tests/lib/`, `tests/components/<Name>/index.test.tsx`, plus `tests/guards/` for the mechanical guards and `tests/support/` for the harness — and Playwright's specs and their harness live in `tests/e2e/`. Nothing under `src/` is a test. A test reaches the code under test by the `@/` alias and reads files from disk through `tests/support/paths.ts` — never by counting `../` from its own location. `tests/guards/test-location.test.ts` enforces the rule for both — every `*.spec.ts` must sit under `tests/e2e/` — and for Vitest the `include` glob is scoped to `tests/`, so a test file left in `src/` is not a failing test but a file nothing runs, and that is caught in the diff that adds it rather than never (claude-docs/testing.md, "Where tests live").

## The database under test

**Tests never touch Neon.** Neon is deployment-only. Local Postgres 18 in Docker everywhere else — SQLite cannot run PL/pgSQL triggers, `num_nonnulls` constraints, `pg_trgm`, or array columns, which are exactly what needs testing.

Each Vitest **`db`-project** worker clones `sorrel_test_${VITEST_POOL_ID}` from `sorrel_test_template` — the pool _slot_, never `VITEST_WORKER_ID`, which counts test files rather than workers and so runs past the set of clones that exist (MB.14). The `unit` and `dom` projects get no such rewrite and see the plain `sorrel` database, so anything touching Postgres belongs in `db` — which is to say under `tests/db/` or `tests/modules/`, since the split is a path glob. A test that has to watch a server render — React's `cache()` dedupe — belongs in the fourth project, under `tests/rsc/`, which resolves under the `react-server` condition and takes no database (M3.8).

**That template is built at test-run setup, not baked into the image** (M1.27): `globalSetup` clones M0.18's extensions-only `sorrel_template`, runs `db:migrate` and `SEED_SCENARIO=standard db:seed` against the clone — the same two scripts compose's `db-init` runs — and the worker's database is re-cloned from it **before every test file**, so a file starts from the full schema and the `standard` scenario and owes the next file nothing. Playwright does the same with `sorrel_e2e_template` → `sorrel_e2e_<slot>`, the slot being Playwright's `parallelIndex`, and gives each slot a `next start` of its own too: the code under test runs in a server that read `DATABASE_URL` once at boot, so a worker needs its own server and not just its own database URL (MB.112). The servers are declared up front, so the worker count is `E2E_WORKERS`, not `--workers`.

A db test therefore builds no schema and restores nothing; one that needs an empty table truncates it (`cascade` — every child foreign key is `NO ACTION`). **Do not wrap tests in a rolled-back transaction** — `withAudit` opens its own, and `SET LOCAL` would leak one test user's identity into the next assertion.

One seed module (`src/db/seed/index.ts`), three consumers (Docker, Vitest, Playwright), three scenarios: `minimal`, `standard`, `demo`.

## Fixtures

- **Fixture users**: **A** owner of W · **B** member of W · **C** viewer in W · **D** member of unrelated X · **E** site admin in no workspace. `asUser(A)` gives a session; services throw `Forbidden` (claude-docs/testing.md, "Acting as a fixture user, and asserting a refusal").
- **Fixture factory defaults are invented names, never real ones** (M1.25): `makeIngredient()` is Testwort / _Fixtura testalis_, `makeWorkspace()` is Fixture Coven. M1.27 seeds `standard` into the template every db worker clones and the partial unique indexes reserve each seeded identity, so a real name merely absent from the seed is only safe until someone seeds it. The rule covers every ingredient or coven name a factory supplies on its own; a test that _states_ a real name is stating what it is about. `tests/support/fixtures/*.test.ts` check the defaults against the seed's own lists as a backstop.
- **Setup rows go through the raw `postgres` client and the shared inserters, never `withAudit`** (MB.101): setup must not depend on the code under test, and the writer refuses states setup needs — an already-deleted row, a backdated stamp — and reaches a compendium ingredient only under the `SiteAdmin` proof, as the compendium service's own write. `tests/support/db/insert-ingredient.ts` writes an ingredient with its folk names and categories, every row stamped by its author and the GUC published, and every ingredient-family test seeds through it rather than carrying its own insert; a test whose subject is the write path is the one that uses `withAudit` (claude-docs/testing.md, "Fixture factories").

## What a test asserts

- **Acceptance tests name their story** (`describe('Story 12: ...')`) so a failure points at a requirement. Acceptance coverage is tracked separately from the 80% line threshold — they measure different things: `make test-stories` runs `tests/acceptance/` alone and prints one line per v1 story, and `npm run test:coverage` never runs that directory. Every top-level `describe` there must cite a v1 story — `tests/guards/story-naming.test.ts` fails on one that names none, or names a v2 number (M1.28).
- **Accessibility is asserted in Playwright** via `@axe-core/playwright`, not `vitest-axe`.
- **Component tests use role and label queries only.** No test ids for anything a user can see.
- **No snapshots** except design tokens and the GraphQL SDL.
- **Authorization tests must assert direct-id access is refused**, not merely that a row is absent from a list.
- **An authorization test must also assert why the access could have succeeded.** "No rows came back" has several causes and only one of them is the guard working — the fixture was empty, the finder was never reached, the id was wrong. Assert the preconditions, not just the outcome. A test that would stay green with the guard removed proves nothing, so prove it fails without it. The same holds for a guard: an empty scan satisfies every `toEqual([])`, so a guard first asserts it found what it scans.
