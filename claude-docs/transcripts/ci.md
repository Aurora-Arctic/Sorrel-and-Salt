# CI pipeline — transcript

Append-only. Newest entry at the bottom. Summary: [`../ci.md`](../ci.md).

## 2026-09-09 — M0.15 · shared composite actions ported

- `.github/actions/{checkout-to-app,job-summary,pr-comment,timer-elapsed,timer-start}/action.yml`
  copied byte-for-byte from `resume-2026` — `diff` against the source confirms
  no drift. None of the five hardcode a repo name internally, so nothing in
  them needed changing.
- The hardcoded reference the task description warned about turned out to
  live in the _callers_, not the actions: resume-2026's per-check workflows
  invoke `checkout-to-app` as
  `mjoynes-wombat-web/resume-2026/.github/actions/checkout-to-app@main`
  (a full `owner/repo` path, not `./...`) because it runs before the repo is
  checked out — a local path can't resolve yet. Any workflow in this repo
  that calls it must use `Aurora-Arctic/Sorrel-and-Salt/.github/actions/checkout-to-app@main`
  instead.
- Added `.github/workflows/composite-actions-check.yml` to satisfy "at least
  one workflow consumes each action successfully" without reaching into
  M0.16's scope (lint/format/typecheck) or M0.17's (build/audit) — those
  workflows don't exist yet, and porting one early would leave the later task
  redoing this one's work. Triggers on `pull_request` (paths:
  `.github/actions/**`, plus itself) and `workflow_dispatch`; runs on bare
  `ubuntu-latest` with its own "Prepare /app" step ahead of
  `checkout-to-app`, since the "testing" container image that gives the real
  check workflows a pre-made `/app` doesn't exist until M0.24.
- Verified without pushing: `npx js-yaml` parses all six new files; `diff`
  against the fetched resume-2026 originals is empty for all five actions;
  `grep -rn resume-2026 .github/` finds nothing. The workflow's actual CI run
  happens once this branch is pushed by `/create-pr` — it triggers on this
  same diff (touches `.github/actions/**`), so the PR itself is the
  end-to-end demonstration.
- Reasoning:
  [`../design-decisions/m0.15-composite-actions.md`](../design-decisions/m0.15-composite-actions.md).

## 2026-09-09 — M0.16 · lint, format and typecheck workflows ported

- `.github/workflows/{lint,format,typecheck}.yml` copied from `resume-2026`
  with only the same `checkout-to-app` repo-path fix M0.15 made — `diff`
  against the source (post-substitution) is empty for all three. Each is a
  `workflow_call`-only reusable workflow, unconsumed until `pr-gate.yml`
  (M0.20) exists.
- Added `.github/workflows/lint-format-typecheck-check.yml` to actually
  invoke the three, since neither of their real callers (`pr-gate.yml`,
  `merge-queue.yml`) exists yet — same reasoning as
  `composite-actions-check.yml` for M0.15. It also builds the `image` input
  they require (`Docker/Dockerfile.node`'s `testing` target) ad hoc and
  pushes it to GHCR under a run-scoped tag, rather than porting
  `build-image.yml` (M0.24) early to get a real one.
- Found and fixed pre-existing Prettier drift in three `claude-docs/*.md`
  files (left over from M0.15) that would have made the new `format` check
  fail red with no change of its own — `npx prettier --write` on exactly
  those three, content otherwise untouched.
- Verified without pushing: `npx js-yaml` parses all four new/changed
  workflow files; `diff` against the fetched resume-2026 originals is empty
  for the three ported workflows; `grep -rn 'resume-2026\|mjoynes-wombat-web'
.github/` finds nothing; `npm run lint`/`format:check`/`typecheck` all
  exit 0 on the host. The container runs, and the deliberately-broken-check
  failure case, are the PR's job — `lint-format-typecheck-check.yml`
  triggers on this same diff.
- Reasoning:
  [`../design-decisions/m0.16-lint-format-typecheck-workflows.md`](../design-decisions/m0.16-lint-format-typecheck-workflows.md).

## 2026-09-09 — M0.17 · build and audit workflows ported

- `.github/workflows/audit.yml` copied from `resume-2026` with only the same
  `checkout-to-app` repo-path fix — `diff` against the source
  (post-substitution) is empty. Its raw `actions/github-script`
  comment-rendering is upstream's own design (confirmed against the live
  resume-2026 `lint.yml`, which does use the ported `job-summary`/`pr-comment`
  composite actions), so it isn't rerouted through them here.
