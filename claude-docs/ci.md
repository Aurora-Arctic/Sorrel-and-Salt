# CI pipeline — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

`.github/` — the workflows and the composite actions they share. Nothing under
`.github/workflows/` hardcodes a repo name except `checkout-to-app`'s callers
(see below); everything else derives from `github.repository`.

## Composite actions

`.github/actions/` — five actions.

- **`checkout-to-app`** — `actions/checkout` + `cp -a "$GITHUB_WORKSPACE"/. /app/`.
  Every other local action resolves as `./.github/actions/<name>` once checked
  out; this one runs _before_ that checkout exists, so **callers must reference
  it by full `Aurora-Arctic/Sorrel-and-Salt/...@main` path**.
- **`timer-start`** / **`timer-elapsed`** — epoch-seconds start output,
  formatted `12s` / `1m 34s` duration output.
- **`job-summary`** — a pass/fail `$GITHUB_STEP_SUMMARY` callout, with a tailed
  log excerpt on failure.
- **`pr-comment`** — upserts one marked comment per check (`<!-- ci-<slug> -->`),
  in `minimize` (resolve-on-pass) or `comment` (always post) mode, plus a
  separate fail-only thread for `merge-queue: true` callers.

## Reusable checks (`workflow_call`, never triggered directly)

- **`{lint,format,typecheck}.yml`** — each runs its `npm run <check>` in a
  `container: image: ${{ inputs.image }}` job (`options: --user root`),
  summarizes the tool's raw output into a one-line stat plus a capped
  collapsible breakdown, and reports through `job-summary` / `pr-comment`.
  `lint` and `typecheck` take a `should-run` input for path-filtering;
  **`format` has none and always runs**, since Prettier covers non-code files.

- **`build.yml`** — `npm run build` (`next build`) in the same container shape,
  caching `.next/cache` via `actions/cache`. Then, gated by the same
  `should-run`: `npm run check:stories` and `npm run workshop:build`.
  - **The cache `path` is the absolute `/app/.next/cache`**, not a
    workspace-relative path: `hashFiles()` reads `$GITHUB_WORKSPACE`, but the
    job's working directory is `/app`.
  - **`package.json`'s `build` script forces `NODE_ENV=production`.** The
    `testing` image bakes in `NODE_ENV=test`, and Turbopack crashes prerendering
    `/_global-error` under anything but `production`/unset — without the force,
    every real `build / build` run fails.
- **`audit.yml`** — `npm audit --json`, always exits clean (`continue-on-error`
  plus a trailing `|| true`), comments a severity/package breakdown on the PR.
  Deliberately non-blocking and **never a required status check**. Reports
  through raw `actions/github-script` rather than the composite actions.
- **`build-image.yml`** — builds the shared `testing` image once and exposes its
  ref as an `image` output. Tag is content-addressed:
  `ghcr.io/${github.repository,,}/testing:${{ hashFiles('Docker/Dockerfile.node', 'package-lock.json') }}`,
  and a `docker buildx imagetools inspect` check skips the build entirely when
  that hash already has a pushed image.
- **`gitflow.yml`** — enforces which source branch may PR into which target:
  `feature/*` → `staging`; `release/MAJOR.MINOR.PATCH` or `hotfix/*` → `main`;
  `staging` or `hotfix/*` → `release/*`; `main-sync/YYYY-MM-DD-HH-MM-SS` →
  `staging`. Standing exception: Dependabot PRs into `staging` pass regardless
  of branch name, **checked by PR author (`dependabot[bot]`), not by branch
  pattern** — a naming exception would let anyone claim it. This workflow is the
  source of truth for the branch-source rules.

## Aggregating workflows

- **`pr-gate.yml`** — path-filters `lint`/`typecheck`/`build` via
  `dorny/paths-filter` (`format` always runs), calls every reusable check, and
  carries stub `vitest`/`playwright` jobs (real job names, one no-op step) so M1
  can wire them in without renaming a required check. Its `build-image` job
  keeps a `pr-gate-build-image-<pr number>` / `cancel-in-progress: false`
  concurrency group on the caller.
