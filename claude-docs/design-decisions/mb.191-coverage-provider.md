# MB.191 — The coverage provider, chosen by measurement

**Status:** decided · **Date:** 2026-10-09

`npm run test:coverage` is the run CI times, and MB.180's slowest-files block
reads its per-file durations. MB.181's profiling found that v8 coverage roughly
tripled a dom file's time: `tests/components/IngredientForm/index.test.tsx` ran
12.3 s alone without coverage and some 40 s with it. So the budget was being
spent on instrumentation as much as on tests, and the question was whether the
other provider Vitest ships would spend less of it.

## The question

`@vitest/coverage-v8` collects V8's own coverage of everything a worker runs —
jsdom, React's development build and every other dependency included — and
remaps it onto `src/` through source maps when the run ends.
`@vitest/coverage-istanbul` instruments only the files `coverage.include`
names, at transform time, and leaves everything else running as it would with
no coverage at all. Neither is faster in general: istanbul's counters make each
line of `src/` slower to run, where v8's cost lies in collecting and remapping
code nobody measures. Which wins depends on how much of a worker's time is
spent outside `src/`, and in a suite whose slowest files render through jsdom
that is a measurement, not a known answer.

## Method

Both providers at 5.0.3, matching `vitest`. Each run was a full
`npm run test:coverage` with `--coverage.provider=<name>` on the command line
and nothing else changed between runs, plus `--reporter=json` for the per-file
`startTime`/`endTime` that MB.180's block reads. Runs alternated v8, istanbul,
v8, istanbul on the 12-core devcontainer, under the shared Vitest lock; the
machine is shared, so each provider ran more than once. One plain `vitest run`
with no coverage gives the floor.

- **Wall** is the time from taking the lock to the run's exit, which agrees
  with Vitest's own `Duration` to within a second.
- **Summed** is the sum of every file's `endTime − startTime`, the figure the
  slowest-files block is built from. The per-project figures split it by the
  config's four globs (`rsc` is at most 0.1 s in every run and is left out).

The second v8 run (v8-2 below) lost six `db` files at setup to
`permission denied to terminate process` — another session's connections to
the shared template — so its coverage and summed time are not comparable, and
a third pair was run. It is listed for completeness and left out of the means.

## Local numbers

### Time

| Run         | Wall    | Summed  | dom     | db      | unit   |
| ----------- | ------- | ------- | ------- | ------- | ------ |
| v8-1        | 116.3 s | 265.1 s | 154.3 s | 97.1 s  | 13.6 s |
| istanbul-1  | 74.5 s  | 194.5 s | 87.5 s  | 92.9 s  | 14.0 s |
| v8-2 ✗      | 119.3 s | 285.7 s | 147.2 s | 124.3 s | 14.1 s |
| istanbul-2  | 71.7 s  | 190.7 s | 89.1 s  | 87.0 s  | 14.7 s |
| v8-3        | 103.7 s | 239.5 s | 136.8 s | 90.1 s  | 12.5 s |
| istanbul-3  | 76.7 s  | 210.3 s | 82.1 s  | 114.3 s | 13.9 s |
| no coverage | 69.7 s  | 178.8 s | 87.6 s  | 79.9 s  | 11.3 s |

| Mean of the clean runs | Wall    | Summed  | dom     | db     |
| ---------------------- | ------- | ------- | ------- | ------ |
| v8 (2 runs)            | 110.0 s | 252.3 s | 145.6 s | 93.6 s |
| istanbul (3 runs)      | 74.3 s  | 198.5 s | 86.2 s  | 98.1 s |
| no coverage (1 run)    | 69.7 s  | 178.8 s | 87.6 s  | 79.9 s |

Istanbul took 32 % off the wall and 21 % off the summed time. The saving is
all in `dom`, which fell by 41 % to what it costs without coverage; `db` and
`unit` are level within the noise between runs. Istanbul's own price shows in
Vitest's breakdown, where `transform` rises from 4 % to 8 % of the run.

### Slowest files

The ten slowest files of v8-1 and istanbul-1, the first pair:

| v8-1                                                           |        | istanbul-1                                                      |        |
| -------------------------------------------------------------- | ------ | --------------------------------------------------------------- | ------ |
| `tests/components/IngredientForm/index.test.tsx`               | 85.5 s | `tests/components/IngredientForm/index.test.tsx`                | 44.3 s |
| `tests/components/IngredientForm/references.test.tsx`          | 19.0 s | `tests/components/IngredientForm/references.test.tsx`           | 11.1 s |
| `tests/components/IngredientForm/compendium.test.tsx`          | 10.9 s | `tests/components/IngredientForm/compendium.test.tsx`           | 6.3 s  |
| `tests/db/seed/standard.test.ts`                               | 8.1 s  | `tests/modules/ingredients/services/common-names-plan.test.ts`  | 5.9 s  |
| `tests/db/seed/demo.test.ts`                                   | 6.2 s  | `tests/db/connection-budget.test.ts`                            | 5.8 s  |
| `tests/components/Combobox/index.test.tsx`                     | 6.2 s  | `tests/db/seed/standard.test.ts`                                | 5.6 s  |
| `tests/db/connection-budget.test.ts`                           | 5.9 s  | `tests/db/seed/demo.test.ts`                                    | 4.6 s  |
| `tests/modules/ingredients/services/common-names-plan.test.ts` | 5.2 s  | `tests/app/api/graphql/route.test.ts`                           | 3.6 s  |
| `tests/components/GroupForm/index.test.tsx`                    | 4.5 s  | `tests/components/Combobox/index.test.tsx`                      | 3.5 s  |
| `tests/db/seed/sources.test.ts`                                | 3.7 s  | `tests/modules/ingredients/services/compendium-entries.test.ts` | 3.4 s  |