- `.github/workflows/build.yml` copied the same way, plus a comment update
  ("Gatsby build" → "Next.js build") and one real addition: an
  `actions/cache` step for `.next/cache`, following
  `node_modules/next/dist/docs/01-app/02-guides/ci-build-caching.md`'s
  GitHub Actions recipe — resume-2026's own `build.yml` has no equivalent to
  carry over, since Gatsby's build isn't cached this way.
- Found that `Docker/Dockerfile.node`'s `testing` stage — the exact image
  `build.yml`'s container job runs against — bakes in `ENV NODE_ENV=test`
  (M0.11, for vitest), and that Turbopack's production build crashes
  prerendering `/_global-error` (`null` `useContext`) under any `NODE_ENV`
  other than `production`/unset. Reproduced with `NODE_ENV=test npm run
build` before any fix, confirmed clean after. Fixed by pinning
  `package.json`'s `build` script to `NODE_ENV=production next build` — not
  a local-only quirk, every real `build / build` CI run would otherwise fail
  unconditionally the first time this workflow executes.
- Added `.github/workflows/build-audit-check.yml` to actually invoke the two,
  mirroring `lint-format-typecheck-check.yml`'s ad hoc smoke-image pattern
  (same run-scoped GHCR tag, same deferral of `build-image.yml`/M0.24). Its
  `audit` job is gated `if: github.event_name == 'pull_request'` — unlike
  `lint`/`format`/`typecheck`'s optional, guarded `pr-number`, `audit.yml`
  declares it required and interpolates it unguarded into its PR-comment
  script, which would be a syntax error on a `workflow_dispatch` run with no
  PR number.
- Read "audit workflow fails on a seeded high-severity advisory" as the PR
  comment surfacing the finding, not the job or gate turning red — audit is
  deliberately, doubly non-blocking in resume-2026 (`continue-on-error` and
  `|| true` on the one step that can fail), its own `pr-gate.yml` says so
  explicitly, and `DESIGN.md` §12 lists `audit` as ported verbatim. Verified
  by extracting the comment-rendering script and running it against a seeded
  fixture with one `high`-severity finding — renders the expected ⚠️ WARNING
  callout, severity table, and package row.
- Verified without pushing: `npx js-yaml` parses all three new/changed
  workflow files; `diff` against the fetched resume-2026 originals matches
  the intended changes exactly; `grep -rn 'resume-2026\|mjoynes-wombat-web'
.github/` finds nothing; `npm run build` succeeds and populates
  `.next/cache` (first time this script has run in the repo's CI-adjacent
  history); `npm run lint`/`format:check`/`typecheck` all exit 0. The
  container runs are the PR's job — `build-audit-check.yml` triggers on this
  same diff.
- Reasoning:
  [`../design-decisions/m0.17-build-audit-workflows.md`](../design-decisions/m0.17-build-audit-workflows.md).

## 2026-09-09 — M0.18 · base Postgres image built and published to GHCR

- Confirmed there is nothing to port: `resume-2026` has no database at all
  (already established while building `m0.13-postgres-service.md`), so
  `Docker/Dockerfile.postgres` and `.github/workflows/build-db-image.yml` are
  both new, built directly from `DESIGN.md`/`TASKS.md` rather than copied.
