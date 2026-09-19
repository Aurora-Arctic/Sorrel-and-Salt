# MB.42 — The CI images carry no source layer

**Status:** decided · **Date:** 2026-09-19

MB.42 was minted as "CI container jobs run against files the repo has
deleted": `Dockerfile.node` and `Dockerfile.e2e` baked the whole repo into
`/app` with `COPY . .`, `checkout-to-app` laid the checkout over it with
`cp -a`, and an overlay never deletes — so every file dropped from the repo
since the image was last built was still on disk in every container job,
untracked, not ignored, and linted, typechecked and globbed as if the branch
had it. This record exists because the task was built one way, reversed on
the same PR, and built the other way; CLAUDE.md warns that a change argued at
length and reversed nowhere reads as intent, so the reversal is argued here.

## What was tried first

PR #133's first commits kept the source layer and cleaned up after it:
`git clean -fd` in `/app` after the copy (no `-x`, so the image's ignored
`node_modules` and `.next` survived), then
`git config --global --add safe.directory /app` when that failed with
`fatal: detected dubious ownership` — `/app` is chowned to `node` and every
consuming job runs `--user root`. A `checks / overlay` job planted stale files
in `/app`, ran the action, and asserted the clean removed them, with
`make act-overlay` to run it locally. And because every caller resolves the
action at `@main`, MB.44 was minted to cut a release and only then remove the
two coverage excludes the clean had made dead.

## Decided

**Neither image carries source.** `Dockerfile.node` and `Dockerfile.e2e` copy
in the manifests, run `npm ci`, and stop; `headed` copies
`Docker/playwright-entrypoint.sh` alone. Source arrives from outside: the
`..:/app` bind mount in every compose service and the devcontainer, or
`checkout-to-app`'s `cp -a` in CI. The action is back to checkout + copy.
`tests/guards/image-source-layer.test.ts` allowlists each Dockerfile's
`COPY`/`ADD` sources. The overlay job, `act-overlay`, the clean step and the
`safe.directory` line are gone, the two coverage excludes went in the same
PR, and MB.44 is retired.

## Why

- **The source layer had one reader, and it was the bug.** Every compose
  service and the devcontainer bind-mount `..:/app` over it; only CI ever
  saw the baked tree. Deleting the layer removes the condition rather than
  cleaning up after it.
- **Impossible, not absent.** The sweep-task rule's tell (CLAUDE.md). The
  clean step deleted stale files; with nothing underneath the overlay there
  is nothing for a stale file to survive _as_, no git runs in `/app` at all,
  and the ownership mismatch stops mattering to the action.
- **Live on its own PR.** `pr-gate.yml` calls `build-image.yml` with a tag
  from `hashFiles('Docker/Dockerfile.node', 'package-lock.json')`, so a PR
  that changes the Dockerfile builds and runs its own image. An edit to the
  action reaches a job only after a release carries it to `main` — which is
  what made MB.44 necessary, and what dissolves it.

## What this rules out

- **Re-adding a source `COPY` to either image.** `COPY src src` is as much a
  source layer as `COPY . .`; the guard is an allowlist, not a `.` denylist,
  and a new COPY is a decision recorded there in the diff that adds it.
- **Rebuilding the image per push.** "Rebuild more often" was the other axis
  and was rejected: it means hashing the source, so every push pays the
  `npm ci` the content-addressed tag exists to skip, to refresh a layer
  nobody reads.
- **A clean step in `checkout-to-app`.** With no source layer it has nothing
  to delete, and it would put git back in a `node`-owned `/app` under root.

## What still stands

- **The ownership mismatch.** `/app` is still `node`-owned and vitest still
  runs as root in CI; only the action stopped running git there.
- **The three guards' `git -c safe.directory=*`** — `test-location`,
  `lint-db-client-boundary`, `slug-rule` — are unchanged, for that reason.
- **MB.41's index-vs-disk argument** for `test-location` stands on its own
  merits and stays; its comment records the 34 phantoms as history.
