## Snapshot before production migrations, and the restore runbook

Expand/contract keeps a bad _release_ recoverable by rolling the app back. It says
nothing about a migration that runs cleanly but corrupts or loses data outright (a
backfill with a wrong predicate, an errant `UPDATE`): an app rollback then just
points working code at a damaged database. The snapshot exists for that failure
mode.

**What happens automatically.** `migrate.yml`, immediately before it applies
pending migrations against `main`, branches the current `main` Neon branch as
`snapshot-<short sha>`, the seven-character short SHA of the commit whose
migrations are about to run. Preview (`staging`, hotfix) migrations never
snapshot; those databases are already disposable
([`data.md`, "Neon branch strategy: persistent staging vs. ephemeral hotfix branches"](../design-decisions/data.md#neon-branch-strategy-persistent-staging-vs-ephemeral-hotfix-branches)).
The step is guarded on `NEON_API_KEY`/`NEON_PROJECT_ID` the same way `deploy.yml`
guards on the Vercel secrets (`claude-docs/secrets.md`). While those two rows are
unset the step warns and skips rather than failing the job.

A weekly scheduled workflow, `neon-snapshot-prune.yml`, keeps the newest
`KEEP_SNAPSHOTS` (3) `snapshot-*` branches and deletes the rest. Neon's free tier
caps a project at 10 branches total, shared with `main`, `staging` and one
ephemeral branch per open hotfix preview.

**Promotion (the restore procedure).** Promoting a snapshot is a production-incident
call, made by a human operator with deploy access — never automatic, and never made
by CI.

1. Identify the bad commit and its snapshot branch, `snapshot-<short sha>`.
2. In the Neon console, create a compute endpoint on that snapshot branch (a branch
   has no connection string until an endpoint exists on it) and copy its
   connection string.
3. Set that connection string as the `production`-scoped `DATABASE_URL` Vercel
   environment variable, overwriting the current value (dashboard, or `vercel env
rm DATABASE_URL production` then `vercel env add DATABASE_URL production`).
4. Redeploy production (push to `main`, or `vercel deploy --prebuilt --prod`) so the
   running app picks up the new `DATABASE_URL`.
5. Leave the old, corrupted `main` branch in place under a renamed incident label
   (e.g. `production-incident-<date>`) for forensics; do not delete it as part of
   the recovery.
6. Rename the promoted branch to `main` once the incident is confirmed resolved, so
   the next `migrate.yml` run's "find the branch named `main`" lookup keeps working
   and `staging`'s Neon parentage (a child of `main`) still points at the live
   branch.

**The data-loss window is real and unavoidable**: every write `main` accepted
between the snapshot's creation (the start of that `migrate.yml` run) and the moment
the redeployed app in step 4 starts using the promoted branch is gone. The snapshot
is a point-in-time branch, not a replica. The window is normally seconds to a few
minutes, not the time since the last release.

**Restore drill.** Rehearse this procedure once against `staging` before trusting it
in a real `production` incident. Take a snapshot branch of `staging` (the API call
`migrate.yml` makes, with `staging` as the parent), promote it per the steps above,
and confirm the app comes back up reading the promoted branch. Record the result
here: date, who ran it, what didn't match the written steps.

_Not yet drilled as of this record._
