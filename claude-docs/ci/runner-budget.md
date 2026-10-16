## Runner budget

Every job runs on GitHub's `ubuntu-26.04` except `vitest.yml`'s, which runs
on Blacksmith's `blacksmith-8vcpu-ubuntu-2404` (MB.96). The sizing is
[`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md); what
follows is enough to redo the sum.

- **Why the split falls there.** GitHub's hosted minutes are free and
  unlimited on a public repo. Blacksmith's free tier is 3,000 x64 2-vCPU
  minutes a month **per organisation** — shared with any other Aurora-Arctic
  repo that adopts it — and an 8-vCPU runner draws it at 4×; overage is
  $0.004 per 2-vCPU minute. `vitest` is the job the cores change: the suite
  is mostly per-file overhead spread over `dbMaxWorkers` = cores − 1, three
  workers on GitHub's 4-vCPU public-repo runner and seven here, and Blacksmith
  caches the `container:` and `services:` images the job pulls. The
  `checks` legs are 25–49s single-process tools, most of it the image pull,
  and the image builds are bound by the push, so moving them spends the tier
  on minutes that are free where they are.
- **The job starts on every gate run that gets past `changes`**, filtered off
  or not: `should-run` skips its steps, not the job (the [header
  rule](aggregating-workflows.md)). A cancelled run bills the minutes it used,
  but a job cancelled while still queued, before any runner picked it up, ran
  no step on any machine and bills no Blacksmith minutes. Between
  27 September and 11 October 2026 the gate ran 633 times: 258 stopped at
  `changes` (the closed pull requests and base-only edits MB.98 turns away),
  and 366 reached the check jobs. That fortnight held the test-reduction
  lanes' bursts, 161 runs on 27 September alone; from 1 to 11 October the
  pace was about **500 a month**, twice the ~245 counted at MB.98.
- **Of Blacksmith's caches, only the container cache applies, and it needs
  nothing.** It keeps pulled images on a per-organisation disk — free, on by
  default, private GHCR images included, evicted after 8 days unused — so
  "Initialize containers" costs only the layers a new content-addressed tag
  changed. The rest are not used, deliberately. Its Actions cache transparently
  serves `actions/cache`, which this job never calls: the image carries
  `node_modules`. `useblacksmith/checkout` caches the clone on a disk billed
  per GB, and the checkout takes a second. Its Docker layer cache serves
  builds, which stay on GitHub's runners with their cache in the registry
  ([Composite actions](composite-actions.md)).
- **The Blacksmith GitHub App must stay installed on the organisation.** A
  `runs-on` label with no app behind it queues forever rather than failing.
- **`e2e-cache.yml` costs about 2½ GitHub-hosted minutes per push to
  `staging` that touches the e2e build's inputs, and no Blacksmith minutes**
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
| `vitest` (Blacksmith, 8 vCPU) | 68s    | pull 8–11s · Run vitest 44–62s · stories 3s                                                                                                                              |
| `checks / build`              | 71s    | pull 28s · build 30–47s · cache save 4s                                                                                                                                  |
| the other seven `checks` legs | 25–49s | pull 22–28s, then the tool                                                                                                                                               |
| the three image builds        | 16–30s | finding the content-hash tag already published, and skipping the build                                                                                                   |
| `changes`                     | ~8s    | the path filters                                                                                                                                                         |

Of `vitest`'s 47s of Vitest wall time, its own breakdown gives 38% to the
tests, 30% to imports, 13% to transforms, 10% to setup files and 8% to test
environments. The critical path to the required checks is `changes` →
`build-e2e-image` → `playwright`, about 3 minutes warm; `stories` runs
beside it on the same image and finishes about half a minute later, but is
never a required check (M9.1). In both Playwright jobs the test span is set
by the longest serial spec file rather than by the work: `shell.spec.ts` is
34 s of the e2e job's 53 s, and `07-admin.spec.ts` 62 s of the stories
job's 64 s, each on one worker while the other three wait — M11.18's plan,
[`design-decisions/m11.18-plan.md`](../design-decisions/m11.18-plan.md),
is what shortens them. Neither job saves a cache since MB.235: Playwright's
save ran after the tests, on that path, and the build leg's never restored.

### The draw on the free tier

Successful `vitest` jobs since the test-reduction lanes merged on
10 October 2026 average 75s, which is 5 two-vCPU minutes a run at the 4×
rate, or 8 if Blacksmith bills each job by the whole minute. At ~500 runs a
month that is about **2,500 minutes, 83% of the tier**, or about 4,000 —
over it — by whole minutes. The 214 Blacksmith jobs between 28 September
and 11 October came to 1,310 two-vCPU minutes by duration in 13 days,
about 3,000 a month, most of them at the slower times before the lanes. These are estimates from job durations; Blacksmith's usage page
is the bill.

**Review Blacksmith's usage page two weeks after MB.96 merged** (due
12 October 2026). Under 50% of the tier: move `playwright.yml` too, with its
own `.actrc` line. Over 80%: drop `vitest.yml` to
`blacksmith-4vcpu-ubuntu-2404`. Otherwise leave it. The estimate above sits
in the over-80% band; the usage page decides it.

**Moving Playwright or the image builds to Blacksmith is not worth it**, so
it need not be asked again. Playwright on 8 vCPU (4×, 143s) and the three
image builds on 4 vCPU (2×, 16–30s each) would draw roughly 12 two-vCPU
minutes a run, about 6,000 a month at ~500 runs — twice the free tier on
its own — to take about a minute off the critical path. Blacksmith's Docker
layer cache and sticky disks (persistent disks attached to its runners) cost
$0.50 per GB a month. A per-branch registry cache tag would buy nothing
either: the content-hash tag already skips every build whose inputs are
unchanged. The real builds, about 70 a month at 2½–3 minutes each, are an
`npm ci` after a lockfile change plus the push, and only a persistent npm
cache — a sticky disk, not the registry cache — could shorten them.

### MB.96's measurements

Superseded by the table above: these are the `vitest / vitest` job on a
131-file suite when MB.96 moved it, kept for the before-and-after. A cold
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

MB.96's sizing, at the ~245 runs a month counted then:

| Option                        | Allowance per run                     | Month at ~245 runs   | Verdict                                                  |
| ----------------------------- | ------------------------------------- | -------------------- | -------------------------------------------------------- |
| vitest on 8 vCPU              | ~5 min (8 if billed per whole minute) | ~1,200 (worst 2,000) | Fits; watch it                                           |
| vitest on 4 vCPU              | ~3 min                                | ~750                 | Fits comfortably; three workers, so only the image cache |
| vitest + playwright on 8 vCPU | ~9 min                                | ~2,200 (73%)         | Fits only while MB.98 holds; the second step             |
| Every job on Blacksmith       | ~15+ min                              | ~3,700               | Over, on legs that are free today                        |
