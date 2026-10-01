## Snapshot before production migrations, and the restore runbook (M1.6)

Expand/contract keeps a bad _release_ recoverable by rolling the app back.
It says nothing about a migration that runs cleanly but corrupts or loses
data outright (a backfill with a wrong predicate, an errant `UPDATE`) — the
app rollback in that case just points working code at a damaged database.
The snapshot exists for that failure mode.

**What happens automatically.** `migrate.yml` (M1.4), immediately before it
applies pending migrations against `main`, branches the current
`main` Neon branch as `snapshot-<short sha>` — the seven-character
short SHA of the commit whose migrations are about to run, so the branch
name identifies exactly the change it precedes. Preview (`staging`, hotfix)
migrations never snapshot; those databases are already disposable per
[`m1.1-neon-branch-strategy.md`](../design-decisions/m1.1-neon-branch-strategy.md).
The step is guarded on `NEON_API_KEY`/`NEON_PROJECT_ID` the same
stub-now/wire-later way `deploy.yml` guards on the Vercel secrets. M0.27
wrote the secrets matrix (`claude-docs/secrets.md`), but these two rows are
still unset — MB.12 owns setting them — so until then the step warns and
skips rather than failing the job.

A weekly scheduled workflow, `neon-snapshot-prune.yml`, keeps the newest
`KEEP_SNAPSHOTS` (3) `snapshot-*` branches and deletes the rest — Neon's free
tier caps a project at 10 branches total, shared with `main`,
`staging`, and one ephemeral branch per open hotfix preview, so snapshots
can't be left to accumulate.

**Promotion (the restore procedure).** Deciding to promote a snapshot is a
production-incident call, made by a human operator with deploy access — never
automatic, and never made by CI. The steps:

1. Identify the bad commit and its snapshot branch, `snapshot-<short sha>`.
2. In the Neon console, create a compute endpoint on that snapshot branch
   (a branch has no connection string until an endpoint exists on it) and
   copy its connection string.
3. Set that connection string as the `production`-scoped `DATABASE_URL`
   Vercel environment variable, overwriting the current value (dashboard, or
   `vercel env rm DATABASE_URL production` then `vercel env add DATABASE_URL
production`).
4. Redeploy production (push to `main`, or `vercel deploy --prebuilt --prod`
   directly) so the running app picks up the new `DATABASE_URL`.
5. Leave the old, now-corrupted `main` branch in place under a
   renamed, obviously-incident label (e.g. `production-incident-<date>`) for
   forensics — don't delete it as part of the recovery itself.
6. Rename the promoted branch to `main` once the incident is
   confirmed resolved, so the next `migrate.yml` run's "find the branch
   named `main`" lookup keeps working, and so `staging`'s Neon
   parentage (a child of `main`, per M1.1) still points at the branch
   that's actually live.

**The data-loss window is real and unavoidable**: every write `main`
accepted between the snapshot's creation (the start of that `migrate.yml`
run) and the moment the redeployed app in step 4 starts using the promoted
branch is gone — the snapshot is a point-in-time branch, not a replica that
keeps catching up. That window is normally seconds to a few minutes (however
long the migration + promotion takes), not the time since the last release.

**Restore drill.** This procedure must be rehearsed once against `staging`
before it's trusted for a real `production` incident — a runbook nobody has
followed is a guess, not a plan. Drill it by: taking a snapshot branch of
`staging` (the same API call `migrate.yml` makes, with `staging` as the
parent instead of `main`), promoting it per the steps above, and
confirming the app comes back up reading the promoted branch. Record the
result here — date, who ran it, what (if anything) didn't match the written
steps.

_Not yet drilled as of this record._
