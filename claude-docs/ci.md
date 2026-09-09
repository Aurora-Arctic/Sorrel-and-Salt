# CI pipeline — summary

Full history: [`transcripts/ci.md`](transcripts/ci.md) ·
Decisions: [`design-decisions/`](design-decisions/)

`.github/` — GitHub Actions workflows and the composite actions they share,
ported from `resume-2026`. `lint`/`format`/`typecheck` (M0.16) are the first
real per-check workflows; `pr-gate.yml` (M0.20) is the real gate that now
consumes them for real, alongside `build`/`audit` (M0.17).

- **`.github/actions/`** — five composite actions, copied byte-for-byte from
  resume-2026 (none hardcode a repo name internally):
  - **`checkout-to-app`** — `actions/checkout` + `cp -a "$GITHUB_WORKSPACE"/. /app/`.
    Every other local action below resolves as `./.github/actions/<name>`
    once checked out; this one runs _before_ that checkout exists, so every
    caller must reference it by full `owner/repo` path instead — the one
    hardcoded reference the port changes, from resume-2026's own path to
    `Aurora-Arctic/Sorrel-and-Salt`.
  - **`timer-start`** / **`timer-elapsed`** — epoch-seconds start output,
    formatted `12s` / `1m 34s` duration output.
  - **`job-summary`** — writes a pass/fail `$GITHUB_STEP_SUMMARY` callout,
    with a tailed log excerpt on failure.
  - **`pr-comment`** — upserts one marked PR comment per check
    (`<!-- ci-<slug> -->`), `minimize` (resolve-on-pass) or `comment`
    (always post) success mode, and a separate fail-only thread for
    `merge-queue: true` callers.
  - Reasoning:
    [`design-decisions/m0.15-composite-actions.md`](design-decisions/m0.15-composite-actions.md).
- **`.github/workflows/composite-actions-check.yml`** (M0.15) — exercises all
  five composite actions together and proves they resolve, independent of
  whatever real checks come to depend on them. Runs on `pull_request` for
  changes under `.github/actions/**` (plus itself) and on `workflow_dispatch`.
  Runs on the bare `ubuntu-latest` runner rather than the shared `testing`
  image, so it adds its own "Prepare /app" step ahead of `checkout-to-app`.