- `Docker/Dockerfile.postgres`, `FROM postgres:17`, bakes in `pg_trgm` (the
  one extension `DESIGN.md` §5 names) and an empty `sorrel_template` database
  at _build_ time — read "enabled at build time, not at container start" as
  the literal acceptance criterion it is, since
  `docker-entrypoint-initdb.d/*.sql` scripts only run on a container's first
  start against an empty volume, which is not what "enabled at build time"
  says.
- Fetched `docker-library/postgres`'s real `17/bookworm/docker-entrypoint.sh`
  via `gh api` to confirm the exact mechanism: its `_main` already does
  initdb → temp server → run `/docker-entrypoint-initdb.d/*` → stop server,
  then unconditionally `exec "$@"`s into a foreground `postgres` server. One
  `RUN` step disables that one line (`sed`, matched as the unique,
  single-tab-indented `exec "$@"` at the true end of the file), runs
  `docker-entrypoint.sh postgres` (now returns instead of hanging the build),
  restores the line, then `grep`s for it — a build-time assertion that fails
  loudly rather than shipping an image whose containers can't start postgres.
- `Docker/postgres-init/enable-extensions.sql` holds exactly the one
  `CREATE EXTENSION IF NOT EXISTS pg_trgm` statement — nothing else is named
  in the design, so nothing else is enabled speculatively.
- `.github/workflows/build-db-image.yml` tags the published image with a
  `hashFiles()` hash over `src/db/**`, `Docker/Dockerfile.postgres`, and
  `Docker/postgres-init/**`, plus `latest`. Content-addressing makes "tag
  changes when src/db changes and does not when it does not" true by
  construction, and the same path list gates the trigger, so "rebuild is
  skipped for PRs that do not touch src/db" is the trigger itself rather
  than a job that runs and no-ops. Runs on `pull_request` as well as `push`
  (a PR build is reusable, not throwaway, since the tag is branch-agnostic);
  `latest` only moves on `push` to `staging`/`main`, so a PR can never
  repoint the floating tag other workflows will default to once M0.19 wires
  it up.
- Deliberately left out of scope: no schema or seed data baked in (M1.27,
  once `src/db/schema` has content), and no change to `docker-compose.yaml`
  or a CI `services:` block yet (M0.19 — this task only has to make the
  image exist and publish correctly).
- Verified without pushing: `npx js-yaml` parses `build-db-image.yml`;
  `docker-library/postgres`'s real entrypoint script confirmed the exact
  `sed` target line. **Not verifiable pre-push:** the actual `docker build`/
  `buildx` run and the resulting image — this sandbox has no `docker`
  daemon. Opening the PR (path-filtered on the Dockerfile, the init script,
  and this workflow) triggers `build-db-image.yml` for real.
- GitHub's build checks flagged the first version's `ENV
POSTGRES_PASSWORD=...` (`SecretsUsedInArgOrEnv`) once the PR was open —
  correct as a matter of policy, since a static scanner can't tell a
  throwaway build-time placeholder from a real one just by reading the
  instruction. Fixed by generating the password with `export` inside the
  `RUN` step itself instead of a Dockerfile `ARG`/`ENV`, so there's no image
  instruction for the scanner to flag and the value is discarded the moment
  the step ends. Considered and rejected `POSTGRES_HOST_AUTH_METHOD=trust`
  as the alternative fix — it dodges the same warning but bakes
  _passwordless_ auth into `pg_hba.conf` inside the image, which every real
  container then inherits since PGDATA is already populated at that point.
- Reasoning:
  [`../design-decisions/m0.18-build-db-image.md`](../design-decisions/m0.18-build-db-image.md).

## 2026-09-09 — M0.19 · consume the preseeded image in CI

