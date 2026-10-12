# MB.235 to MB.238 — the approved plan

The plan the owner approved on 2026-10-11, copied as approved. The measurements it rests on are in [`ci/runner-budget.md`](../ci/runner-budget.md) once MB.235 merges.

## CI improvements: the gate's critical path, Playwright, Vitest and the Blacksmith budget

## Context

The owner first asked whether moving the three image builds and Playwright to Blacksmith was worth it. Measured against the last 30 days of gate runs it is not: the move would add roughly 4,000 two-vCPU minutes a month of paid runner time to save about a minute on the one job that is already the critical path. The owner then widened the ask to CI improvements overall: the build cache, Vitest run times, and anything else measured.

Two corrections to what I said earlier in this session:

- **Vitest is not near the tier.** The 30-day sum was inflated by 47 jobs on 28 September that queued for 7 minutes and were cancelled without a runner (zero steps, no runner name), and by the pre-reduction suite. Successful vitest jobs since the test-reduction lanes merged on 10 October average 75 s. At the current ~300 gate runs a month that is about 375 wall minutes, ×4 on 8 vCPU ≈ **1,500 two-vCPU minutes, half the 3,000 tier**. The runner-budget doc's "leave it" band applies.
- **Per-branch registry cache tags would buy nothing.** The image tag is already a content hash of the Dockerfile and lockfile, so a build only happens when the lockfile changed, and then `npm ci` has to run whatever the layer cache holds. The 2½–3 minute real builds are `npm ci` plus the push. The only thing that would shorten them is a persistent npm cache mount, which the registry cache cannot export and a Blacksmith sticky disk could; that is the one real argument for Blacksmith builds, and it is worth ~70 builds a month on PRs that touch the lockfile, for ~280 tier minutes at 2 vCPU plus disk at $0.50/GB/month. Not now.

### Where the gate's time goes (six successful runs, 10–11 October, warm images)

| Job                                            | Mean      | Steps that matter                                                                                                                  |
| ---------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| changes                                        | ~8 s      | runner start; the filter itself is 1 s                                                                                             |
| build-e2e-image / build-image / build-db-image | 16–30 s   | the reuse skip: checkout, login, buildx, `imagetools inspect`                                                                      |
| **playwright**                                 | **143 s** | pull e2e image 48 s · cache restore 3 s · `next build` + boot 29 s · 56 tests on 2 workers 55 s · **cache save 15 s**              |
| checks / build                                 | 71 s      | pull 28 s · `next build` + workshop 30–47 s · a cache save that never restores 4 s                                                 |
| vitest                                         | 68 s      | pull 8–11 s · `Run vitest` 44–62 s (47 s wall: tests 38 %, import 30 %, transform 13 %, setup 10 %, environment 8 %) · stories 3 s |
| checks, other seven legs                       | 25–49 s   | pull 22–28 s for 3–20 s of work                                                                                                    |

Critical path: `changes` → `build-e2e-image` → `playwright`, about 3 minutes warm. Vitest is a minute shorter than Playwright, so Playwright changes move the gate and Vitest changes move developers' local runs and the Blacksmith bill.

## Recommended work, in order of seconds off the gate per hour spent

Each is its own task and PR (one task per PR; minted MB.235 up in execution order after MB.234, synced to the board). Opus agents implement; I orchestrate, measure on each PR's gate run, and record the before/after in the task entry and `claude-docs/ci/runner-budget.md`.

### 1. Playwright: restore the e2e build cache on PRs, save it only from staging — MB.235, ~1 h, −15 s

`playwright.yml`'s `actions/cache@v6` saves at job end whenever the exact key missed, which on a PR is every run with a source change: 15 s to upload a cache under the PR's merge ref that no other run can read (the restriction MB.234 documented). Replace it with `actions/cache/restore@v6` always and `actions/cache/save@v6` only under `inputs.build-only`, same key and restore-keys. The staging warm run (`e2e-cache.yml`) keeps saving.

Same bug in `checks.yml`'s build leg: its `/app/.next/cache` cache has never restored across PRs because nothing on staging saves it. Two choices for the agent to measure, not decide: add a second build-only call that saves it from staging (`e2e-cache.yml` already runs on the right pushes), or drop the cache if the warm `next build` saves under 10 s. Off the critical path, so it rides in this PR only if the first choice is small; otherwise it is named in the body and deferred.

Verification: the PR's own Playwright job shows `Cache restored from key` and no `Post Cache` save step; `e2e-cache.yml` cannot be exercised until merge, say so in the body.

### 2. Playwright: four workers on the 4-vCPU runner — MB.236, ~1 h plus a measurement, −15 to −25 s

Tests take 55 s on two workers for 56 tests of about a second each, so most of it is per-worker serial time. `E2E_SLOTS` defaults to `floor(cpus/2)`; set `E2E_WORKERS: 4` in `playwright.yml`'s env and measure. Each extra slot is one more `next start` (~180 MB, 0.5 s to boot) and a database clone. The risk is CPU contention with four Chromium contexts and six Node servers on 4 vCPU; if the run is not faster, record that and close the task without merging. The doc already marks this "an experiment for after L7's measurement" (mb.224-plan).

### 3. Slim the e2e image — MB.237, ~3 h, −20 to −30 s

The 48 s pull is `mcr.microsoft.com/playwright:v1.63.0-noble`, which ships Chromium, Firefox and WebKit with their system libraries, plus a second `npm ci` of `node_modules`. The suite runs Chromium only. Rebase `Docker/Dockerfile.e2e` on `node:26.6.0-bookworm-slim` and `npx playwright install --with-deps chromium` (the version pinned to `@playwright/test` in the lockfile), keeping the `headed` stage's xvfb/noVNC tooling working for the devcontainer. Measure the image size and the job's `Initialize containers` before and after. The content hash already covers the Dockerfile, so the new image publishes on the PR's first run. Alpine stays out: no musl Chromium (Dockerfile.node's comment).

