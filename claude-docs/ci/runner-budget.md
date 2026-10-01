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
  `checks` legs are 30–60s single-process tools and the image builds are
  bound by the push, so moving them spends the tier on minutes that are free
  where they are.
- **The job starts on every gate run**, filtered off or not: `should-run` skips
  its steps, not the job (the [header rule](aggregating-workflows.md)), and a
  cancelled run bills the minutes it used. The count is gate runs, ~245 a month
  once MB.98 stopped closed PRs from starting any, in bursts of 4–44 a day.
- **Of Blacksmith's caches, only the container cache applies, and it needs
  nothing.** It keeps pulled images on a per-organisation disk — free, on by
  default, private GHCR images included, evicted after 8 days unused — so
  "Initialize containers" costs only the layers a new content-addressed tag
  changed. The rest are not used, deliberately. Its Actions cache transparently
  serves `actions/cache`, which this job never calls: the image carries
  `node_modules`, and Vitest's transform is ~2% of the run.
  `useblacksmith/checkout` caches the clone on a disk billed per GB, and the
  checkout takes a second. Its Docker layer cache serves builds, which stay on
  GitHub's runners with their cache in the registry ([Composite
  actions](composite-actions.md)).
- **The Blacksmith GitHub App must stay installed on the organisation.** A
  `runs-on` label with no app behind it queues forever rather than failing.

| Option                        | Allowance per run                     | Month at ~245 runs   | Verdict                                                  |
| ----------------------------- | ------------------------------------- | -------------------- | -------------------------------------------------------- |
| vitest on 8 vCPU (today)      | ~5 min (8 if billed per whole minute) | ~1,200 (worst 2,000) | Fits; watch it                                           |
| vitest on 4 vCPU              | ~3 min                                | ~750                 | Fits comfortably; three workers, so only the image cache |
| vitest + playwright on 8 vCPU | ~9 min                                | ~2,200 (73%)         | Fits only while MB.98 holds; the second step             |
| Every job on Blacksmith       | ~15+ min                              | ~3,700               | Over, on legs that are free today                        |

**Review Blacksmith's usage page two weeks after MB.96 merged.** Under 50% of
the tier: move `playwright.yml` too, with its own `.actrc` line. Over 80%:
drop `vitest.yml` to `blacksmith-4vcpu-ubuntu-2404`. Otherwise leave it.

The `vitest / vitest` job. A cold run is the first on a new image tag; a warm
one finds both images in Blacksmith's cache. Six of the warm run's seventeen
seconds were the wait for Postgres's first health check, 5s after start under
`--health-interval=5s`; every service since probes each second for its first
ten (`--health-start-interval=1s`, Docker 25 or later), so a service is marked
healthy within a second of being ready:

| Run                                | Initialize containers | Run vitest | Job   |
| ---------------------------------- | --------------------- | ---------- | ----- |
| GitHub, before MB.97 (#517)        | 38s                   | 110s       | 2m47s |
| GitHub, after MB.97 (#527)         | 39s                   | 79s        | 2m14s |
| Blacksmith 8 vCPU, cold (#528)     | 23s                   | 16s        | 56s   |
| Blacksmith 8 vCPU, warm (#528)     | 17s                   | 17s        | 51s   |
| Blacksmith, warm, 1s health probes | 8s                    | 17s        | 43s   |
