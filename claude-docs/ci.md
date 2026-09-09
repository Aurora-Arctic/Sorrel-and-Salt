# CI pipeline — summary

Full history: [`transcripts/ci.md`](transcripts/ci.md) ·
Decisions: [`design-decisions/`](design-decisions/)

`.github/` — GitHub Actions workflows and the composite actions they share,
ported from `resume-2026`. `lint`/`format`/`typecheck` (M0.16) are the first
real per-check workflows; nothing consumes them for real yet — that starts
with `pr-gate.yml` (M0.20).

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
  Runs on the bare `ubuntu-latest` runner, not a container — the "testing"
  GHCR image the real check workflows will use doesn't exist until M0.24 —
  so it adds its own "Prepare /app" step ahead of `checkout-to-app`.
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
  they wait for a caller (`pr-gate.yml`/`merge-queue.yml`, both later tasks).
- **`.github/workflows/lint-format-typecheck-check.yml`** (M0.16) — the
  workflow that actually calls the three above, since `pr-gate.yml` doesn't
  exist yet. Builds `Docker/Dockerfile.node`'s `testing` target ad hoc and
  pushes it to GHCR under a tag scoped to the run
  (`ghcr.io/.../testing:smoke-<run id>`, never reused across runs) — the
  real `build-image.yml` (M0.24) content-addresses and caches this properly
  for every caller to share, but porting it early would leave M0.24 redoing
  work against its own acceptance criteria, the same call M0.15 made for
  `composite-actions-check.yml`. Triggers on `pull_request` (paths: the three
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
  every real `build / build` CI run would fail). `audit` runs `npm audit
--json`, always exits clean
  (`continue-on-error` + `|| true`), and comments a severity/package
  breakdown on the PR — deliberately non-blocking and never a required
  status check, ported verbatim including its raw `actions/github-script`
  reporting (unlike `lint`/`format`/`typecheck`, it doesn't route through the
  `job-summary`/`pr-comment` composite actions — that's upstream's own
  design, confirmed against the live resume-2026 source). Neither is
  triggered directly; both wait for a caller (`pr-gate.yml`, a later task).
  Reasoning: [`design-decisions/m0.17-build-audit-workflows.md`](design-decisions/m0.17-build-audit-workflows.md).
- **`.github/workflows/build-audit-check.yml`** (M0.17) — the workflow that
  actually calls the two above, mirroring `lint-format-typecheck-check.yml`'s
  ad hoc smoke-image pattern. `audit`'s job is gated to the `pull_request`
  trigger only, since its `pr-number` input is required and used unguarded
  (unlike `lint`/`format`/`typecheck`'s optional one) and would break on
  `workflow_dispatch`, which has no PR number.
- **Not yet ported:** the base Postgres image (M0.18) and its consumption in
  CI/compose (M0.19), `pr-gate.yml` (M0.20), `merge-queue.yml` (M0.21),
  `gitflow.yml` and branch rulesets (M0.22), `.actrc`/`make act-*` (M0.23),
  `build-image.yml` (M0.24).
