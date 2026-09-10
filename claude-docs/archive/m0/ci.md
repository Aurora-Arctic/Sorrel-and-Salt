# Archived from claude-docs/ci.md — end of M0 (M0.34)

Text the M0.34 compression pass removed from [`../../ci.md`](../../ci.md). Every
item here is the same failure mode: a workflow described in terms of something
that "doesn't exist yet", where that something has since landed. `ci.md` was
written incrementally across M0.15–M0.28, so each entry froze the world as it
stood at that task.

---

## 1. composite-actions-check.yml — the missing testing image

```
  Runs on the bare `ubuntu-latest` runner, not a container — the "testing"
  GHCR image the real check workflows will use doesn't exist until M0.24 —
  so it adds its own "Prepare /app" step ahead of `checkout-to-app`.
```

`build-image.yml` landed in M0.24. The bare-runner choice and the "Prepare
/app" step are still current; only the reason given for them was stale.

## 2. The reusable checks "waiting for a caller"

```
  they wait for a caller (`pr-gate.yml`/`merge-queue.yml`, both later tasks).
```

```
  triggered directly; both wait for a caller (`pr-gate.yml`, a later task).
```

Both callers exist — `pr-gate.yml` (M0.20) and `merge-queue.yml` (M0.21). The
workflows are still not triggered directly, so that half stands; "waiting for"
a caller that has arrived does not.

## 3. lint-format-typecheck-check.yml as a stand-in

```
- **`.github/workflows/lint-format-typecheck-check.yml`** (M0.16) — the
  workflow that actually calls the three above, since `pr-gate.yml` doesn't
  exist yet. Builds `Docker/Dockerfile.node`'s `testing` target ad hoc and
  pushes it to GHCR under a tag scoped to the run
  (`ghcr.io/.../testing:smoke-<run id>`, never reused across runs) — the
  real `build-image.yml` (M0.24) content-addresses and caches this properly
  for every caller to share, but porting it early would leave M0.24 redoing
  work against its own acceptance criteria, the same call M0.15 made for
  `composite-actions-check.yml`. Triggers on `pull_request` (paths: the three
```

`pr-gate.yml` exists and calls all three. The M0.24-would-redo-the-work
reasoning is a decision narrative — the transcript's and the decision record's
job, not the summary's.

The workflow was **not** deleted when `pr-gate.yml` landed, and that is
deliberate: it exercises the three reusable workflows on their own, outside the
aggregate run, which is a different assertion from "the gate passes". The live
summary now states that as its purpose rather than as a stopgap.

> Note: both smoke workflows' own file headers still open with "independent of
> pr-gate.yml (M0.20) — which doesn't exist yet — and of the published testing
> image (build-image.yml, M0.24), which doesn't either." Those comments are
> stale in the same way. They are workflow files, not docs, so this pass left
> them alone.

## 4. verify-db-image's scaffolding comparison

```
    (Unix-socket) rule `docker exec` uses stays `trust`. Scaffolding, same
    as `lint-format-typecheck-check.yml`/`build-audit-check.yml`: delete it
    once a real M1 test job exercises the same `services:` pattern for
```

`verify-db-image` genuinely is delete-when-M1-arrives scaffolding, and that
stands. The comparison did not: it labelled the two smoke workflows as
scaffolding while the same file later called them "independent regression
checks by design". The document contradicted itself; the comparison was the
half that went.

## 5. pr-gate.yml's filled-in stubs

```
- **`.github/workflows/pr-gate.yml`** (M0.20) — the real aggregating gate
  `lint-format-typecheck-check.yml`/`build-audit-check.yml` were always
  stand-ins for. Path-filters `lint`/`typecheck`/`build` via
  `dorny/paths-filter` (`format` always runs), calls all five existing
  reusable checks, and carries stub `vitest`/`playwright` jobs (real job
  names, one no-op step) so M1 can wire them in without a required-check
  rename. Shipped with two upstream dependencies stubbed that later tasks
  filled: `gitflow` (M0.22) and the real `build-image.yml` (M0.24) — the
  `build-image` job is now `uses: ./.github/workflows/build-image.yml`,
  keeping its `pr-gate-build-image-<pr number>` / `cancel-in-progress: false`
```

"Shipped with two dependencies stubbed that later tasks filled" describes a
sequence that is over. The end state — it calls `build-image.yml`, and keeps
the concurrency group on the caller — is all a reader needs.

## 6. merge-queue.yml's "same three gaps"

```
true` where each reusable workflow supports it. Same three gaps as
  `pr-gate.yml`: `gitflow` (M0.22) and `build-image.yml` (M0.24) since
  filled — `build-image` is now `uses: ./.github/workflows/build-image.yml`
  with no caller-side concurrency group (unlike `pr-gate.yml`, this caller
  has no sibling jobs to shield from a mid-push cancel) — and
  `vitest`/`playwright` (M1) are still stub jobs. **"Require merge queue" is
```

Same shape as item 5. Two of the three gaps are filled; only the
`vitest`/`playwright` stubs remain, and the live text says so directly.

## 7. The act targets that don't exist

```
  wait on their `act-cache-*` prerequisites and later workflows. Reasoning:
```

Ambiguous rather than flatly wrong — it can be read as "these targets are
deferred", which is correct, or as "these targets exist and have unmet
prerequisites", which is not. `act-build`, `act-vitest` and `act-playwright`
are absent from the makefile; only `act-image`, `act-cache-checkout`,
`act-lint`, `act-format`, `act-typecheck` and `act-test` exist. Rewritten to
say plainly that they do not exist yet and what each is waiting on.

---

## Kept deliberately

The verbose passages in `ci.md` that survive this pass are the only written
record of a non-obvious constraint, and are load-bearing:

- `build`'s `NODE_ENV=production` and the Turbopack `/_global-error`
  prerender crash.
- `Dockerfile.postgres` baking `sorrel_template` at build time, and
  `src/db/schema` still being empty.
- `verify-db-image` using `docker exec` rather than a TCP connection, because
  the image's `host` auth rules need a password generated and discarded at
  build time while the `local` socket rule stays `trust`.
- "Require merge queue" being deliberately OFF on both protected branches
  until M7.A.1.
- Dependabot's exception being checked by PR author, not branch name.