- Added `verify-db-image` to `build-db-image.yml`: `needs: build-db-image`,
  a job-level `services:` postgres container pinned to
  `needs.build-db-image.outputs.image` (the hash tag, not `latest` — a
  `pull_request` run's `latest` hasn't moved yet, so it would verify old
  content instead of what this run just built). Actions gates every step on
  the service's `pg_isready` health check before running; the one step is
  `docker exec ${{ job.services.postgres.id }} psql -U postgres -d
sorrel_template -c 'SELECT 1'`.
- First draft used `actions/cache` plus a manual `docker save`/`docker load`
  step so a cache-restore could run before the container started, avoiding
  the job-level `services:` keyword entirely — motivated by wanting to
  literally cache the image pull between separate job runs. User feedback:
  overkill for a 1h task. Replaced with the plain `services:` block —
  Actions pulls that image before any step regardless, so there was nothing
  the cache step could actually intercept; the real cost (rebuilding on top
  of the `postgres:17` base) is already covered by the build job's existing
  `cache-from`/`cache-to: type=gha`.
- `docker exec`, not a TCP connection: `Docker/Dockerfile.postgres`'s
  build-time init run configures `pg_hba.conf`'s `host` (network) auth using
  a superuser password generated randomly and discarded before the image is
  even pushed (M0.18) — nothing can authenticate over TCP with a known
  credential. The `local` (Unix-socket) rule stays `trust`, which is what
  `docker exec` uses. This is also why the acceptance criterion says "from
  inside the job container" rather than just "succeeds".
- User also asked whether verification was worth doing at all, since a
  broken image would eventually surface once M1's real test jobs depend on
  it. Kept it: M1 is a full milestone away, and two of M0.19's four
  acceptance criteria (SELECT 1 succeeds, health check gates the test step)
  would otherwise go unmet. Documented `verify-db-image` explicitly as
  scaffolding — delete it once a real M1 test job exercises the same
  `services:` pattern for real, the same way M0.16/M0.17's smoke-image
  workflows are documented as stand-ins for `pr-gate.yml`.
- Verified without pushing: `npx js-yaml` parses `build-db-image.yml`.
  **Not verifiable pre-push:** the actual job run (`job.services.postgres.id`
  resolution, the health check, `docker exec`/`psql`) — this sandbox has no
  `docker` daemon, same limitation M0.18 hit.
- Reasoning:
  [`../design-decisions/m0.19-consume-db-image.md`](../design-decisions/m0.19-consume-db-image.md).

## 2026-09-09 — M0.20 · pr-gate.yml ported

