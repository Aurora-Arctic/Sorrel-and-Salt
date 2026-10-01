## Smoke checks

None remain.

Every composite action is exercised by the checks that use it on the same push
— a broken `job-summary` or `pr-comment` fails `checks`, `vitest` and
`playwright` at once — and `checkout-to-app` is the first step of nearly every
job in the repo. So `composite-actions-check.yml`, a workflow testing the
actions that exist to de-duplicate the workflows, went with MB.32.

**That argument covers only what those checks would notice.** A check that
reads a file's _contents_ cannot tell a stale copy from a live one, which is
how `checkout-to-app` left deleted files on disk in every job for months
without one failing. What closes it is not a job: the images carry no source
layer, so a stale file has nothing to survive _as_, and
`tests/guards/image-source-layer.test.ts` fails the diff that re-adds one. That
is the sweep-task rule's tell — a job would make stale files _absent_, the
image makes them _impossible_ — and "something else would have noticed" is not
a guard. The story, including the job built first and replaced, is MB.42's
and [`design-decisions/mb.42-no-source-layer.md`](../design-decisions/mb.42-no-source-layer.md).

**A workflow must never publish a status-check context `pr-gate.yml` also
publishes.** Two runs reporting one `job / job` context leave it unclear which
of them a branch ruleset gates on; the cost is the ambiguity, not the minutes.
For the same reason `build-db-image.yml` has no `pull_request` trigger, since
`pr-gate.yml` already calls it. MB.15 deleted the two workflows that broke the
rule and tells how they were found.

The gate's path filters carry each image's inputs to the checks that run
against it. `Docker/Dockerfile.node` is listed on `lint`, `typecheck` and
`build`, the three checks that run _inside_ that image, and deliberately not in
the `*shared` anchor, which also feeds `destructive_ddl`. `vitest` and
`playwright` list `Docker/Dockerfile.postgres` and `Docker/postgres-init/**`,
the same two paths the database image's hash tag is computed from, so a
Dependabot PR bumping Postgres runs both suites against the new image on its
own PR rather than leaving that to whichever unrelated PR touches `src/**`
next (fixed in M4.7's PR); `playwright` lists `Docker/Dockerfile.e2e` too.
