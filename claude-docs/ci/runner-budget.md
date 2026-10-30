## Runner budget

Every job runs on GitHub's `ubuntu-26.04`, which is free and unlimited on a
public repo. `vitest.yml` ran on Blacksmith's `blacksmith-8vcpu-ubuntu-2404`
from MB.96 to M11.24 and came back (see "Why Blacksmith was dropped" below).
The sizing is [`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md).

- **`vitest` runs on GitHub's 4-vCPU public-repo runner, with three
  workers.** The suite is mostly per-file overhead spread over `dbMaxWorkers`
  = cores − 1 (`tests/support/db-project.mts`), which reads the core count at
  run time, so the worker count followed the move with no change. The job runs
  inside `container:`, so the host's Ubuntu is only Docker and the runner
  agent. The runner pulls the job and service images on every run:
  MB.96 measured that at 38–39s in "Initialize containers" (its table below).
- **The job starts on every gate run that gets past `changes`**, filtered off
  or not, except the path-filtered jobs of `checks.yml`, `vitest.yml` and
  `playwright.yml`, which carry a job-level `if:` and so skip before their
  container is pulled (the [header rule](aggregating-workflows.md)). The
  counts below were taken before that change. Between 27 September and 11 October 2026
  the gate ran 633 times: 258 stopped at `changes` (the closed pull requests
  and base-only edits MB.98 turns away), and 366 reached the check jobs. That
  fortnight held the test-reduction lanes' bursts, 161 runs on 27 September
  alone; from 1 to 11 October the pace was about **500 a month**, twice the
  ~245 counted at MB.98. Runs cost nothing now, so the count matters only for
  how long a developer waits.
- **`e2e-cache.yml` costs about 2½ GitHub-hosted minutes per push to
  `staging` that touches the e2e build's inputs**
  (MB.234). It saves the e2e build cache a pull request's Playwright job
  restores, and is the only run that saves it (MB.235; [Reusable
  checks](reusable-checks.md)). Estimated from `pr-gate.yml`'s jobs on run
  38102191294: the two image jobs take about 16s and 31s when the image is
  already published, and the warm job about 1½–2 minutes — 51s to pull the
  e2e image and start Postgres and Mailpit, 2s of checkout, a few seconds to
  restore about 160 MB, 25–40s to build and start the servers with no spec
  run, and 10s to save. Those minutes are free on a public repo; the return
  is the build time each pull request's Playwright job no longer spends cold.

### Where a gate run's time goes

Means over six successful gate runs on 16 October 2026 (38862331956,
38857677987, 38856311496, 38855372361, 38855033330, 38854652905), every
image already built and cached; the two Playwright rows were re-measured for
M11.18, the rest are the 10–11 October means (38104708609, 38108699654,
38109769274, 38109934658, 38110758509, 38111170609). "Pull" is "Initialize
containers": pulling the job's image and starting its services. The
Playwright steps' breakdown is read off run 38862331956's logs: the gap
from the step's start to the list reporter's `Running N tests` line is the
build, the servers and the template seed, and the rest is the tests.

| Job                           | Time   | Where it goes                                                                                                                                                            |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `playwright`                  | 139s   | pull 40s · cache restore 6s · Run Playwright tests 81s (`next build`, 8 servers and the seed 33s · 62 tests on 4 workers 53s) · coverage upload 2s                       |
| `stories`                     | 166s   | pull 46s · cache restore 5s · Run Playwright tests 104s (build, 6 servers and the seed 21s · 50 stories on 4 workers 64s in that run, and the step 85–131s over the six) |
| `vitest` (GitHub, 4 vCPU)     | 337s   | run 38877563430, the first after the move: pull 27s · Run vitest 300s. On Blacksmith (8 vCPU), before M11.24, it was 68s: pull 8–11s · Run vitest 44–62s · stories 3s    |
| `checks / build`              | 71s    | pull 28s · build 30–47s · cache save 4s                                                                                                                                  |
| the other seven `checks` legs | 25–49s | pull 22–28s, then the tool                                                                                                                                               |
| the three image builds        | 16–30s | finding the content-hash tag already published, and skipping the build                                                                                                   |
| `changes`                     | ~8s    | the path filters                                                                                                                                                         |

The `vitest` row above is the first run on GitHub's 4-vCPU runner after
M11.24 moved the job, with the Blacksmith figure kept beside it as history. That
run (PR #1024's run 38877563430, job 116896363786) took **5m37s**: "Initialize containers" 27s,
"Run vitest" 300s. Vitest's own line was `Duration 298.51s (tests 54%, import
17%, environment 13%, setup 10%, transform 6%, worker 1%)` over 344 files and
4,320 tests. That is about four times the Blacksmith job and well past the 2m14s
MB.96 measured on the same runner size, so the earlier expectation did not hold.
Two tests in `tests/components/IngredientForm/variants.test.tsx` failed on
Vitest's default 5,000 ms `testTimeout`: that file took 79.2s for its 35 tests,
and the two run in 1.2s and 0.9s on an idle 12-core devcontainer, so three
workers sharing four vCPUs made them more than four times slower.
`vitest.config.mts` now sets `testTimeout` to 20,000 ms, since the timeout
guards against a hang and is not a speed assertion.

Of the Blacksmith run's 47s of Vitest wall time, its own breakdown gives 38% to the
tests, 30% to imports, 13% to transforms, 10% to setup files and 8% to test
environments. The critical path to the required checks is now `changes` →
`vitest`, 5m37s on GitHub's runner and longer than `playwright` (about
143s), so the Vitest speed work under M11.24 is what shortens it. Before the
move it was `changes` → `build-e2e-image` → `playwright`, about 3 minutes warm; `stories` runs
beside it on the same image and finishes about half a minute later, but is
never a required check (M9.1). In both Playwright jobs the test span is set
by the longest serial spec file rather than by the work: `shell.spec.ts` is
34 s of the e2e job's 53 s, and `07-admin.spec.ts` 62 s of the stories
job's 64 s, each on one worker while the other three wait — M11.18's plan,
[`design-decisions/m11.18-plan.md`](../design-decisions/m11.18-plan.md),
is what shortens them. Neither job saves a cache since MB.235: Playwright's
save ran after the tests, on that path, and the build leg's never restored.

`vitest.config.mts` runs every project in worker threads (`pool: 'threads'`)
rather than Vitest's default forked processes. M11.24 measured it at three
workers with coverage, on the 12-core arm64 devcontainer with the core count
patched to four: about 94s wall and 284 CPU-seconds on forks over three runs,
and about 85s and 247 over six on threads. A file's fresh worker started in
about 145ms rather than 175ms, and the run starts 226 of them. The host had no
real four-core limit, so the figure to trust is the gate's own `vitest` job.
Tried and left out: unisolated `dom` (about 3–4% of the suite, and
`tests/app/pre-paint-scripts.test.tsx` failed), a cached
`node_modules/.vitest-cache` (1–2s), the `FILE_COPY` clone strategy (slower
than the default) and a fourth worker (no spare core on the runner).

### Why Blacksmith was dropped

M11.24, 16 October 2026: the owner decided to leave Blacksmith on cost. This
answers the review of Blacksmith's usage page that this doc set for
12 October 2026. The estimate then was that successful `vitest` jobs, at 75s
a run, drew 5 two-vCPU minutes at the 4× rate of an 8-vCPU runner (8 if
Blacksmith bills each job by the whole minute). At ~500 runs a month that is
about 2,500 minutes, 83% of the 3,000-minute monthly free tier, or about
4,000 by whole minutes — over it. The tier is per organisation, so any other
Aurora-Arctic repo adopting Blacksmith would have drawn on the same 3,000.
GitHub's minutes on a public repo are free. These are estimates from job
durations, not Blacksmith's bill.

What the move gives up: seven Vitest workers (three on GitHub's runner) and
Blacksmith's image cache. Moving Playwright or the image builds to Blacksmith
was also weighed in MB.96 and rejected, as it would have drawn about twice the
free tier on its own.

**Outside the repo:** uninstall the Blacksmith GitHub App from the
organisation only after the M11.24 PR merges, never before. A `runs-on` label
with no app behind it queues forever rather than failing, so uninstalling
first would hang every open PR's `vitest` job.

### MB.96's measurements

Measured on the runners named in each row, before M11.24 moved the job back to GitHub. These are the `vitest / vitest` job on a
131-file suite when MB.96 moved it, kept as history. A cold
run is the first on a new image tag; a warm one finds both images in
Blacksmith's cache. Six of the warm run's seventeen seconds were the wait
for Postgres's first health check, 5s after start under
`--health-interval=5s`; every service since probes each second for its first
ten (`--health-start-interval=1s`, Docker 25 or later), so a service is marked
healthy within a second of being ready.

| Run                                | Initialize containers | Run vitest | Job   |
| ---------------------------------- | --------------------- | ---------- | ----- |
| GitHub, before MB.97 (#517)        | 38s                   | 110s       | 2m47s |
| GitHub, after MB.97 (#527)         | 39s                   | 79s        | 2m14s |
| Blacksmith 8 vCPU, cold (#528)     | 23s                   | 16s        | 56s   |
| Blacksmith 8 vCPU, warm (#528)     | 17s                   | 17s        | 51s   |
| Blacksmith, warm, 1s health probes | 8s                    | 17s        | 43s   |

MB.96's sizing of the Blacksmith tier, at the ~245 runs a month counted then (history):

| Option                        | Allowance per run                     | Month at ~245 runs   | Verdict                                                  |
| ----------------------------- | ------------------------------------- | -------------------- | -------------------------------------------------------- |
| vitest on 8 vCPU              | ~5 min (8 if billed per whole minute) | ~1,200 (worst 2,000) | Fits; watch it                                           |
| vitest on 4 vCPU              | ~3 min                                | ~750                 | Fits comfortably; three workers, so only the image cache |
| vitest + playwright on 8 vCPU | ~9 min                                | ~2,200 (73%)         | Fits only while MB.98 holds; the second step             |
| Every job on Blacksmith       | ~15+ min                              | ~3,700               | Over, on legs that are free today                        |

## Splitting the Vitest job

M14.27 split `vitest.yml` from one job into four, so a PR that touches only
the backend sees its answer sooner and a timeout in one kind of test no longer
fails the others.

| Job           | Runs                                  | Postgres service |
| ------------- | ------------------------------------- | ---------------- |
| `vitest-dom`  | `--project dom` (happy-dom)           | No               |
| `vitest-node` | `--project unit --project rsc`        | No               |
| `vitest-db`   | `--project db --project db-mocking`   | Yes              |
| `vitest`      | Merges the three; applies the 80% bar | No               |

- **Each part writes a blob.** `vitest run … --coverage --reporter=blob`
  writes the part's results and its coverage map to
  `.reports/blobs/blob-<part>.json`, uploaded as the artifact
  `vitest-blob-<part>`. A part switches the four coverage thresholds off
  (`--coverage.thresholds.*=0`): it sees only its own projects' share of
  `src/`, so it would fail an 80% bar that only the whole tree meets.
- **Why a merge job.** `vitest run --mergeReports .reports/blobs --coverage`
  joins the three coverage maps, so the 80% thresholds apply once over the
  whole tree, and writes the same JSON the single job did (per-file
  `startTime` and `endTime` included, checked locally), so
  `summarize-vitest.mjs` and `lib/slowest-files.mjs` are unchanged. It runs
  no tests. It is named `vitest` because the caller's job is also `vitest`,
  which makes the required check `vitest / vitest`; the ruleset needs no change.
  The parts are `vitest / vitest-dom` and so on, and are not required checks.
- **A doc-only PR skips the whole run, never one part.** `should-run` is false
  for every job, so each is skipped under its own name. A single part is never
  path-skipped: the merge needs all three blobs and fails when one is missing.
- **`npm run test:coverage` is unchanged** for local use: one run, one lock.

### Measured: the first gate run of the split

Run 40562273451, 27 October 2026, with the images already cached (the image
pulls took 14 s and 21 s):

| Job              | Wall time |
| ---------------- | --------- |
| `vitest-node`    | 1m 37s    |
| `vitest-dom`     | 3m 38s    |
| `vitest-db`      | 3m 56s    |
| `vitest` (merge) | 53s       |

The three parts started together at 18:42:16 and the merge ended at 18:47:08,
so the required check took 4m 52s from the caller job's start. The single job
it replaced took 6m 34s (`design-decisions/m14.27-test-audit.md`, section 8).

**Conclusion: `vitest-db` is the critical path, not `vitest-dom`.** The audit
expected `dom` to be the long pole, but `db` finished 18 s after it. Sharding
`vitest-dom` (`--shard 1/2` and `2/2`, with the shard in the blob name; the
merge job takes any number of blobs) would shorten a job that is not the
slowest, so it buys nothing yet. `vitest-db` is not worth sharding, because
each shard would build its own template database. What shortens it is the db
lane's cuts of the two seed tests, `tests/db/seed/index.test.ts` (48s on the
old job) and `tests/db/seed/compendium.test.ts` (40s). Re-measure after those
merge, then decide on sharding `dom`.
