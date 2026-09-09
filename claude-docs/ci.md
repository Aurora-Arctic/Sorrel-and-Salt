# CI pipeline — summary

Full history: [`transcripts/ci.md`](transcripts/ci.md) ·
Decisions: [`design-decisions/`](design-decisions/)

`.github/` — GitHub Actions workflows and the composite actions they share,
ported from `resume-2026`. Nothing here is wired into a real check yet; that
starts with M0.16.

- **`.github/actions/`** — five composite actions, copied byte-for-byte from
  resume-2026 (none hardcode a repo name internally):
  - **`checkout-to-app`** — `actions/checkout` + `cp -a "$GITHUB_WORKSPACE"/. /app/`.
    Every other local action below resolves as `./.github/actions/<name>`
    once checked out; this one runs *before* that checkout exists, so every
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
- **`.github/workflows/composite-actions-check.yml`** (M0.15) — the only
  workflow that exists so far. Not one of the named per-check workflows
  (those start at M0.16); it exists solely to exercise all five composite
  actions together and prove they resolve, independent of whatever real
  checks come to depend on them. Runs on `pull_request` for changes under
  `.github/actions/**` (plus itself) and on `workflow_dispatch`. Runs on the
  bare `ubuntu-latest` runner, not a container — the "testing" GHCR image
  the real check workflows will use doesn't exist until M0.24 — so it adds
  its own "Prepare /app" step ahead of `checkout-to-app`.
- **Not yet ported:** `lint`/`format`/`typecheck` (M0.16), `build`/`audit`
  (M0.17), the base Postgres image (M0.18) and its consumption in CI/compose
  (M0.19), `pr-gate.yml` (M0.20), `merge-queue.yml` (M0.21), `gitflow.yml` and
  branch rulesets (M0.22), `.actrc`/`make act-*` (M0.23), `build-image.yml`
  (M0.24).
