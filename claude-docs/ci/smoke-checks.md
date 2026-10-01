## Smoke checks

None remain.

`composite-actions-check.yml` was the last one, and MB.32 deleted it: a
workflow testing the composite actions that exist to de-duplicate the
workflows. It asserted that each `action.yml` lands in `/app` on the bare
`ubuntu-latest` runner, with its own "Prepare /app" step ahead of
`checkout-to-app`. Every action it covered is now exercised by the checks that
use it on the same push — a broken `job-summary` or `pr-comment` fails
`checks`, `vitest` and `playwright` at once — and `checkout-to-app` is the
first step of nearly every job in the repo.

**That argument has one hole, and MB.42 fell into it.** "Exercised by the
checks that use it" only covers the behaviour those checks would notice. Every
job in the repo ran `checkout-to-app` on every push for months while it was
leaving deleted files on disk, and not one of them failed, because a check that
reads a file's _contents_ cannot tell a stale copy from a live one. The answer
is not a job. MB.42 built one first — a `checks / overlay` that planted stale
files in `/app` and asserted a `git clean` step removed them — and replaced it
on the same PR with an image that carries no source layer, so the overlay has
nothing to delete and a stale file has nothing to survive as, plus
`tests/guards/image-source-layer.test.ts`, which fails the diff that re-adds
one. The general lesson is the sweep-task rule's — a mechanism that can be
made _impossible_ to get wrong needs a guard, and "something else would have
noticed" is not one — and so is the tell: the job made stale files _absent_,
the image makes them _impossible_.

**A workflow must never publish a status-check context `pr-gate.yml` also
publishes.** `lint-format-typecheck-check.yml` (M0.16) and
`build-audit-check.yml` (M0.17) did, and MB.15 deleted them. They were written
before `pr-gate.yml` (M0.20) existed, each building its own ad hoc
`testing:smoke-<run id>` image; MB.15 first collapsed both onto
`build-image.yml`, which made the rest plain — they then called the same image
build and the same `lint.yml` / `format.yml` / `typecheck.yml` / `build.yml` /
`audit.yml` with the same inputs as the gate, a strict subset of it. One push to
PR #87 fired three workflow runs and reported `lint / lint`, `typecheck /
typecheck`, `format / format`, `build / build` and `audit / audit` **twice**
each, `build-image / build-image` three times. Duplicate contexts under one
`job / job` name make it ambiguous which run a branch ruleset is gating on —
the cost is the ambiguity, not the minutes.

Deleting them moved one thing that was not duplicated: their path filters listed
`Docker/Dockerfile.node`, and `pr-gate.yml`'s did not. It now lists it on
`lint`, `typecheck` and `build` — the three checks that run _inside_ that image
— and deliberately not in the `*shared` anchor, which also feeds
`destructive_ddl`.

The database image had the same gap until M4.7: `vitest` and `playwright`
listed `build-db-image.yml` but not the image's own inputs, so a Dependabot
PR bumping `Docker/Dockerfile.postgres` built the new image and ran neither
suite against it. The first run on the new Postgres was then whichever
unrelated PR touched `src/**` next. Both filters now list
`Docker/Dockerfile.postgres` and `Docker/postgres-init/**`, the same two
paths the image's hash tag is computed from.

`build-db-image.yml` had the same defect from the other direction: its own
`pull_request` trigger _plus_ an unconditional `build-db-image` job in both
`pr-gate.yml` and `merge-queue.yml`, so any PR touching `src/db/**` ran it
twice. MB.15 dropped the trigger.

The merge queue was never affected. Neither deleted workflow declared
`merge_group:`, and `merge-queue.yml` built each of the three images exactly
once and passed them down as inputs. Its re-running of the gate's checks was a
merge queue verifying the merged result, which is the point of one. That file is
itself gone now (MB.32) until M7.A.1 restores it.