`IngredientForm/index.test.tsx` across every clean run: 85.5 s and 76.7 s under
v8, 44.3 s, 42.2 s and 41.1 s under istanbul, and 45.7 s with no coverage. It
is still the run's wall clock under either provider — these are full parallel
runs, where MB.181's 12.3 s was the file alone — so the switch does not bring
it under the 10 s budget, and MB.181's split still has to. v8-1 had three
files over the budget, and istanbul-1 two.

### Coverage

The totals were identical across every run of the same provider.

| Provider | Statements               | Branches                 | Functions                | Lines                    |
| -------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| v8       | 97.31 % (5,147 of 5,289) | 92.41 % (3,206 of 3,469) | 98.84 % (1,625 of 1,644) | 98.84 % (4,550 of 4,603) |
| istanbul | 97.24 % (5,110 of 5,255) | 92.36 % (3,204 of 3,469) | 98.84 % (1,626 of 1,645) | 98.77 % (4,513 of 4,569) |

The 80 % threshold holds on every metric under istanbul, with the same 22
files under 80 % on some metric as under v8. Per file:

- **Statements** differ in 21 files and **lines** in 7, each by under four
  points. Nineteen of the 21 are client components: v8 counts a file's
  `'use client'` directive as a statement, always covered, and istanbul does
  not, so each has one covered statement fewer. That is 40 of the 43 client
  files, most of them at 100 % either way; a handful of other files differ by
  a statement in either direction, for a net 34 fewer in the total.
  The other two are services. In
  `src/modules/ingredients/services/workspace-ingredients.ts`, istanbul counts
  the `break` after each `refuse(...)`, a call that always throws, where v8
  marks it covered with the block around it, so the file goes from 100 % to
  96.72 % of statements; `src/modules/ingredients/services/compendium.ts`
  loses one statement the same way.
- **Branches** differ in 2 files: `src/components/IngredientForm/suggestions.tsx`
  (93.61 % → 91.48 %) and `src/lib/citation.ts` (89.53 % → 88.37 %), each one
  branch fewer covered.
- **Functions** do not differ in any file.
- **Files listed**: v8's summary lists 285 files, istanbul's 232. The 53 it
  omits have nothing to measure — 46 `types.ts`, six barrel `index.ts` files
  and `src/lib/session.ts` — and `coverage-table.mjs` already filtered them
  out of the PR comment.

`.reports/coverage/coverage-summary.json` keeps its shape: the same `total`
key, absolute file paths as keys, and `total`/`covered`/`skipped`/`pct` per
metric. `summarize-vitest.mjs`, run on a copy with its `/app` paths pointed at
the istanbul output, wrote the stat line, the coverage table and the
slowest-files block as it does under v8. With the provider switched in the
config and no override, the verification run took 73.3 s and gave the same
totals.

## Decision

**Istanbul.** `vitest.config.mts` names it, `@vitest/coverage-v8` is
uninstalled — nothing else referenced it, and Vitest lists both providers as
optional peers — and `@vitest/coverage-istanbul` is installed at the
`vitest` version. It is faster on wall and on summed time in every pair, it
costs the run about five seconds over no coverage at all where v8 cost forty,
and it holds the threshold with room to spare.

Nothing else needed changing for it: `coverage.include` and `exclude` mean the
same to both providers, and no file in `src/` or `tests/` carries a `v8 ignore`
comment that would need to become `istanbul ignore`.

## What this changes for later tasks

- **Per-file baselines restart here.** A consolidation PR compares per-file
  coverage against the previous run's summary
  ([`testing/layer-ownership.md`](../testing/layer-ownership.md), "How a
  consolidation PR shows its work"); a v8 figure from before this PR is not a
  baseline for an istanbul one, because the two count statements and branches
  differently. This PR's CI run is the new baseline.
- **MB.189's closing measurement** is taken under istanbul.
- **The 10 s budget** in `.github/scripts/lib/slowest-files.mjs` is unchanged;
  it was set from v8 figures, and the files it named are still over it.

## CI's numbers

Every number above is local. The acceptance criteria ask for summed worker
time, Vitest's wall and the slowest-files block under each provider from CI's
own runner, and those belong in this task's PR body, beside the PR's own CI
comment, which carries the coverage table and the slowest-files block under
istanbul.
