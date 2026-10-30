---
paths:
  - 'tests/**'
  - 'vitest*.mts'
  - 'playwright.config.ts'
---

# Testing rules

The long form of `CLAUDE.md`'s Testing section: each line here adds to one of its bullets rather than restating it. `CLAUDE.md` wins over this file; `claude-docs/testing.md` carries the argument and the harness.

## Process

The acceptance scaffold that opens each wave is anchored to the wave rather than the milestone, since a milestone no longer opens as a block.

**`test:coverage`'s 80% threshold** (CLAUDE.md, Commands) holds lines, branches, functions and statements alike. Under Claude Code the run prints only the summary (MB.142), so when a threshold fails, read the files dragging it down from the last run's summary — here for branches, the fifteen with the most uncovered:

Playwright is quiet the same way (M12.37): under Claude Code a run prints dots, each failure and a summary, and still writes `.reports/playwright-report/`. The story suite prints dots instead of its per-test lines, so for per-file timings run it with `PW_REPORTER=list` (claude-docs/testing/where-tests-live.md, "Quiet under Claude Code").

```sh
jq -r --arg m branches 'del(.total) | to_entries | map({f: .key, miss: (.value[$m].total - .value[$m].covered), pct: .value[$m].pct}) | sort_by(-.miss) | .[:15][] | "\(.miss)\t\(.pct)%\t\(.f)"' .reports/coverage/coverage-summary.json
```

## Where tests live

The tree (MB.41): `tests/db/`, `tests/modules/<name>/`, `tests/lib/`, `tests/components/<Name>/index.test.tsx`, plus `tests/guards/` for the mechanical guards and `tests/support/` for the harness, with Playwright's harness beside its specs in `tests/e2e/`. A test reaches the code under test by the `@/` alias and reads files from disk through `tests/support/paths.ts` — never by counting `../` from its own location. `tests/guards/test-location.test.ts` enforces the rule for both runners — every `*.spec.ts` must sit under `tests/e2e/` — so a misplaced test is caught in the diff that adds it rather than never (claude-docs/testing/where-tests-live.md, "Where tests live").

## The database under test

Neon is deployment-only, and the local Postgres 18 runs in Docker because SQLite cannot run PL/pgSQL triggers, `num_nonnulls` constraints, `pg_trgm`, or array columns, which are exactly what needs testing.

Each `db`-project worker clones `sorrel_test_${VITEST_POOL_ID}` from `sorrel_test_template` — the pool _slot_, never `VITEST_WORKER_ID`, which counts test files rather than workers and so runs past the set of clones that exist (MB.14). The `unit` and `dom` projects get no such rewrite and see the plain `sorrel` database, which is why a Postgres test must sit where the `db` project's path glob reaches. A test that has to watch a server render — React's `cache()` dedupe — belongs in the fourth project, under `tests/rsc/`, which resolves under the `react-server` condition and takes no database (M3.8).

The template is built at test-run setup from the same migrations and `standard` seed compose's `db-init` runs, not baked into the image (M1.27), and the worker's database is re-cloned from it **before every test file**. Playwright does the same with `sorrel_e2e_template` → `sorrel_e2e_<slot>`, the slot being Playwright's `parallelIndex`, and gives each slot a `next start` of its own too: the code under test runs in a server that read `DATABASE_URL` once at boot, so a worker needs its own server and not just its own database URL (MB.112). The servers are declared up front, so the worker count is `E2E_WORKERS`, not `--workers`.

A db test therefore builds no schema and restores nothing; one that needs an empty table truncates it, `cascade` (claude-docs/testing/where-tests-live.md, "Where tests live"). The rolled-back transaction CLAUDE.md forbids would fail twice over: `withAudit` opens its own, and `SET LOCAL` would carry one test user's identity into the next assertion.

One seed module (`src/db/seed/index.ts`), three consumers (Docker, Vitest, Playwright), three scenarios: `minimal`, `standard`, `demo`.

## Fixtures

- **`asUser` and the fixture users**, and how a test asserts a refusal: claude-docs/testing/acting-as-fixture-users.md, "Acting as a fixture user, and asserting a refusal".
- **Invented default names** (M1.25) cover every ingredient or coven name a factory supplies on its own — `makeIngredient()`, `makeSpell()`'s custom layer, `makeWorkspace()`; a test that _states_ a real name is stating what it is about. Why a real name merely absent from the seed is unsafe too: claude-docs/testing/fixture-factories.md, "Fixture factories".
- **The shared inserters** are `tests/support/db/insert-ingredient.ts` and `insert-spell.ts`: every ingredient- or spell-family test seeds through them rather than carrying its own insert, and the one test that writes its setup through `withAudit` is a test whose subject is the write path (MB.101). Why setup must bypass the writer, and the two raw inserts that stay: claude-docs/testing/fixture-factories.md, "Fixture factories".

## What a test asserts

- **A story-tagged browser flow** points a failure at a requirement. It measures something other than the 80% line, so `npm run test:stories` runs `tests/e2e/stories/` alone (Playwright, the PR gate's `stories` job, never a required check) and prints one line per v1 story, read from the `@story-N` tags; `npm run test:coverage` never runs it. A test there without a tag fails the run, a tag naming a v2 number is set aside, a flaky story is listed as flaky and stays unticked, never counted as passing, and a story whose page is unbuilt is a `test.fixme` its page task unskips (M9.1).
- **A test in the story suite tags the story it walks** (`@story-N`, Playwright's `tag` option), only where its own steps are the story's flow (M9.1, superseding M9.17's browser column); the tag alone decides which story it counts for. Long form: claude-docs/testing/acceptance.md and e2e.md.
- **What a test may assert at all** — functional requirements, state never copy, a regression test only for a shipped bug, no presentation in happy-dom, one row per shared path, no guard lint can carry: the ten rules of claude-docs/testing/layer-ownership.md, "What a test may assert" (MB.224), which a PR table cites by number.
- **A `dom` test that logs fails, unless it declares the log.** A `console.error` or `console.warn` it did not expect (React's duplicate-key and `act()` warnings, MSW refusing an unhandled request) fails the test with the text. A test that means to log calls `expectConsole('error', /pattern/)` from `tests/support/console-guard.ts`, once per call; a declaration never matched fails too. Do not spy on `console` in a `dom` test (claude-docs/testing/where-tests-live.md, "Where tests live").
- **Each assertion kind has one owning layer** (MB.180), and a test at another layer proves only what that layer adds; a file over the 10 s budget is named in the PR comment, a warning, and is split along its owner rather than the budget raised (claude-docs/testing/layer-ownership.md, "The owning layer").
- **Why an authorization test asserts its preconditions:** "No rows came back" has several causes and only one of them is the guard working — the fixture was empty, the finder was never reached, the id was wrong. The same holds for a guard: an empty scan satisfies every `toEqual([])`, so a guard first asserts it found what it scans.
