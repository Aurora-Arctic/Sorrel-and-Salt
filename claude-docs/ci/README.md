# CI pipeline

`.github/` holds the workflows and the composite actions they share. Nothing under `.github/workflows/` hardcodes a repository name except the callers of `checkout-to-app`; everything else derives from `github.repository`. A citation in code names the file below, not this page.

## Files

- `composite-actions.md`: the six composite actions in `.github/actions/`.
- `reusable-checks.md`: the `workflow_call` workflows (`checks.yml`, vitest, playwright, gitflow) and the `merge-queue` input.
- `aggregating-workflows.md`: the workflows that run the reusable ones, such as `pr-gate.yml`.
- `deploy.md`: the CI-only Vercel deploy and the production migration step.
- `database-image.md`: the Postgres image CI builds and why its password is never a build argument.
- `runner-budget.md`: the runner choice and the minutes each job spends.
- `running-ci-locally.md`: running the reusable checks through `act`.
