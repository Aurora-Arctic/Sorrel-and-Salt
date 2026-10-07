## Running CI locally

**`.actrc` + `make act-*`** — run the reusable checks through
[`act`](https://github.com/nektos/act) against a locally-built
`Docker/Dockerfile.node` `testing` image (`act-image`). `.actrc` carries
one `-P …=catthehacker/ubuntu:act-latest` line per `runs-on` label the
workflows pin — `ubuntu-26.04` and `blacksmith-8vcpu-ubuntu-2404` — and
`--pull=false`.

- **One target covers every `checks.yml` leg** (MB.32), where there was one per
  check workflow before the collapse: `make act-check` runs lint,
  `make act-check CHECK=typecheck` runs typecheck, and so on through `format`,
  `build`, `audit`, `destructive-ddl` (MB.37) and `migration-order` (MB.173).
  `--matrix name:<leg>` is what keeps `act` from running all seven, and `make act-test` chains lint, format,
  typecheck and destructive-ddl. `act-image` builds the `testing` target
  locally under the exact tag the job's required `image` input names, so
  `docker run` never reaches GHCR and the container `credentials:` block is a
  no-op — which is why `act-check` passes a dummy `GITHUB_TOKEN` rather than
  a real one.
- `make act-cache-checkout` pre-clones this repo's `main` so the remote
  `checkout-to-app@main` ref resolves offline.
- **act does not apply `workflow_call` input defaults**, so a flag arrives
  empty under `-W`. `act-check` needs none passed: `checks.yml` resolves an
  empty flag to true precisely so a local run cannot quietly skip the work it
  was asked to do.
- **`CHECK=build` and `CHECK=audit` are expected to fail locally**, and neither
  is in `act-test`. The build leg wants `actions/cache@v6` pre-cached the way
  `act-cache-checkout` pre-caches `checkout-to-app`; the audit leg wants a real
  PR to comment on.
- **`CHECK=destructive-ddl` scans nothing locally, and that is the honest
  outcome rather than a gap.** Its
  `destructive-ddl-files` input comes from `pr-gate.yml`'s `changes` job, which
  does not exist under a bare `act -W ... --matrix name:destructive-ddl`, so it
  arrives empty; `checks.yml` sets `DESTRUCTIVE_DDL_FILES` from the input
  regardless, and the script reads set-but-empty as "no migrations changed".
  The leg reads no `github.event.pull_request.body` (MB.48 retired its
  `pr-body` input), which is what makes the scan provable locally at all:
  `npm run check:destructive-ddl -- --all` reads every acknowledgement from
  the repository itself and is green. What proves the leg's own
  gating is `tests/guards/destructive-ddl-check.test.ts` (the rules, the
  file-list resolution, the branch diff and the per-file sidecar correlation,
  each asserted to fail with its guard removed) and
  `npm run check:destructive-ddl -- --self-test` (the sidecar gating, against
  the fixtures under `scripts/__fixtures__/destructive-ddl/`).
- **`act-vitest` / `act-playwright` still do not exist**, even though
  `vitest.yml`/`playwright.yml` landed in M1.14. Unlike the `checks.yml` legs
  (single job, every input passed directly), both take a `db-image` input that
  only exists because their caller (`pr-gate.yml`) has its own real
  `build-db-image`/`build-e2e-image` jobs upstream of them — `act -W ... -j
vitest` would have to either execute `build-db-image.yml` for real (a
  genuine GHCR push, not something `--action-offline-mode` supports) or
  fabricate a `db-image`/`image` input by hand, and act needs new local-only
  plumbing this repo doesn't have a pattern for yet. Left unresolved rather
  than shipped in a form nobody could verify actually works.
- **Every new reusable check workflow ships its `act-<name>` target in the same
  PR**, plus an `act-cache-*` pre-clone for any action that isn't cached yet
  — except where that isn't possible yet, as above. A new `checks.yml` leg
  needs no new target: it is `make act-check CHECK=<leg>` the day it lands. A
  new `checks.yml` **job** would need one — `act-check` is
  `-j check --matrix name:<leg>` and reaches only the matrix job.