- Fetched resume-2026's `pr-gate.yml` via `gh api
repos/Aurora-Arctic/resume-2026/contents/.github/workflows/pr-gate.yml` and
  wired it to the five reusable checks that exist so far (`lint`, `format`,
  `typecheck`, `build`, `audit`), dropping everything that doesn't: `gitflow`
  (M0.22) is removed from every job's `needs:` outright, the real
  `build-image.yml` (M0.24) is replaced by the same ad hoc, run-scoped image
  build M0.16/M0.17 already established (tag
  `ghcr.io/.../testing:pr-gate-<run id>`, distinct from those two workflows'
  `smoke-<run id>` so a PR touching both never collides), and `vitest`/
  `playwright` (M1) become bare stub jobs — real job names, one no-op `echo`
  step, so M1 swaps in the real `uses:` without ever renaming a required
  status check.
- The `changes` path-filter job keeps only the three categories that both
  exist and actually take a `should-run` input (`lint`, `typecheck`,
  `build`) — upstream's `audit` and `vitest`/`playwright` categories aren't
  carried over since nothing would consume their output (`audit.yml` has no
  `should-run` input, same as `format.yml`).
- `build`'s filter swaps Gatsby's globs (`gatsby-config.ts` etc.,
  `static/**`) for Next.js's (`next.config.ts`, `public/**`); `lint`/
  `typecheck`'s globs needed no change.
- Verified without pushing: `npx js-yaml` parses the new file; `grep -rn
'resume-2026|mjoynes-wombat-web' .github/` finds nothing (the one
  `resume-2026` hit is prose in this task's own design-decision doc, not a
  workflow); `npm run lint`/`format:check`/`typecheck` all exit 0.
  **Not verifiable pre-push:** the real gate run — opening the PR triggers
  `pr-gate.yml` for the first time.
- Reasoning:
  [`../design-decisions/m0.20-pr-gate.md`](../design-decisions/m0.20-pr-gate.md).

## 2026-09-09 — M0.21 · merge-queue.yml ported (queue left off)

- Fetched resume-2026's `merge-queue.yml` via `gh api
repos/Aurora-Arctic/resume-2026/contents/.github/workflows/merge-queue.yml`
  and wired it to the same four reusable checks `pr-gate.yml` (M0.20) already
  consumes (`lint`, `format`, `typecheck`, `build` — no `audit`, matching
  upstream). Same three gaps as `pr-gate.yml`, filled the same way: `gitflow`
  (M0.22) dropped entirely rather than stood in for with `should-run: false`
  (nothing requires that check name yet, since no branch ruleset exists
  either); the real `build-image.yml` (M0.24) replaced by an ad hoc,
  run-scoped image build tagged `ghcr.io/.../testing:merge-queue-<run id>`;
  `vitest`/`playwright` (M1) as bare stub jobs under their real names.
- The live Asana task (M0.21, not `TASKS.md`'s frozen original) explicitly
  defers enabling "Require merge queue" in Settings → Branches to a new task,
  M7.A.1 — solo development gets nothing from queue serialization yet, and
  the switch forces every merge through the full suite. Left off on both
  `main` and `staging`; nothing in this diff touches branch protection.
- Kept no `changes`/path-filter job — upstream doesn't have one either, and
  `lint.yml`/`typecheck.yml`/`build.yml`'s `should-run` inputs already
  default `true` specifically so merge-queue call sites run everything
  unfiltered (documented in each since M0.16/M0.17, ahead of this task).
- Verified without pushing: `npx js-yaml` parses the new file; `grep -rn
'resume-2026|mjoynes-wombat-web' .github/` finds nothing new; `npm run
lint`/`format:check`/`typecheck`/`check:stories` all exit 0. **Not
  verifiable pre-push, and not verifiable at all until M7.A.1**: a real
  `merge_group` run — that event only fires once the queue is enabled on a
  branch's ruleset, which this task deliberately leaves off.
- Reasoning:
  [`../design-decisions/m0.21-merge-queue.md`](../design-decisions/m0.21-merge-queue.md).

## 2026-09-09 — M0.22 · gitflow.yml ported, branch rulesets wired

- Fetched resume-2026's `gitflow.yml` via `gh api
repos/Aurora-Arctic/resume-2026/contents/.github/workflows/gitflow.yml` and
  copied it byte-for-byte — no repo-specific path or checkout-to-app fix
  needed, since the file only reads the PR's own head/base refs and calls
  the four composite actions by their generic `./.github/actions/<name>`
  relative path.
- Added `gitflow` back to `pr-gate.yml` and `merge-queue.yml`'s job graphs,
  exactly as both files' own header/design-decision comments said M0.22
  would: a new `gitflow` job in each (`pr-gate.yml` passes the real PR
  number; `merge-queue.yml` passes `should-run: false`, matching upstream,
  since `merge_group` only exposes a synthetic head ref
  `refs/heads/gh-readonly-queue/<base>/pr-<n>-<sha>`, not the PR's actual
  source branch), and `needs: gitflow` added to every other job in both
  files (`lint`, `format`, `typecheck`, `build`, and the `vitest`/`playwright`
  stubs) — `audit` excluded, matching upstream, since it's PR-only and never
  a required check.
- **Branch rulesets — found unexpected pre-existing state first.** The repo
  already had three rulesets (`Deploy Branches` combining `main`+`staging`,
  plus separate near-duplicate `Main`/`Staging` ones, none with required
  status checks) that predate this task and aren't documented anywhere in
  `claude-docs` — the M0.21 design doc, written the day before, says "no
  ruleset exists yet." Asked the user rather than guessing how to reconcile
  upstream's three-ruleset shape (`Main`, `Staging`, `Release Branches`, no
  combined one) against this undocumented state. The user had already
  removed `Deploy Branches` and added a `Release Branches` ruleset
  (`refs/heads/release/**`, delete/force-push protection only — matches
  resume-2026's exactly) before answering, and asked to leave `Main`/
  `Staging` otherwise untouched.
- **Required status checks — added `gitflow / gitflow` only**, per the
  user's explicit choice, to both the `Main` and `Staging` rulesets'
  existing `pull_request` rule (neither had a `required_status_checks` rule
  at all before this). `lint`/`format`/`typecheck`/`build` — already real
  checks — and `vitest`/`playwright`/`build-image` — stubs or nonexistent —
  are deliberately left out of branch protection for now; a future task can
  add them once M1/M0.24 land, per the user's answer.
- **Blocked: could not apply the ruleset update via the API.**
  `gh api -X PUT repos/.../rulesets/<id>` returned `403 Resource not
accessible by personal access token` for both `Main` and `Staging` — this
  session's fine-grained PAT lacks the `Administration` repository
  permission rulesets require. Read access (listing/fetching rulesets)
  works fine; only the write is blocked. Reported to the user as a manual
  follow-up: add `gitflow / gitflow` as a required status check to both
  rulesets via the GitHub UI (Settings → Rules → Rulesets → Main/Staging →
  add a "Require status checks to pass" rule, or add to the existing one).
- `.github/dependabot.yml` created — didn't exist before. Three
  `package-ecosystem` entries (`npm`, `github-actions`, `docker` at
  `/Docker`, matching this repo's actual Docker directory name/location
  rather than resume-2026's `/Docker` — same path, no change needed), all
  `target-branch: staging`, weekly schedule — ported verbatim from
  resume-2026's file. The "exempt by author" half of the acceptance
  criteria is `gitflow.yml`'s own `dependabot[bot]` actor check, already
  covered by the workflow port above — there's no separate Dependabot-side
  setting for it.
- Verified without pushing: `npx js-yaml` parses all four touched/new files
  (`gitflow.yml`, `pr-gate.yml`, `merge-queue.yml`, `dependabot.yml`); `grep
-rn 'resume-2026|mjoynes-wombat-web' .github/` finds nothing new (one
  `resume-2026` hit is this task's own prose in `pr-gate.yml`'s header
  comment, not a workflow reference); `npm run
lint`/`format:check`/`typecheck`/`check:stories` all exit 0. **Not
  verifiable pre-push:** a live PR actually being rejected for a
  branch-mismatch (`gitflow / gitflow` failing) or a Dependabot PR
  exercising the author exception — both need a real PR against the pushed
  branch. **Not verifiable at all until the manual ruleset step above is
  done:** a feature-branch-into-`main` PR being _blocked from merging_ by
  branch protection specifically (the check will report failure either way;
  only the required-status-check wiring makes that failure actually block
  the merge button).
- Reasoning:
  [`../design-decisions/m0.22-gitflow-rulesets.md`](../design-decisions/m0.22-gitflow-rulesets.md).

## 2026-09-09 — M0.24 · build-image.yml ported, callers rewired

- Copied resume-2026's `build-image.yml` byte-for-byte into
  `.github/workflows/`. It's the reusable `workflow_call` job that builds the
  shared `testing` target once and returns its ref as an `image` output.
  Nothing in it is repo-specific: the tag is
  `ghcr.io/${github.repository,,}/testing:${{ hashFiles('Docker/Dockerfile.node',
'package-lock.json') }}`, so it publishes under
  `ghcr.io/aurora-arctic/sorrel-and-salt/` on its own — the same
  `github.repository`-derived scheme `build-db-image.yml` (M0.18) already
  uses for `/db`. "Change the GHCR tag to the new repo" was therefore a
  no-op edit; "no resume-2026 tag references remain" holds because there were
  never any literal ones. Header comment lightly reworded to point at this
  repo's own M0.16/M0.17 smoke workflows instead of resume-2026 context.
- `pr-gate.yml`: replaced the inline `build-image` job M0.20 stood in with
  (`runs-on: ubuntu-latest`, tag `testing:pr-gate-<run id>`, never reused) by
  `uses: ./.github/workflows/build-image.yml`. Kept the job-level
  `concurrency: { group: pr-gate-build-image-<pr number>, cancel-in-progress:
false }` on the caller — matches resume-2026's own `pr-gate.yml`, which
  keeps that group because `build-image` writes a shared `type=gha` layer
  cache a mid-push cancel can corrupt. Dropped the now-obsolete
  build-image bullet from the file's header comment.
- `merge-queue.yml`: same swap, no caller-side concurrency group — again
  matching upstream. M0.21's stand-in had a `merge-queue-build-image-<run id>`
  group only so its throwaway tag wouldn't collide with a concurrent PR
  gate's; with both callers on the one content-addressed tag that shared
  hit is the point, and the reusable workflow's `imagetools inspect`
  skip-if-exists check keeps a superseded queue run cheap.
- Left alone deliberately: `lint-format-typecheck-check.yml` /
  `build-audit-check.yml` keep their `smoke-<run id>` ad hoc image builds
  (independent regression checks for the per-check workflows, per M0.16's
  "Rules this sets"), and `makefile`'s `act-*` targets (local `act` builds
  the `testing` target directly and never calls this workflow or GHCR).
- Verified without pushing: `npx js-yaml` parses `build-image.yml`,
  `pr-gate.yml`, `merge-queue.yml`; `grep -rn
'resume-2026|mjoynes-wombat-web'` over the three finds only the
  pre-existing prose mention in `pr-gate.yml`'s header; `npm run
lint`/`format:check`/`typecheck`/`check:stories` all exit 0. **Not
  verifiable pre-merge:** the first `pr-gate.yml` run actually calling the
  reusable `build-image.yml` — opening this PR triggers it (the diff touches
  the workflow files), confirming the job builds and pushes
  `ghcr.io/aurora-arctic/sorrel-and-salt/testing:<hash>`, every downstream
  check pulls that exact tag via `needs.build-image.outputs.image`, and a
  re-run with the same hash skips the build. `merge-queue.yml`'s path stays
  unverifiable until the queue is enabled (M7.A.1).
- Reasoning:
  [`../design-decisions/m0.24-build-image.md`](../design-decisions/m0.24-build-image.md).

## 2026-09-09 — M0.26 · CLI-driven Vercel deploys

- Started as "disable deploy previews, alias staging". Hit the Vercel Hobby
  wall: a named `staging` environment on `staging.sorrelandsalt.com` needs
  Pro (Custom Environments are Pro/Enterprise). Rather than take the bare
  `…-git-staging-<scope>.vercel.app` alias, switched the whole deploy model
  from Vercel's Git integration to CLI-driven deploys from CI. Larger than
  the 1h estimate and supersedes M0.25 — done deliberately, user-directed.
- New `.github/workflows/deploy.yml`. Triggers: **push** to `main` / `staging`,
  and **`pull_request` into `main` from a `hotfix/**` head** (types
  opened/synchronize/reopened/closed). One `deploy` job + one `teardown` job,
  bare `ubuntu-latest` (needs the Vercel CLI and writes `.vercel/output` —
  the shared `testing` image is not built for that; same call
  `composite-actions-check.yml` made). `deploy` steps: `actions/checkout@v7`,
  `actions/setup-node@v4` (Node 22, npm cache), `npm ci`,
  `npm i -g vercel@59`, resolve target from event/ref/head-ref, `timer-start`,
  `vercel pull --yes --environment=<production|preview>`,
  `vercel build [--prod]`, `vercel deploy --prebuilt [--prod]`
  (stdout→`deploy-url.txt`, stderr→`deploy.log`, per Vercel's CI example),
  `vercel alias set` for the preview targets, `timer-elapsed`, `job-summary`,
  and — on `pull_request` events — `pr-comment` (`success-mode: comment`)
  posting the preview URL. `teardown` runs on a closed hotfix PR:
  `vercel alias rm hotfix-<slug>.sorrelandsalt.com`.
- Target resolution: `pull_request` (hotfix) → preview +
  `hotfix-<slug>.sorrelandsalt.com`, `<slug>` = head ref after `hotfix/`,
  lowercased and reduced to a DNS label (≤56 chars so `hotfix-` + label ≤63);
  push `main` → `--prod`, no alias (prod deploy assigns `sorrelandsalt.com`);
  push `staging` → preview + `staging.sorrelandsalt.com`.
- Hotfix deploys on the PR, not push: reviewers want a click-through preview
  at review time, and the fix reaches prod via its own `main` PR anyway.
  `create-pr` opens hotfix PRs into both `main` and `staging`; the trigger's
  `branches: [main]` means only one deploys. `pull_request` (not
  `pull_request_target`) is safe — hotfix branches are never forks, so the
  run gets the `VERCEL_*` secrets with no untrusted checkout.
- Per-hotfix domains (`hotfix-<slug>.sorrelandsalt.com`) need a wildcard
  `*.sorrelandsalt.com` on the project. Wildcards are Hobby-OK but require
  the domain on **Vercel nameservers** (`/docs/domains/.../add-a-domain`).
  That's the one manual prerequisite for the hotfix path; `main`/`staging`
  work with plain CNAME/A. `teardown` prunes aliases so they don't hit the
  Hobby 50-domain cap.
- `vercel.json`: `git.deploymentEnabled` allow-list (`main`/`staging`/
  `hotfix/*` → `true`, M0.25) collapsed to `{ "**": false }` — the Git
  integration ships nothing regardless of whether it stays connected.
- Guard step: if `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` are
  absent it emits a `::warning::` and every real step is `if:`-skipped, so
  the job is green until M0.27 adds those secrets (plus `VERCEL_SCOPE` for
  `vercel alias`). Same stub-now/wire-later shape as `pr-gate.yml`'s
  `vitest`/`playwright` jobs.
- `--prebuilt` means System Environment Variables are missing at build time;
  fine here — nothing in the Next build reads them.
- Docs: DESIGN.md §4 "Configuration" rewritten for the CLI model; §12 table
  gains a `deploy.yml` row and notes `migrate.yml` (M1.4) must run ahead of
  it and that `vercel.json` no longer drives deploys. README + CLAUDE.md get
  a one-line deploy note.
- Verified without pushing: `npx js-yaml` parses `deploy.yml` (`actionlint`
  unavailable via `npx`, as in M0.24); `vercel.json` valid JSON;
  `npm run lint`/`format:check`/`typecheck`/`check:stories` all exit 0;
  command sequence checked against `/docs/cli/deploy`, `/docs/cli/alias`,
  `/kb/guide/how-to-alias-a-preview-deployment-using-the-cli` (2026-08).
  **Not verifiable pre-merge:** the first real run needs M0.27's `VERCEL_*`
  secrets, the live project, and `*.sorrelandsalt.com` on Vercel nameservers
  — push to `staging` serving `staging.sorrelandsalt.com`, push to `main`
  serving `sorrelandsalt.com`, a `hotfix/** → main` PR serving
  `hotfix-<slug>.sorrelandsalt.com` and commenting it, PR close removing the
  alias, no deploy anywhere else.
- Reasoning:
  [`../design-decisions/m0.26-disable-previews-and-alias-staging.md`](../design-decisions/m0.26-disable-previews-and-alias-staging.md).