- **`merge-queue.yml`** — the `merge_group` counterpart, calling the same
  `lint`/`format`/`typecheck`/`build` (no `audit` — PR-only) with
  `merge-queue: true`, and no caller-side concurrency group. **"Require merge
  queue" is deliberately OFF** on `main` and `staging`: the workflow exists but
  `merge_group` never fires until M7.A.1 flips that setting, once there is more
  than one contributor.
- Both `needs: gitflow` on every other job. `merge-queue.yml` calls it with
  `should-run: false`, since `merge_group` events expose only a synthetic head
  ref, not the PR's real source branch.
- **Branch rulesets** — `Main`, `Staging` and `Release Branches`
  (`refs/heads/release/**`) exist and carry delete/force-push protection.
  `.github/dependabot.yml` targets `staging` on all three ecosystems (`npm`,
  `github-actions`, `docker`).
- ⚠️ **No ruleset currently requires any status check** — verified against the
  live API 2026-09-10. Adding `gitflow / gitflow` to `Main` and `Staging` needs
  a PAT with `Administration` scope (the write returns `403` without it) or the
  GitHub UI, and until it is done the gitflow workflow reports but **blocks
  nothing**.
- **A required-check job must never carry a job-level `if:`.** GitHub then
  reports a bare, unqualified check name that `job / job` protection can never
  match. That is why the `vitest`/`playwright` stubs are unconditional no-ops
  and why skipping is done through `should-run` inputs instead.
- **Live GitHub settings are confirmed with the user before being changed**, and
  a permissions-blocked write is reported rather than routed around.

## Independent smoke checks

These build their own ad hoc image (`ghcr.io/.../testing:smoke-<run id>`, never
reused across runs) rather than consuming `build-image.yml` — deliberate, so a
regression check never runs through the thing it is testing.

- **`composite-actions-check.yml`** — exercises all five composite actions
  together. Runs on the bare `ubuntu-latest` runner, so it adds its own
  "Prepare /app" step ahead of `checkout-to-app`.
