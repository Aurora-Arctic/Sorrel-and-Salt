# CI pipeline — transcript

Append-only. Newest entry at the bottom. Summary: [`../ci.md`](../ci.md).

## 2026-09-09 — M0.15 · shared composite actions ported

- `.github/actions/{checkout-to-app,job-summary,pr-comment,timer-elapsed,timer-start}/action.yml`
  copied byte-for-byte from `resume-2026` — `diff` against the source confirms
  no drift. None of the five hardcode a repo name internally, so nothing in
  them needed changing.
- The hardcoded reference the task description warned about turned out to
  live in the *callers*, not the actions: resume-2026's per-check workflows
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