- **`.github/workflows/{lint,format,typecheck}.yml`** (M0.16) — reusable
  `workflow_call` workflows, copied from resume-2026 with the same
  `checkout-to-app` repo-path fix as the composite actions. Each runs its
  `npm run <check>` inside a `container: image: ${{ inputs.image }}` job
  (`options: --user root`, matching `composite-actions-check.yml`'s "Prepare
  /app" reasoning but via the container's own root user instead), summarizes
  its tool's raw output into a one-line stat plus a capped collapsible
  breakdown, and reports through `job-summary`/`pr-comment`. `lint` and
  `typecheck` carry a `should-run` input for `pr-gate.yml`'s (M0.20)
  path-filtering; `format` doesn't — Prettier covers non-code files too, so
  it always runs regardless of what changed. None are triggered directly;
  `pr-gate.yml` and `merge-queue.yml` call them.
- **`.github/workflows/lint-format-typecheck-check.yml`** (M0.16) — an
  independent regression check on the three reusable workflows above,
  exercising them on their own rather than through `pr-gate.yml`'s aggregate
  run. Builds `Docker/Dockerfile.node`'s `testing` target ad hoc and
  pushes it to GHCR under a tag scoped to the run
  (`ghcr.io/.../testing:smoke-<run id>`, never reused across runs) instead of
  sharing `build-image.yml`'s (M0.24) content-addressed image — deliberate, so
  the smoke check stays independent of the thing it would otherwise test
  through. Triggers on `pull_request` (paths: the three
  check workflows, this workflow, `.github/actions/**`, `Docker/Dockerfile.node`,
  and each check's own config/manifest files) and `workflow_dispatch`.
  Reasoning: [`design-decisions/m0.16-lint-format-typecheck-workflows.md`](design-decisions/m0.16-lint-format-typecheck-workflows.md).
- **`.github/workflows/{build,audit}.yml`** (M0.17) — reusable `workflow_call`
  workflows, copied from resume-2026 with the same `checkout-to-app`
  repo-path fix. `build` runs `npm run build` (`next build`) inside a
  `container: image: ${{ inputs.image }}` job and now also caches
  `.next/cache` via `actions/cache`, per Next's own CI-caching guide — the
  one substantive change from upstream, since Gatsby's `build.yml` cached
  nothing. `package.json`'s `build` script now forces `NODE_ENV=production`
  (`Docker/Dockerfile.node`'s `testing` stage — the image `build.yml` runs
  against — bakes in `NODE_ENV=test`, and Turbopack crashes prerendering
  `/_global-error` under anything but `production`/unset; without the fix
  every real `build / build` CI run would fail). **M0.36** added two more
  steps after `npm run build`, gated by the same `should-run`: `npm run
check:stories` (M0.33's gate) and `npm run workshop:build` (now wrapped by
  `scripts/build-workshop.ts` — bare `ladle build` never exits non-zero, an
  upstream `@ladle/react` 5.1.1 gap; see
  [`design-decisions/m0.36-ci-story-gate.md`](design-decisions/m0.36-ci-story-gate.md)).
  `audit` runs `npm audit
--json`, always exits clean
  (`continue-on-error` + `|| true`), and comments a severity/package
  breakdown on the PR — deliberately non-blocking and never a required
  status check, ported verbatim including its raw `actions/github-script`
  reporting (unlike `lint`/`format`/`typecheck`, it doesn't route through the
  `job-summary`/`pr-comment` composite actions — that's upstream's own
  design, confirmed against the live resume-2026 source). Neither is
  triggered directly; `pr-gate.yml` calls both.
  Reasoning: [`design-decisions/m0.17-build-audit-workflows.md`](design-decisions/m0.17-build-audit-workflows.md).
- **`.github/workflows/build-audit-check.yml`** (M0.17) — the workflow that
  actually calls the two above, mirroring `lint-format-typecheck-check.yml`'s
  ad hoc smoke-image pattern. `audit`'s job is gated to the `pull_request`
  trigger only, since its `pr-number` input is required and used unguarded
  (unlike `lint`/`format`/`typecheck`'s optional one) and would break on
  `workflow_dispatch`, which has no PR number.
- **`Docker/Dockerfile.postgres`** (M0.18) — `FROM postgres:17`, with
  `pg_trgm` (the only extension DESIGN.md §5 names) and an empty
  `sorrel_template` database baked into the image at _build_ time by running
  the official image's own first-boot init (`docker-entrypoint.sh`) inside a
  `RUN` step, instead of leaving it for a container's first start. No schema
  or seed data yet — `src/db/schema` is still empty; M1.27 extends this same
  image once there is one.
- **`.github/workflows/build-db-image.yml`** (M0.18) — builds that Dockerfile
  and publishes it to GHCR, tagged with a `hashFiles()` hash of
  `src/db/**`/`Docker/Dockerfile.postgres`/`Docker/postgres-init/**` plus
  `latest` (only moved on `push` to `staging`/`main`, never from a PR). The
  same path list gates the trigger, so an unrelated PR never runs this
  workflow — "rebuild is skipped" is the trigger itself, not a no-op job.
  Runs on `pull_request` too, since the content-addressed tag makes a PR
  build reusable rather than throwaway. Reasoning:
  [`design-decisions/m0.18-build-db-image.md`](design-decisions/m0.18-build-db-image.md).
  - **`verify-db-image`** (M0.19) — a second job, `needs: build-db-image`,
    consuming the image the same way DESIGN.md §11 says a real M1 test job
    eventually will: a job-level `services:` postgres container, keyed to
    `needs.build-db-image.outputs.image` (the hash tag, never
    reconstructed). Actions blocks every step until the service's
    `pg_isready` health check passes, then one step runs
    `docker exec <service-id> psql -U postgres -d sorrel_template -c
'SELECT 1'` — `docker exec`, not a TCP connection, because the image's
    `host` (network) auth rules require a password that was generated
    randomly and discarded at build time (M0.18), while the `local`
    (Unix-socket) rule `docker exec` uses stays `trust`. Scaffolding: delete
    it once a real M1 test job exercises the same `services:` pattern for
    real. Reasoning:
    [`design-decisions/m0.19-consume-db-image.md`](design-decisions/m0.19-consume-db-image.md).
- **`.github/workflows/pr-gate.yml`** (M0.20) — the aggregating gate the two
  smoke workflows above originally stood in for. Path-filters
  `lint`/`typecheck`/`build` via `dorny/paths-filter` (`format` always runs),
  calls all five reusable checks, and carries stub `vitest`/`playwright` jobs
  (real job names, one no-op step) so M1 can wire them in without a
  required-check rename. Its `build-image` job is
  `uses: ./.github/workflows/build-image.yml` (M0.24), keeping its
  `pr-gate-build-image-<pr number>` / `cancel-in-progress: false`
  concurrency group on the caller. Reasoning:
  [`design-decisions/m0.20-pr-gate.md`](design-decisions/m0.20-pr-gate.md).
- **`.github/workflows/merge-queue.yml`** (M0.21) — the `merge_group`-triggered
  counterpart to `pr-gate.yml`, calling the same `lint`/`format`/`typecheck`/
  `build` (no `audit` — PR-only, never a required check) with `merge-queue:
true` where each reusable workflow supports it. Its `build-image` job is
  `uses: ./.github/workflows/build-image.yml` (M0.24) with no caller-side
  concurrency group (unlike `pr-gate.yml`, this caller has no sibling jobs to
  shield from a mid-push cancel); `vitest`/`playwright` (M1) are still stub
  jobs. **"Require merge queue" is
  deliberately left OFF** on `main` and
  `staging` — the workflow exists but `merge_group` never fires until M7.A.1
  flips that branch-protection setting, once there's more than one
  contributor. Reasoning:
  [`design-decisions/m0.21-merge-queue.md`](design-decisions/m0.21-merge-queue.md).
- **`.github/workflows/gitflow.yml`** (M0.22) — reusable `workflow_call`
  check enforcing which source branches may PR into which target branch
  (`feature/*` → `staging`; `release/MAJOR.MINOR.PATCH` or `hotfix/*` →
  `main`; `staging` or `hotfix/*` → `release/*`; `main-sync/YYYY-MM-DD-HH-MM-SS`
  → `staging`), plus a standing exception letting Dependabot's PRs into
  `staging` through regardless of branch name (checked by PR author,
  `dependabot[bot]`, not by branch pattern — a naming exception would let
  anyone claim it). Ported byte-for-byte, no repo-specific paths to fix.
  `pr-gate.yml` and `merge-queue.yml` both now `needs: gitflow` on every
  other job (`merge-queue.yml` calls it with `should-run: false`, since
  `merge_group` events expose only a synthetic head ref, not a PR's real
  source branch — see the file's own header comment). Branch rulesets:
  `Main`/`Staging` (already existed) each gained `gitflow / gitflow` as a
  required status check; a new `Release Branches` ruleset
  (`refs/heads/release/**`, delete/force-push protection only, no required
  checks) matches resume-2026's. `.github/dependabot.yml` targets `staging`
  on all three ecosystems (`npm`, `github-actions`, `docker`). Reasoning:
  [`design-decisions/m0.22-gitflow-rulesets.md`](design-decisions/m0.22-gitflow-rulesets.md).
- **`.actrc` + `make act-*`** (M0.23) — run the reusable check workflows
  locally through [`act`](https://github.com/nektos/act), against a
  locally-built `Docker/Dockerfile.node` `testing` image (`act-image`), so a
  failing check surfaces before pushing. `.actrc` is resume-2026's two
  directives (`-P ubuntu-latest=catthehacker/ubuntu:act-latest`,
  `--pull=false`). `make act-lint`, `act-format`, `act-typecheck` (and
  `act-test` for all three) are green on the host; `act-cache-checkout`
  pre-clones this repo's `main` so the remote `checkout-to-app@main` ref
  resolves offline. Needed `bash`/`git` added to the `testing` stage (the
  alpine base ships neither, and the workflows force `shell: bash`) and
  `--input should-run=true` on lint/typecheck (act doesn't apply
  `workflow_call` input defaults). `act-build`/`act-vitest`/`act-playwright`
  do not exist as targets yet: `act-build` needs `actions/cache` pre-cached
  the way `act-cache-checkout` pre-caches `checkout-to-app`, and the other
  two wait on their M1 workflows. Reasoning:
  [`design-decisions/m0.23-act-local-ci.md`](design-decisions/m0.23-act-local-ci.md).
- **`.github/workflows/build-image.yml`** (M0.24) — the reusable
  `workflow_call` job `pr-gate.yml` and `merge-queue.yml` now call first to
  build the shared `testing` container image once and expose its ref as an
  `image` output. Ported byte-for-byte from resume-2026: the tag is
  `ghcr.io/${github.repository,,}/testing:${{ hashFiles('Docker/Dockerfile.node',
'package-lock.json') }}`, so it lands under
  `ghcr.io/aurora-arctic/sorrel-and-salt/` with nothing hardcoded to change
  (same `github.repository`-derived scheme as `build-db-image.yml`'s `/db`
  image), and a `docker buildx imagetools inspect` check skips the build
  entirely when that content hash already has a pushed image. This replaces
  the ad hoc `testing:pr-gate-<run id>` / `testing:merge-queue-<run id>`
  builds M0.20/M0.21 stood in with; the two smoke workflows
  (`lint-format-typecheck-check.yml`, `build-audit-check.yml`) keep their own
  `smoke-<run id>` builds, being independent regression checks by design.
  Reasoning:
  [`design-decisions/m0.24-build-image.md`](design-decisions/m0.24-build-image.md).
- **`.github/workflows/deploy.yml`** (M0.26) — CLI-driven Vercel deploy
  (`vercel pull` → `vercel build` → `vercel deploy --prebuilt` →
  `vercel alias`) replacing Vercel's Git integration, which `vercel.json` now
  disables for every branch (`deploymentEnabled: { "**": false }`,
  superseding M0.25's allow-list). Triggers on **push** to `main` (deploys
  `--prod` to `sorrelandsalt.com`) and `staging` (Preview aliased to
  `staging.sorrelandsalt.com`), and on a **`pull_request` into `main` from a
  `hotfix/**` head** — a Preview aliased to a per-PR
  `hotfix-<slug>.sorrelandsalt.com`, URL posted with `pr-comment`, alias
  removed by a `teardown` job when the PR closes. The `hotfix/** → staging`
  PR the `create-pr` skill also opens is skipped (`branches: [main]`).
  `pull_request` not `pull_request_target` — hotfix branches are never forks.
  The per-hotfix domains need a wildcard `*.sorrelandsalt.com` (Vercel
  nameservers, Hobby-OK). Bare `ubuntu-latest` runner (needs the Vercel CLI,
  writes `.vercel/output`), `actions/setup-node@v4` pinned to **Node 26.6.0**
  (matches `Docker/Dockerfile.node`; see M0.28), and the `timer-start` /
  `timer-elapsed` / `job-summary` / `pr-comment` composite actions. A guard
  step skips every real step unless `VERCEL_DEPLOY_TOKEN` / `VERCEL_ORG_ID` /
  `VERCEL_PROJECT_ID` / `VERCEL_SCOPE` are set — added as repo secrets
  2026-09-09, so the deploy now runs for real. `migrate.yml` (M1.4) will run
  ahead of the deploy step.
  Reasoning:
  [`design-decisions/m0.26-disable-previews-and-alias-staging.md`](design-decisions/m0.26-disable-previews-and-alias-staging.md).
- **M0.28** proved the pipeline end to end on the trivial page and, in doing
  so, caught `deploy.yml`'s `npm ci` failing under its ported Node 22 (npm 10
  can't read the npm-11 lockfile for `typescript@7`'s per-platform deps) —
  fixed by the Node 26.6.0 pin above. Build-time baseline recorded there.
  Reasoning:
  [`design-decisions/m0.28-pipeline-proof-and-node-26.md`](design-decisions/m0.28-pipeline-proof-and-node-26.md).
