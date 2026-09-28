# Bring the CI Vitest job under a minute

## Context

The `vitest / vitest` CI job on the last green PR (#517) ran **2m47s**. The suite is not slow: the same run with coverage takes **14s** in the devcontainer (12 cores, 11 workers). The job is slow because of where and how it runs:

| Segment of the CI job                           | Time | Cause                                                                                          |
| ----------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| Initialize containers                           | 38s  | Pulling the testing image (20s, mostly one `node_modules` layer) and the db image from ghcr.io |
| `npm run test:coverage`                         | 110s | 131 files on **3 workers** — GitHub's public-repo runner is 4 vCPU, `dbMaxWorkers` = cores − 1 |
| acceptance stories, summaries, upload, comments | ~15s |                                                                                                |

Inside the 110s, Vitest's breakdown is `environment 31%, tests 26%, import 26%, setup 12%`, and it printed a hint nobody has read:

```
Isolate  131 workers spawned · ~840ms startup each (spawn + environment, per file)
         at least ~35.84s faster with isolate: false
```

Summed test-file time is 73s (db 48s, unit 26s); the other ~250s of worker time is per-file overhead — fork a worker, boot jsdom, run the setup files, re-evaluate the import graph. With 3 workers that overhead _is_ the wall clock.

Investigating the runner budget turned up two more things the user asked to fold in: gate runs that keep going (or start) after their PR is merged, and a Docker layer cache that is full and mostly unshareable. Four tasks, four PRs:

1. **MB.97 — suite**: stop paying jsdom + jest-dom + React Testing Library boot for the 59 unit files that never touch a DOM. Measured below.
2. **MB.98 — concurrency**: cancel gate runs for closed PRs, and cancel in-flight runs when a PR closes (re-scoped in Part 2). This lands _before_ the runner move, because on a metered runner the burst it prevents would be billed.
3. **MB.99 — Docker cache**: move the buildx layer cache from the Actions cache to the registry.
4. **MB.96 — runner**: Blacksmith, for the `vitest` job only (feasibility below).

Nothing about what is tested changes. No assertion changes.

## Blacksmith feasibility (the user's question)

**What we run.** September 2026 (28 days) on `pr-gate.yml`: **375 runs** — 183 success, 92 failure, 99 cancelled by a newer push (`cancel-in-progress: true`). Every run starts `vitest` (2.8 min) and `playwright` (1.6 min) on GitHub today. GitHub-hosted minutes are **free and unlimited on a public repo**, so today this costs nothing.

**But 130 of the 375 were one burst.** Between 23:48 and 23:53 on 2026-09-27, 130 gate runs were created for PRs merged days or weeks earlier (`feature/m0.20-…`, `m0.21`, … up to #197), each PR's `updated_at` stamped 23:51 — a bulk edit of PR bodies, and `pull_request: edited` in the gate's trigger list fires for a closed PR as readily as an open one. 74 were cancelled, 46 ran green, 10 red. Separately, of the last 20 merged PRs, 4 had a gate run still in flight at the moment of merge that ran to completion afterwards. Both are pure waste today and would be metered on Blacksmith. Part 4 removes both; the budget below assumes it has landed, so the run count that matters is **~245/month**, bursty (4–44 a day).

**What Blacksmith gives.** Labels `blacksmith-{2,4,8,16,32}vcpu-ubuntu-{2204,2404}` (no `2604`). Free tier: **3,000 x64 2-vCPU minutes per month per organisation**, larger sizes drawn down proportionally (8 vCPU = 4×). Orgs only (Aurora-Arctic qualifies). Overage is $0.004 per 2-vCPU minute. Container-image caching is automatic for `container:` and `services:` images — "Initialize containers" drops to seconds once warm.

**Budget at ~245 real runs/month** (estimates; the first two weeks on the dashboard replace them):

| Option                        | Est. job time   | Allowance per run                     | Month at 245 runs    | Without Part 4 (375 runs) | Verdict                                                      |
| ----------------------------- | --------------- | ------------------------------------- | -------------------- | ------------------------- | ------------------------------------------------------------ |
| vitest on 8 vCPU              | ~1.2 min        | ~5 min (8 if billed per whole minute) | ~1,200 (worst 2,000) | 1,800 (worst 3,000)       | **Fits; watch it**                                           |
| vitest on 4 vCPU              | ~1.5 min        | ~3 min                                | ~750                 | ~1,125                    | Fits comfortably; 3 workers, so only the CPU and cache gains |
| vitest + playwright on 8 vCPU | ~1.2 + ~1.0 min | ~9 min                                | ~2,200 (73%)         | ~3,300 — over             | Fits **only with Part 4**; second step                       |
| Every job on Blacksmith       | —               | ~15+ min                              | ~3,700               | ~5,600+                   | Over; spends the tier on 30–60s legs that are free today     |

Overage at these volumes is single-digit dollars a month, so nothing here is _infeasible_ — the cap decides what is free. Two caveats: the tier is per org, shared with any other Aurora-Arctic repo that adopts it; and a cancelled run still bills the minutes it used.

**Recommendation:** move `vitest` alone to `blacksmith-8vcpu-ubuntu-2404`, after Part 4; leave `playwright`, the six `checks` legs, the three image builds and `gitflow` on GitHub. Review the Blacksmith usage page after two weeks: under 50% → add `playwright`; over 80% → drop `vitest` to `blacksmith-4vcpu-ubuntu-2404`.

## Facts the plan rests on

- Vitest 5.0.1, Vite 8, Node 26, `pool: 'forks'`, `isolate: true` (defaults). Vitest 5 has `experimental.diagnostics` hints (the block above), `experimental.importDurations` (used for the numbers below) and `fsModuleCache`.
- **Only 9 of the 71 `unit` files need a DOM** — all nine are `.tsx`: `tests/app/providers.test.tsx`, the seven `tests/components/*/index.test.tsx`, `tests/lib/graphql-client.test.tsx`, `tests/support/vitest-setup.test.tsx`. Two `.ts` files need jsdom for its `location`: `tests/lib/auth-client.test.ts` (Better Auth's client reads `window.location.origin` and `document.cookie`) and `tests/support/msw/graphql.test.ts` (relative `fetch('/api/graphql')`). `tests/emails/verify-email.test.tsx` renders through `@react-email/render`'s node build and needs no DOM, but it is `.tsx`.
- **MSW is used by 5 files**: EmailForm, graphql-client, vitest-setup (all `.tsx`), `tests/support/msw/graphql.test.ts`, and one pure-node file, `tests/lib/mail.test.ts` (`server.use(http.all('*'))`) — confirmed by running the node project with no setup file: only `mail.test.ts` fails.
- Three files already carry `// @vitest-environment node` (`codegen-staleness`, `workshop-guards`, `graphql-client` guards) — redundant once the project is node.
- A CLI `--environment node` does **not** override a project's explicit `environment` (measured: identical durations), so the split has to be config.
- `--no-isolate` on the unit project halves it locally (6.6s → 3.5s) but breaks `tests/app/providers.test.tsx` (`vi.stubGlobal('window', undefined)` leaking through a shared module graph); 15 unit files use `vi.mock`/`vi.stubGlobal`/`vi.stubEnv`. Not a blanket switch.
- The slowest CI files are Better Auth flows (`provisional-accounts` 5.5s, `email-verification` 5.0s, `account-linking` 3.9s) and `@/lib/auth` importers (auth route: 1 test, 3.0s in CI, 1.0s locally with `tests 66%`). Real work on a slow CPU; the runner fixes it, the suite cannot.
- `tests/guards/codegen-staleness.test.ts` (2.7s CI) runs graphql-codegen's `generate()` **five times**; the `beforeAll` run and the "committed client types" run use identical config.
- `tests/support/db-project.mts` pins `maxWorkers` for `db` only; `unit` and `rsc` leave it unset and share the pool group fine, so a new project leaves it unset too.
- **Concurrency today.** `pr-gate.yml` has a workflow-level group per PR with `cancel-in-progress: true`, plus job-level groups: `cancel-in-progress: false` on the three `build-*` jobs (the comment says a cancelled push could freeze a half-written layer), `true` on the rest. The job-level `false` does not survive the workflow-level `true`: in 3 of the 10 most recent cancelled runs all three build jobs show `cancelled`. Nothing broke — the image push is manifest-last and the cache export is per-blob, so a cancelled build leaves no tag and no index behind — so the comment describes a protection that neither exists nor is needed. `deploy.yml` (`cancel-in-progress: false`, alias safety) and `migrate` (a lock) are right as they are.
- **Docker cache today.** The Actions cache holds **94 entries, 10,219 MB — at the 10 GB cap**, so GitHub is already evicting by last-access. 67 entries sit under PR merge refs (`refs/pull/503…518/merge`), the same blob digests stored up to five times, once per PR, because a cache "created for the merge ref … can only be restored by re-runs of the pull request. It cannot be restored by the base branch or other pull requests" (GitHub docs). 27 sit on `refs/heads/staging`, written at times that match gate runs executing _after_ their PR had merged. Builds do import what they can: PR 510's real build (115s) imported the manifest and got `apk add` and `WORKDIR` as CACHED, then rebuilt `npm ci` (18.9s — the lockfile had changed, so unavoidable), pushed the image (43s) and **exported the cache to the Actions cache for 32s** more, writing the 380 MB `npm ci` layer a second time. The `Linux-nextjs-*` Next.js build caches (7 × 101 MB, one per PR) and `node-cache-*npm` (3 × 306 MB) share the same 10 GB and are what the buildkit duplicates crowd out. `deploy.yml` builds no image; only `build-db-image.yml` has a `push` trigger, and skip-if-exists means a post-merge build on `staging` would find the PR's tag and write nothing anyway.

## Part 1 — MB.97: a node project for the unit files that need no DOM

### Measured estimate

Measured locally with a throwaway config in the scratchpad that mirrors the proposed layout exactly (11 workers, all 945 unit tests passing in every variant):

| Variant                                                                    | Unit-project wall time | Breakdown                                  |
| -------------------------------------------------------------------------- | ---------------------- | ------------------------------------------ |
| Today: 71 files under jsdom + jest-dom + `setup.ts`                        | **5.84s**              | environment 47%, tests 24%, setup 11%      |
| Split: 59 files in node with today's `setup.ts`, 12 in jsdom               | **4.07s** (−30%)       | tests 36%, setup 21%, environment 13%      |
| Split with an MSW-only setup file for the node project (the proposal)      | **~3.6s** (−38%)       | node project alone 2.91s → 2.47s           |
| Node project with no setup file at all (upper bound; `mail.test.ts` fails) | 2.50s node-only        | tests 55%, import 33%, no environment line |

Per file, a node-eligible test drops from ~384ms to ~110ms locally. On the full local run that is ~2s off 14.1s.

**CI extrapolation.** CI's per-file startup is 3.1× local (840ms vs 271ms), and `environment` is 31% of all worker time there — nearly all of it the 71 jsdom files. Removing it from 59 of them, plus jest-dom and RTL from their setup, is **~20–28s off today's 110s step on 3 workers** (18–25%), or ~5–7s off ~40s on 7 workers. The first CI run gives the real figure; it is recorded in `ci.md`.

### Changes

Files: `vitest.config.mts`, `tests/support/setup.ts` → `setup-msw.ts` + `setup-dom.ts`, `tests/guards/test-location.test.ts`, `tests/guards/codegen-staleness.test.ts`, the three docblock files, `package.json` (`picomatch` devDependency), docs listed below.

1. **`vitest.config.mts`** — replace the `unit` project with two, sharing the exclude list `tests/db/**`, `tests/modules/**`, `tests/rsc/**`, `tests/acceptance/**`, `tests/e2e/**`:
   - **`unit`**: `environment: 'node'`, `globals: true`, `include: ['tests/**/*.test.ts']`, the shared excludes **plus** `tests/lib/auth-client.test.ts` and `tests/support/msw/graphql.test.ts`; `setupFiles: ['./tests/support/setup-msw.ts']`.
   - **`dom`**: `environment: 'jsdom'`, `globals: true`, `include: ['tests/**/*.test.tsx', 'tests/lib/auth-client.test.ts', 'tests/support/msw/graphql.test.ts']`, the shared excludes; `setupFiles: ['@testing-library/jest-dom/vitest', './tests/support/setup-msw.ts', './tests/support/setup-dom.ts']`.
   - The rule, stated in the config comment and in `testing.md`: **a `.tsx` test gets jsdom; a `.ts` test runs in node unless `dom` names it**. Both keep MSW's "unhandled request is an error" policy — `msw/node` is 26ms under Vitest and the policy is why no unit test can reach the network.
   - `db` and `rsc` untouched. The root `resolve` block (tsconfig paths, `graphql` and `server-only` aliases) already applies to every project.
2. **Split `tests/support/setup.ts`**: `setup-msw.ts` holds the `server.listen`/`resetHandlers`/`close` hooks; `setup-dom.ts` holds the explicit `afterEach(cleanup)` and the `localStorage` polyfill (drop its `typeof window` guard — it only ever runs under jsdom now). `tests/support/vitest-setup.test.tsx` keeps asserting each hook's effect; its `describe` titles say `vitest.setup.ts`, a name that has been wrong since MB.41 — fix them to the new file names. `tests/support/msw/graphql.ts`'s comment naming `vitest.setup.ts` likewise.
3. **Remove the three `// @vitest-environment node` docblocks** and their justifying comments.
4. **Guard** — a third `describe` in `tests/guards/test-location.test.ts`: every tracked `tests/**/*.test.{ts,tsx}` outside `tests/e2e/` and `tests/acceptance/` matches **exactly one** project of `vitest.config.mts`'s (import the config; evaluate each project's `include`/`exclude` with `picomatch`, which Vitest's own globber already depends on — add it as a devDependency rather than reaching through `node_modules`). A file in no project is a file nothing runs, the silent failure this guard already exists for; a file in two runs twice and nobody notices. While there, hoist the file's two `git ls-files` spawns into one.
5. **Rider** (named in the PR body, no id, per MB.31): `codegen-staleness.test.ts` — drop the redundant fifth `generate()` and reuse the `beforeAll` output for the "committed client types" assertion.
6. **Docs** (the doc goes stale in this diff, so this diff fixes it):
   - `claude-docs/testing.md`: line 3 ("three projects" → four); 40–44 (the path-glob rule gains the `.ts`/`.tsx` split); the `unit` bullet 59–136 becomes `unit` (node) + `dom` (jsdom), with the setup-file split and MSW text moved under `dom`; 244–249 ("three `db` files reach it through `lib/auth`" — it is nine); 270–271 ("both run both projects" → all four; line 62's two-exclude list is also stale today); 389–393, 418–421 where they count projects.
   - `CLAUDE.md`: the `test:coverage` row (`unit` (jsdom) + `db` (node/Postgres)) and line 125's project mention.
   - `claude-docs/workshop.md` 146, `email.md` 53, `auth.md` 1164, and the four component docs' "Runs in the `unit` (jsdom) Vitest project" (`theme-toggle`, `sign-in-panel`, `welcome`, `email-form`) → `dom`.
   - Comments naming the `unit` project or jsdom: `tests/support/paths.ts`, `tests/support/fixtures/ingredient.ts`, `tests/guards/soft-delete-finder-guard.test.ts`, the `vitest.config.mts` header.
   - `DESIGN.md` 1175/1209 and `TASKS.md` 739–759 are history that is still true; leave them.

## Part 2 — MB.98: gate runs stop when their PR is closed

Files: `.github/workflows/pr-gate.yml`, `.github/actions/build-image/action.yml` (comment), new `tests/guards/pr-gate.test.ts`, `claude-docs/ci.md`.

1. **A closed PR's run cancels itself.** First step of the existing `changes` job (the job `checks`, `vitest` and `playwright` already `need`), before the path filter:
   ```yaml
   - name: Stop if the PR is already closed
     if: github.event.pull_request.state == 'closed'
     env: { GH_TOKEN: ${{ github.token }} }
     run: gh run cancel "$GITHUB_RUN_ID" --repo "$GITHUB_REPOSITORY"
   ```
   with `actions: write` on the `changes` job's own `permissions` (as built: a job-level set replacing the workflow's for that job, and a `sleep 30` after the cancel so `changes` never completes and starts a check job before the cancel lands). A step-level `if:`, not a job-level one — the header's rule is about jobs, whose skipped state renames a required check; a cancelled run on a closed PR gates nothing. `build-*` and `gitflow` start in parallel and are cancelled within ~10s instead of running to the end. `edited` stays in the trigger list: an open PR retargeted to another base must re-run gitflow, which is why it is there.
2. **Closing a PR cancels its in-flight runs — superseded during MB.98.** The plan was a separate `cancel-gate-on-close.yml` on `pull_request: closed` that ran `gh run list --workflow pr-gate.yml --branch "$HEAD_REF"` and cancelled the matches. It selects by branch, and a hotfix branch is open as two PRs, into `main` and `staging`, with one head branch and one SHA: merging one would cancel the other's gate. **As built:** `closed` joins `pr-gate.yml`'s trigger types. A close starts a run in the PR's workflow-level group (`PR Gate-<pr number>`, `cancel-in-progress: true`), which cancels exactly that PR's queued and in-progress runs, and the step above then cancels the close run itself. No new workflow file. `deploy.yml` is left alone: its `closed` handler tears the preview down and its group is non-cancelling on purpose.
3. **The build jobs' `cancel-in-progress: false`.** Verified dead (facts above). Proposal: delete the three job-level `concurrency:` blocks and replace the comment with the true statement — a build survives cancellation because the tag is pushed manifest-last and the cache is written blob-by-blob, so a cancelled build leaves nothing an `imagetools inspect` would mistake for an image. **This is a doc/code disagreement; confirm before removing** (CLAUDE.md, "establish which one is wrong"). Confirmed during MB.98, and removed.
4. `claude-docs/ci.md`, "Aggregating workflows": the two cancellation paths, the burst as the reason (130 runs from one bulk edit), and the corrected build-job comment. The concurrency audit's verdict on `deploy` and `migrate` (right as they are) goes in one sentence so it is not redone.

## Part 3 — MB.99: Docker layer cache to the registry

Files: `.github/actions/build-image/action.yml`, `.github/workflows/build-{image,e2e-image,db-image}.yml` (drop the `cache-scope` input), `claude-docs/ci.md` "Composite actions" and "Database image".

1. In the composite action, replace both cache lines:
   ```yaml
   cache-from: type=registry,ref=ghcr.io/${repo}/${path}:buildcache
   cache-to: type=registry,ref=ghcr.io/${repo}/${path}:buildcache,mode=max
   ```
   The ref is derived beside the image tag in the "Compute content-addressed image tag" step (`buildcache` is a tag on the same GHCR path, which the docs allow as long as it is not the image's own tag). `mode=max` stays: the `testing` and `e2e` targets need the `development` stage's layers cached too. Remove the `cache-scope` input and its two call sites — the ref already separates the three images, which is all the scope did.
2. What it buys, each verifiable:
   - **Shared by every PR and branch.** A PR that only touches the `testing` stage gets `[development 6/6] RUN npm ci` CACHED from whatever PR last built; today it gets it only if the same PR built before.
   - **Off the 10 GB Actions cache.** The ~7 GB of duplicated buildkit blobs stop competing with the Next.js build cache and the npm cache, which are the entries the eviction is currently throwing out.
   - **A cheap export.** The image push has already put every blob in GHCR; the cache export mounts them and writes a manifest, instead of the 32s re-upload measured on PR 510.
   - **Runner-neutral.** Works identically if the builds ever move to Blacksmith (whose own layer cache wants a different action; no need for it).
3. Cost, stated in `ci.md`: GHCR storage is free for a public repo; each build overwrites `:buildcache` and leaves the previous cache manifest untagged, exactly as the content-addressed image tags already accumulate — a package-version cleanup is a later task, not this one.
4. Verification is in the section below; the tell is a `CACHED` on the `npm ci` step in a build from a _different_ PR.
5. **Added during MB.99, confirmed with the user:** `build-db-image.yml`'s `push` trigger is removed. It existed to seed the branch-scoped Actions cache from `staging` and `main`, which a registry cache makes pointless, and it had already stopped building, because a PR that changes the image builds it first and the push found the tag published. The ref is computed as a `cache` output of the tag step and the build reads `steps.tag.outputs.cache`. No guard test: the cache lines would only restate the YAML, and the proof is the live check below.

## Part 4 — MB.96: run the vitest job on Blacksmith

**Prerequisite, met 2026-09-28:** the Blacksmith GitHub App is installed on `Aurora-Arctic`. It has to stay installed — a `runs-on: blacksmith-*` label with no app behind it **queues forever rather than failing**. **Lands after MB.98**, so the metered runner never sees a closed-PR run.

Files: `.github/workflows/vitest.yml`, `.actrc`, `claude-docs/ci.md`, `claude-docs/TASKS.md`.

1. `vitest.yml`: `runs-on: blacksmith-8vcpu-ubuntu-2404`, with a comment: the job runs inside `container:`, so the host's Ubuntu (24.04; Blacksmith has no 26.04 label) is only Docker and the runner agent; the other workflows stay on `ubuntu-26.04` because GitHub's runners are free and unlimited on a public repo and Blacksmith's tier is capped. 8 vCPU → `dbMaxWorkers` = 7.
2. "Run vitest" step: one `nproc` echo before the command, so the worker count is in the log instead of inferred.
3. `.actrc`: add `-P blacksmith-8vcpu-ubuntu-2404=catthehacker/ubuntu:act-latest` — its own comment says every label a workflow pins needs a mapping or `act` finds no platform. Reword "the label … every workflow pins" to name both labels.
4. `claude-docs/ci.md`: the "Runners are pinned to `ubuntu-26.04`" bullet gains the exception and the reason; the "~20s on a `checks` leg, 37s on `vitest`" container-pull line gets the cached figure once measured; add a short **Runner budget** paragraph carrying the table above and the two-week review rule, so the next person can redo the sum.
5. Record before/after job times in `ci.md` from the second Blacksmith run (the first pays the cold image cache).

## Considered and not in scope, so they are not re-investigated

### `@/lib/auth`'s import graph — explored, measured, not worth an app change

Vitest's import breakdown for a bare `import '@/lib/auth'` in the node project, locally (605ms total):

| Module                                             | Self  | Share | Note                                                                                                                        |
| -------------------------------------------------- | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| `@react-email/components` barrel                   | 154ms | 25%   | Pulls `tailwind` (138ms alone), `code-block`/prismjs (121ms), `markdown`, `render` — the emails use none of the first three |
| `better-auth` core + drizzle adapter               | 170ms | 28%   | The price of `betterAuth()` itself                                                                                          |
| `better-auth/plugins` barrel                       | 30ms  | 5%    | Lazy; and 1.7.6 exports no `plugins/last-login-method` subpath, so there is no alternative import                           |
| `drizzle-orm/postgres-js`                          | 64ms  | 11%   |                                                                                                                             |
| `@/modules/identity` (Pothos, scalars, repository) | 122ms | 20%   | The module barrel registers GraphQL types on import                                                                         |

Replacing the barrel with the ten per-component packages (`@react-email/body`, `button`, … — 7ms together) plus `render` (25ms) would cut ~120ms locally, ~360ms in CI, per process that loads the emails. About 13 test files do (9 db, 2 unit, the acceptance file, `tests/emails/verify-email.test.tsx`): **~4.7s of worker time, ~1.6s of wall clock on 3 workers, ~1.5% of the step; ~0.3s on Blacksmith**. Against that: `@react-email/render` is not hoisted (`components` pins `2.0.6` under its own `node_modules`), so `render` would need a new direct dependency pinned to match; and the app gains nothing, because the barrel is `sideEffects: false` and Next tree-shakes the unused components out of the server bundle already. **Recommendation: leave it.** Better Auth's side has no lever at all.

### The rest

- **`isolate: false`** (Vitest's own hint, 36s of worker time): breaks `providers.test.tsx` today and 15 unit files rely on module mocks/global stubs. A later task could try it on the `unit` (node) project alone once every mocking file is in `dom`. Measure, do not assume.
- **`pool: 'vmThreads'` for `dom`**: Vitest's hint for environment-dominated runs; `instanceof`/memory caveats and MSW under a VM context are untested here. Same later task.
- **`fsModuleCache`**: transform is 2% in CI and the image is fresh every run.
- **Coverage**: report under 1s, instrumentation a few percent. No `--coverage`-less fast path.
- **Seed tests** (`tests/db/seed/*`): ~85 seed transactions and ~105 truncates, on ~300-row scenarios; pure data-shape tests truncate needlessly. ~1–2s in CI. `tests/lib/auth.test.ts` rebuilds `betterAuth()` 22 times and `route.test.ts` rebuilds the schema 13 times by design. Left alone.
- **Image size**: the 20s pull is one `node_modules` layer; Blacksmith's cache makes it moot for CI.
- **Filtered-off legs still pull their container** (~20–46s each): MB.39's question, unchanged by this plan; the Blacksmith image cache shrinks it only for the `vitest` job.
- **The two oddly named September workflows** ("Build & Audit Check", "Lint, Format & Typecheck Check", 40 runs each) are history: runs of files MB.15/MB.32 deleted, last seen 2026-09-17. Nothing to do.

## How the levers stack

The runner multiplies everything else down. Blacksmith's 8 vCPU gives 7 workers instead of 3 and a CPU roughly 2× GitHub's (their claim; today's runner is ~3× slower than this devcontainer per file, so assume Blacksmith at ~1.5×). Summed worker time of ~324s today becomes ~160s spread over 7 workers, plus the serial parts (template seed, coverage report, startup):

| Lever                                                                | On GitHub (3 workers, today)                          | On Blacksmith 8 vCPU (7 workers)     | Worth it?                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner alone (MB.96)                                                 | —                                                     | step 110s → **~40s**; init 38s → ~5s | Yes — the lever that moves the job                                                                                                                                         |
| Project split (MB.97)                                                | **−20 to −28s** of 110s                               | **−5 to −7s** of ~40s                | Yes — small in seconds on Blacksmith, but it is the only lever that stops per-file overhead growing with every new guard, and it is the difference between ~1m00 and ~1m07 |
| Closed-PR cancellation (MB.98)                                       | 130 wasted runs in one evening; 4 of 20 merges ran on | the same, metered                    | Yes — a precondition for the budget, not a speed-up                                                                                                                        |
| Registry layer cache (MB.99)                                         | −32s per real image build; cross-PR `npm ci` hits     | unchanged (builds stay on GitHub)    | Yes — the cache is at its cap and evicting the caches that do help                                                                                                         |
| react-email per-component imports                                    | −1.6s                                                 | −0.3s                                | No — on either runner                                                                                                                                                      |
| `isolate: false` on the node project (later, if it can be made safe) | −12s                                                  | −3s                                  | Only if the split leaves it cheap to try                                                                                                                                   |

The budget line moves with it: a ~1.0-minute vitest job on 8 vCPU is ~4 allowance-minutes per run, so MB.97 also trims Blacksmith's bill by roughly 10% — and if Blacksmith bills whole minutes per job, it is what keeps the job on the 1-minute side of the rounding rather than 2.

**Expected job time**

| Job segment                          | Today     | After MB.97 only (GitHub) | After all four (Blacksmith, warm cache) |
| ------------------------------------ | --------- | ------------------------- | --------------------------------------- |
| Initialize containers                | 38s       | 38s                       | ~5s                                     |
| Run vitest                           | 110s      | ~85s                      | ~35–40s                                 |
| Stories, summaries, upload, comments | ~15s      | ~15s                      | ~12s                                    |
| **Job**                              | **2m47s** | **~2m20s**                | **~1m00s**                              |

## Task tracking

Mint **MB.96** (runner), **MB.97** (project split), **MB.98** (closed-PR cancellation) and **MB.99** (registry layer cache) — `MB.94`/`MB.95` are the last on the board and in TASKS.md — as `Bug` issues with the `tracked` label in **Wave 08 — Compendium and admin** (the current wave; all four are wanted now, not at close-out), with estimates 1h, 3h, 1.5h and 1.5h. Same pass: TASKS.md entries in MB.95's shape, the Wave 8 row (after MB.93, the branch this session is on), the summary table, one sentence in the MB narrative paragraph ("MB.96 through MB.99 were minted on the report that the CI Vitest job was approaching three minutes; sizing the runner budget turned up the closed-PR runs and the full layer cache…"), and the milestone description. `gh` writes are blocked under auto mode; if so, hand the user the exact commands.

Order: **MB.97 → MB.98 → MB.99 → MB.96.** The first three have no external dependency and can each start on a `feature/` branch off `staging`; MB.96 waits for the app install and for MB.98. One PR each, opened only when asked.

## Verification

1. **MB.97 locally**: `npm run test:coverage` — 132 files / 2023 tests pass, coverage ≥ 80% on all four measures; the unit project's wall time is at or under the 3.6s measured above and its `Duration` line shows no `environment` share. `npx vitest run --project unit` lists only `.ts` files; `npx vitest run --project dom` runs the twelve DOM files. `npm run lint`, `npm run typecheck`, `npm run format:check` green. Deliberately drop a `.test.ts` under `tests/` into `dom`'s include without excluding it from `unit` and confirm the new guard fails. In CI: the vitest job's `Duration` and `environment` share against today's 108.69s / 31%; record it in `ci.md`.
2. **MB.98**: on the PR itself, edit the PR body after it is merged (or close a scratch PR mid-run) and watch the gate run appear and cancel within seconds; after a close or merge, the PR's gate runs show `cancelled`, and a hotfix's twin PR keeps its run. `act` cannot exercise either path (no `pull_request` payload with `state: closed`), so this one is verified live.
3. **MB.99**: the first build after the merge exports to `ghcr.io/aurora-arctic/sorrel-and-salt/testing:buildcache` (visible under the package's versions) and its `exporting cache to registry` step is seconds, not 32s; a _different_ PR that changes only `Docker/Dockerfile.node`'s testing stage shows `[development 6/6] RUN npm ci` as `CACHED`; `gh api repos/Aurora-Arctic/Sorrel-and-Salt/actions/caches` totals fall below 10 GB within the 7-day eviction window and stop holding `buildkit-blob-*` entries.
4. **MB.96**: the job log shows `nproc` = 8, "Initialize containers" in seconds on the second run, and `Duration` a fraction of 108s. Check Blacksmith's usage page after the first week against the budget table.
