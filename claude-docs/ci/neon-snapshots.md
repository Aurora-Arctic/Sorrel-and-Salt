## Neon snapshots

- **`migrate.yml` snapshots production before it migrates it** (M1.6), by
  branching Neon's `main` branch as `snapshot-<short sha>` through the Neon
  API. That branch is the known-good point
  [`db/snapshot-and-restore.md`](../db/snapshot-and-restore.md)'s restore
  runbook promotes back to if a migration corrupts data. Preview never
  snapshots — a staging or hotfix database is already disposable. The step is
  guarded on `NEON_API_KEY`/`NEON_PROJECT_ID` and warns rather than fails
  while they are unset (`claude-docs/secrets.md`).
- **`neon-snapshot-prune.yml` is the only scheduled workflow in the repo** —
  Sundays at 06:00 UTC, outside any deploy window, plus `workflow_dispatch`.
  Nothing calls it. **Neon's free tier caps a project at 10 branches in
  total**, and `production`, `staging`, every retained snapshot and every open
  hotfix preview's ephemeral branch draw on that one quota, so `snapshot-*`
  branches cannot be left to accumulate: the workflow keeps the newest
  `KEEP_SNAPSHOTS` (3) and deletes the rest. It carries the same inline
  warn-and-skip guard on those two secrets — not the `vercel-secrets-guard`
  action, which checks three others ([Composite actions](composite-actions.md)).