- **`lint-format-typecheck-check.yml`** — exercises the three reusable checks
  directly. Triggers on `pull_request` (paths: those workflows, this workflow,
  `.github/actions/**`, `Docker/Dockerfile.node`, each check's own config) and
  `workflow_dispatch`.
- **`build-audit-check.yml`** — the same for `build`/`audit`. `audit`'s job is
  gated to the `pull_request` trigger only: its `pr-number` input is required
  and used unguarded, so it would break on `workflow_dispatch`.

## Database image

- **`POSTGRES_PASSWORD` must never be a Dockerfile `ARG` or `ENV`** — GitHub's
  `SecretsUsedInArgOrEnv` build check flags it. Generate it with `export` inside
  the `RUN` step instead. `POSTGRES_HOST_AUTH_METHOD=trust` was considered as
  the fix and **rejected**: it bakes passwordless auth into the shipped
  `pg_hba.conf`.
- **`Docker/Dockerfile.postgres`** — `FROM postgres:17` with `pg_trgm` (the only
  extension §5 names) and an empty `sorrel_template` database baked in at
  _build_ time, by running the official image's own `docker-entrypoint.sh`
  inside a `RUN` step instead of leaving it to first boot. No schema or seed
  data yet; M1.27 extends this image once `src/db/schema` exists.
- **`build-db-image.yml`** — builds and publishes it to GHCR, tagged with a
  `hashFiles()` hash of `src/db/**` / `Docker/Dockerfile.postgres` /
  `Docker/postgres-init/**`, plus `latest` (moved only on push to
  `staging`/`main`, never from a PR). The same path list gates the trigger, so
  "rebuild is skipped" is the trigger itself, not a no-op job. Runs on
  `pull_request` too, since the content-addressed tag makes a PR build reusable.
  **It deliberately has no skip-if-exists check** (unlike `build-image.yml`) —
  its trigger paths are exactly its hash inputs, so the trigger already does it.

- **`verify-db-image`** — a second job consuming that image the way §11 says a
  real M1 test job will: a job-level `services:` postgres container keyed to
  `needs.build-db-image.outputs.image` (the hash tag, never reconstructed),
  then `docker exec <service-id> psql -U postgres -d sorrel_template -c 'SELECT 1'`.
  **`docker exec`, not a TCP connection** — the image's `host` auth rules need a
  password that was generated randomly and discarded at build time, while the
  `local` (Unix-socket) rule stays `trust`. Scaffolding: delete it once a real
  M1 test job exercises the same pattern.

## Deploy

**`deploy.yml`** — CLI-driven Vercel deploy (`vercel pull` → `vercel build` →
`vercel deploy --prebuilt` → `vercel alias`). `vercel.json` sets
`deploymentEnabled: { "**": false }`, so Vercel's Git integration deploys
nothing and this workflow is the only path.

- **Triggers** — push to `main` (`--prod`, `sorrelandsalt.com`); push to
  `staging` (Preview aliased to `staging.sorrelandsalt.com`); and a
  `pull_request` into `main` from a `hotfix/**` head (Preview aliased to a
  per-PR `hotfix-<slug>.sorrelandsalt.com`, URL posted with `pr-comment`, alias
  removed by a `teardown` job on close). The `hotfix/** → staging` PR that
  `create-pr` also opens is skipped (`branches: [main]`).
- `pull_request`, not `pull_request_target` — hotfix branches are never forks.
- The per-hotfix domains need a wildcard `*.sorrelandsalt.com` (Vercel
  nameservers, Hobby-OK).
- Bare `ubuntu-latest` runner (needs the Vercel CLI, writes `.vercel/output`),
  with `actions/setup-node@v4` **pinned to Node 26.6.0** to match
  `Docker/Dockerfile.node` — under Node 22, `npm ci` fails because npm 10 cannot
  read the npm-11 lockfile for `typescript@7`'s per-platform deps.
- **`VERCEL_DEPLOY_TOKEN` must be minted against the `aurora-arctic` team
  scope**, not a personal scope. A personal-scope token is accepted as valid and
  then fails at `vercel pull` with `Could not retrieve Project Settings…`.
- **`vercel.json`'s catch-all must stay `"**": false`.** Keys are minimatch, so
  `"*"` stops at `/` and would miss `feature/*`; and any single `true` rule wins
  the tiebreak. Re-enabling a branch means adding a key, never loosening the
  catch-all.
- A guard step skips every real step unless `VERCEL_DEPLOY_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_SCOPE` are set. All four are
  set as repo secrets, so the deploy runs for real.
- `migrate.yml` (M1.4) will run ahead of the deploy step.

## Running CI locally

**`.actrc` + `make act-*`** — run the reusable checks through
[`act`](https://github.com/nektos/act) against a locally-built
`Docker/Dockerfile.node` `testing` image (`act-image`). `.actrc` carries
`-P ubuntu-latest=catthehacker/ubuntu:act-latest` and `--pull=false`.

- `make act-lint`, `act-format`, `act-typecheck`, and `act-test` for all three.
- `make act-cache-checkout` pre-clones this repo's `main` so the remote
  `checkout-to-app@main` ref resolves offline.
- lint/typecheck need `--input should-run=true` — act does not apply
  `workflow_call` input defaults.
- **`act-build` / `act-vitest` / `act-playwright` do not exist.** `act-build`
  needs `actions/cache` pre-cached the way `act-cache-checkout` pre-caches
  `checkout-to-app`; the other two wait on their M1 workflows.
- **Every new reusable check workflow ships its `act-<name>` target in the same
  PR**, plus an `act-cache-*` pre-clone for any action that isn't cached yet.