Doc fix riding along: `composite-actions.md`, `tasks/mb.md` (MB.99's entry) and `mb.96-plan.md` all say the e2e image reuses `development`'s `npm ci` layer; it is a separate Dockerfile on a different base and never did.

### 4. Vitest: the non-mocking `db` files without isolation, measured — MB.238, ~4 h, −6 to −9 s of 47 s, kept only if it measures

Import is 30 % of the wall and the run's own hint reads "387 modules were evaluated 16,386 times · 69 s total" in the `db` project: 134 files each re-evaluating the same ~120-module graph because every file gets a fresh module registry. With `isolate: false` a worker keeps its registry across files.

The known issue (mb.96-plan L59, L169): `--no-isolate` broke `tests/app/providers.test.tsx` through a `vi.stubGlobal` leaking across the shared graph, and mocks registered by one file stay registered for the next. The count today: **38 of the 134 `db` files** use `vi.mock`, `vi.doMock`, `vi.stubGlobal`, `vi.stubEnv` or `vi.resetModules`, and 15 `unit` files. So no blanket switch. The shape: a `DB_MOCKING` list beside `DB_FREE` in `vitest.config.mts`, those 38 files in a `db-mocking` project that keeps `isolate: true` and the same harness, the other 96 in `db` with `isolate: false`. The database harness already gives each file a fresh clone, so what remains is JavaScript module state: 18 `src` files hold a module-level `Map`/`Set`, React `cache()` or `unstable_cache`; the agent lists each and shows it is per-request or reset by the harness, or adds the file to the isolated list. Run the suite three times locally in different orders (`--sequence.shuffle`) and once on CI; the gain is the `Run vitest` wall and the import share. If under 5 s, close the task unmerged and record why. `unit` and `dom` stay as they are; `unit` is the follow-up only if `db` pays.

Not in scope, with the reason: folding the acceptance run into the coverage run (3 s, and `continue-on-error` semantics differ); `vmThreads` for `dom` (open questions on `instanceof` and MSW); dropping vitest to 4 vCPU (the tier is at 50 %, the doc says leave it).

### 5. Record the measurements — rides in MB.235's PR, no id

`claude-docs/ci/runner-budget.md`: the per-step table above replaces the 17 s/51 s Blacksmith figures from MB.96's 131-file suite; the run count is ~300 a month, not ~245; queued-then-cancelled jobs bill nothing, so a pile-up costs no tier; the Blacksmith-builds question is answered with the numbers from this session (so it is not re-asked). `claude-docs/testing/layer-ownership.md` L186-190 says CI's figures come from a GitHub-hosted runner; it is Blacksmith 8 vCPU.

## Not recommended, and why

- **Builds or Playwright on Blacksmith.** Above. Revisit only if the free tier is raised or Playwright grows past ~5 minutes.
- **Merging the seven small `checks` legs into one runner.** Saves ~150 s of free GitHub minutes per run and changes every check name; no gate-time gain because they run beside Playwright.
- **Sharding Playwright across runners.** 56 tests do not need it; the pull and build are fixed costs each shard would repeat.

## Execution: Opus agents run the tasks, I orchestrate

- **One Opus agent per task** (`Agent` tool, `model: opus`, `subagent_type: general-purpose`), each briefed with its task entry, the measured baseline above, the files it owns, the repo rules it touches (`.claude/rules/testing.md`, `writing.md`, `task-tracking.md`) and the verification it must run before reporting. Agents edit and commit on their own branch after `npm run pre-commit`; they do not push or open PRs. I review each diff, run the full verification for the task, and open the PR with the owner's go-ahead.
- **Lanes.** MB.237 (e2e image) and MB.238 (vitest isolation) are independent and start together, each in its own worktree under `/home/node/worktrees`. MB.235 (cache restore-only) runs in `/app`; MB.236 (four workers) is briefed after MB.235's branch exists, stacked on it since both edit `playwright.yml`, and retargets to `staging` after MB.235 merges (the stacking memory).
- **I do the minting and the board** before the agents start, so each brief carries its issue number; I do the measurements from the Actions API after each PR's gate run and put them in the PR body and task entry.
- Branches `feature/mb.235-…` to `feature/mb.238-…` off `origin/staging`.
- Minting: `tasks/mb.md` entries, the wave-08 row in `TASKS.md`, a sentence in `waves/wave-08.md`, then `gh issue create … --type Task --label tracked`, `estimate`, `reorder --apply`, `status "In Progress"`. If auto mode refuses the `gh` writes, the exact commands go to the owner.
- Each PR: `npm run pre-commit`; the e2e suite runs locally for MB.236 and MB.237 (the spec-running memory); `npm run test:coverage` three times for MB.238 to catch order-dependent leaks. Progress and the before/after numbers go in each PR body; `In Review` with the link when it opens. No commit or PR before the owner says so.

## Verification

- Each PR's own gate run is the measurement: the job and step timings from the Actions API against the six-run baseline above, written into the PR body and the task entry.
- The gate's warm wall-clock target after 1–3: Playwright from ~143 s to ~90 s, the gate from ~3 min to ~2 min.
- Vitest after 4: `Run vitest` from ~47 s to under 40 s on CI, and the per-file fixed cost (worker time ÷ files) from ~0.74 s down, read from the same summary line.
