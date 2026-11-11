## Runner budget

Every job runs on GitHub's `ubuntu-26.04`, which is free and unlimited on a
public repo. No job runs on Blacksmith (see "Why Blacksmith was dropped").
The sizing record is [`ci.md`, "The CI Vitest job: DOM only where needed, GitHub's runner"](../design-decisions/ci.md#the-ci-vitest-job-dom-only-where-needed-githubs-runner).

- **A CI test step's budget is 7 minutes.** A job whose test step passes 7 minutes in two consecutive runs gets another shard (`--shard` with the blob reporter and `merge-reports`), never a longer timeout.
- **R-2: no aggregator job.** A sharded workflow adds no job whose only work is to join its shards. The job that already runs at the end joins the shards: `vitest` `needs` them and merges them, and `playwright-coverage.yml`, which already runs after both Playwright suites, downloads their blob reports and merges them.
- **The Vitest jobs run on GitHub's 4-vCPU public-repo runner, with three
  workers.** The suite is mostly per-file overhead spread over `dbMaxWorkers`
  = cores − 1 (`tests/support/db-project.mts`), which reads the core count at
  run time. A fourth worker has no spare core. The job runs inside
  `container:`, so the host's Ubuntu is only Docker and the runner agent. The
  runner pulls the job and service images on every run (27–39 s in
  "Initialize containers").
- **A job starts on every gate run that gets past `changes`**, except the
  path-filtered jobs of `checks.yml`, `vitest.yml` and `playwright.yml`, which
  carry a job-level `if:` and so skip before their container is pulled (the
  [header rule](aggregating-workflows.md)). The gate runs about **500 a
  month**. Runs cost nothing, so the count matters only for how long a
  developer waits.
- **`e2e-cache.yml` costs about 2½ GitHub-hosted minutes per push to
  `staging` that touches the e2e build's inputs**. It saves the e2e build
  cache a pull request's Playwright job restores, and is the only run that
  saves it ([Reusable checks](reusable-checks.md)). The warm job takes about
  1½–2 minutes: 51s to pull the e2e image and start Postgres and Mailpit, a
  few seconds to restore about 160 MB, 25–40s to build and start the servers
  with no spec run, and 10s to save. The minutes are free; the return is the
  build time each pull request's Playwright job no longer spends cold.
- **Playwright is sharded; Vitest is not, beyond its three parts.** See "Playwright shards" below.
- **Service containers probe fast.** Every service uses
  `--health-start-interval=1s` (Docker 25 or later) for its first ten
  seconds, so it is marked healthy within a second of being ready, not at the
  first 5s probe.

### Where a gate run's time goes

Means over successful gate runs on 16 October 2026, every image already built
and cached. "Pull" is "Initialize containers": pulling the job's image and
starting its services. A Playwright step's gap from its start to the list
reporter's `Running N tests` line is the build, the servers and the template
seed; the rest is the tests.

| Job                           | Time      | Where it goes                                                                                                                                                            |
| ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `playwright` (one shard)      | see below | pull 40s · cache restore 6s · Run Playwright tests (`next build`, 8 servers and the seed 33s, then the shard's tests) · coverage and blob upload                         |
| `stories`                     | 166s      | pull 46s · cache restore 5s · Run Playwright tests 104s (build, 6 servers and the seed 21s · 50 stories on 4 workers 64s in that run, and the step 85–131s over the six) |
| `vitest`                      | 5m37s     | pull 27s · Run vitest 300s, over 344 files and 4,320 tests (before the split below)                                                                                      |
| `checks / build`              | 71s       | pull 28s · build 30–47s · cache save 4s                                                                                                                                  |
| the other seven `checks` legs | 25–49s    | pull 22–28s, then the tool                                                                                                                                               |
| the three image builds        | 16–30s    | finding the content-hash tag already published, and skipping the build                                                                                                   |
| `changes`                     | ~8s       | the path filters                                                                                                                                                         |

- **The gate suite is now 563 tests**, sharded (see "Playwright shards"). `stories` runs beside `playwright` on the same image and is never a required check.
- **In both Playwright jobs the test span was set by the longest serial spec
  file** when the suites were small: `shell.spec.ts` 34 s of the e2e job's 53 s, and
  `07-admin.spec.ts` 62 s of the stories job's 64 s, each on one worker while
  the other three waited ([`ci.md`, "Faster Playwright runs on the same CPU and RAM"](../design-decisions/ci.md#faster-playwright-runs-on-the-same-cpu-and-ram)).
  Neither job saves a cache: Playwright's save would run after the tests, on
  the critical path, and the build leg's never restores.
- **`testTimeout` is 20,000 ms** in `vitest.config.mts`. Three workers sharing
  four vCPUs ran `tests/components/IngredientForm/variants.test.tsx` more than
  four times slower than on an idle 12-core machine (79.2s for 35 tests), and
  two tests failed at Vitest's default 5,000 ms. The timeout guards against a
  hang and is not a speed assertion.
- **Pools.** `vitest.config.mts` runs every project but `dom` in worker
  threads (`pool: 'threads'`) and `dom` in forked processes (`pool: 'forks'`):
  at twelve workers a full `dom` run took about 150 s on threads against about
  30 s on forks, each `dom` test running 10 to 50 times slower than alone. On
  the other projects, threads at three workers took about 85s wall and 247 CPU
  seconds, against about 94s and 284 on forks (a fresh worker starts in about
  145ms rather than 175ms, and the run starts 226 of them). The figure to
  trust is the gate's own `vitest` job, since a devcontainer has no real
  four-core limit.
- **Tried and left out:** unisolated `dom` (about 3–4% of the suite, and
  `tests/app/pre-paint-scripts.test.tsx` failed), a cached
  `node_modules/.vitest-cache` (1–2s), the `FILE_COPY` clone strategy (slower
  than the default) and a fourth worker.

### Why Blacksmith was dropped

Blacksmith's free tier is 3,000 minutes a month per organisation. At about
500 runs a month, an 8-vCPU `vitest` job of about 75s drew an estimated
2,500 minutes (about 4,000 if each job is billed by the whole minute), so
it came close to or over the tier, and any other Aurora-Arctic repo adopting
Blacksmith would have drawn on the same 3,000. GitHub's minutes on a public
repo are free. The move gives up eight vCPUs and Blacksmith's image cache.
Moving Playwright or the image builds to Blacksmith was weighed and rejected
too, as it would have drawn about twice the free tier on its own.

**Outside the repo:** uninstall the Blacksmith GitHub App from the
organisation only after no workflow names a Blacksmith `runs-on` label. A
label with no app behind it queues forever rather than failing, so
uninstalling first hangs every open PR's job.

## Playwright shards

`playwright.yml` runs its tests as a matrix of shards: **three for the gate suite, two for stories, one for `build-only`**. Each shard is a job of its own, `playwright / playwright (n)`, runs `--shard i/n --reporter=list,blob`, and uploads its blob report. `playwright-coverage.yml` downloads every suite's blobs, runs `playwright merge-reports` with the suite's own config, and writes the one summary, comment section and html report a single run did (R-2 above). No `playwright` check is a join of the shards, and none is required.

- **What a shard repeats.** About 94 s outside the test step (the container pull, the checkout, the cache restore and the uploads) and about 81 s inside it (`next build`, the eight servers and the template seed), about 3 minutes per extra shard in all. The gate suite's 563 tests, at the 30 s per test budget, take about 4 minutes more per shard that is left out, so a shard removes about 4 minutes of test time and costs about 3 minutes of repeated work, on runners that are free. These are figures from the single-job runs before the split, not from a sharded run: read the first sharded gate runs before trusting them.
- **The shard count follows the suite's size, not the file count.** Playwright splits a `fullyParallel` file by test and keeps a `mode: 'serial'` describe whole in one shard, so only such a describe can set a shard's span. The axe sweep in `tests/e2e/axe.spec.ts` is listed as chunks of `SWEEP_CHUNK` (6) routes per test so that the sweep's cost spreads over the shards.
- **The merged result.** A shard failing fails its own job. The join in `playwright-coverage.yml` counts the blobs that landed against the matrix's shard count and reads the merged report's `stats.unexpected`, because `merge-reports` exits 0 when tests failed. A failed gate fails the coverage job's last step; a failed or lost story only marks the stories section failed. For stories the shard step has `continue-on-error`.
- **`vitest-dom` is not sharded.** The 7 minute rule applies to its test step, and no run could be read for it: `pr-gate.yml` does not run on a push to `staging`, a recent pull request run skipped every job, and the merged PR #1684 has no gate run or check left. Read the step's time on the first real gate run before deciding.

## Splitting the Vitest job

`vitest.yml` is four jobs, so a PR that touches only the backend sees its
answer sooner and a timeout in one kind of test no longer fails the others.

| Job           | Runs                                                   | Postgres service |
| ------------- | ------------------------------------------------------ | ---------------- |
| `vitest-dom`  | `--project dom` (happy-dom)                            | No               |
| `vitest-node` | `--project unit --project rsc`                         | No               |
| `vitest-db`   | `--project db --project db-mocking --project workflow` | Yes              |
| `vitest`      | Merges the three; applies the 80% bar                  | No               |

The three part jobs differ in their projects and in `vitest-db`'s service; their
steps are the composite action `.github/actions/vitest-part`.

- **Each part writes a blob.** `vitest run … --coverage --reporter=blob`
  writes the part's results and its coverage map to
  `.reports/blobs/blob-<part>.json`, uploaded as the artifact
  `vitest-blob-<part>`. A part switches the four coverage thresholds off
  (`--coverage.thresholds.*=0`): it sees only its own projects' share of
  `src/`, so it would fail an 80% bar that only the whole tree meets.
- **Why a merge job.** `vitest run --mergeReports .reports/blobs --coverage`
  joins the three coverage maps, so the 80% thresholds apply once over the
  whole tree, and writes the same JSON a single run does (per-file
  `startTime` and `endTime` included), so `summarize-vitest.mjs` and
  `lib/slowest-files.mjs` need no change. It runs no tests. It is named
  `vitest` because the caller's job is also `vitest`, which makes the
  required check `vitest / vitest`. The parts are `vitest / vitest-dom` and
  so on, and are not required checks.
- **A doc-only PR skips the whole run, never one part.** `should-run` is false
  for every job, so each is skipped under its own name. A single part is never
  path-skipped: the merge needs all three blobs and fails when one is missing.
- **`npm run test:coverage` is one run, one lock**, for local use.
- **`vitest-db` is the critical path**, not `vitest-dom` (first split run:
  `vitest-node` 1m37s, `vitest-dom` 3m38s, `vitest-db` 3m56s, merge 53s;
  4m52s for the required check against 6m34s for the single job it replaced).
  Sharding `vitest-dom` (`--shard 1/2` and `2/2`, with the shard in the blob
  name; the merge takes any number of blobs) would shorten a job that is not
  the slowest. Sharding `vitest-db` does not pay, because each shard builds
  its own template database. What shortens it is cutting the two seed tests,
  `tests/db/seed/index.test.ts` (48s) and `tests/db/seed/compendium.test.ts`
  (40s); re-measure after that, then decide on sharding `dom`.
