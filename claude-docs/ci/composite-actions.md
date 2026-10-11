## Composite actions

`.github/actions/` — five actions. `duration` is an **optional** input on
`job-summary` and `pr-comment`, so restoring the timer actions MB.32 deleted
would need no edit at any call site; nothing passes it today.

- **`checkout-to-app`** — `actions/checkout`, then
  `cp -a "$GITHUB_WORKSPACE"/. /app/`. Every other local action resolves as
  `./.github/actions/<name>` once checked out; this one runs _before_ that
  checkout exists, so **callers must reference it by full
  `Aurora-Arctic/Sorrel-and-Salt/...@main` path**.
  - **Copy-only is sufficient because the image carries no source** (MB.42).
    `cp -a` overlays and never deletes, which is safe only when there is
    nothing underneath for a stale file to survive _as_: `Dockerfile.node`
    copies in the two manifests, runs `npm ci`, and stops, so `node_modules` is
    all the image contributes to `/app` and the checkout is the only source a
    job ever sees; `Dockerfile.e2e` is the same. How a baked-in `COPY . .`
    once left every deleted file on disk in every job, and why removing the
    layer beat cleaning up after it, is MB.42's and
    [`design-decisions/mb.42-no-source-layer.md`](../design-decisions/mb.42-no-source-layer.md).
  - **Review is what keeps it that way.** Each Dockerfile copies an allowlist
    — the two manifests, plus `Docker/playwright-entrypoint.sh` for
    `Dockerfile.e2e`'s `headed` stage — and `COPY src src` is as much a
    source layer as `COPY . .`, so a new COPY is a decision, not a
    convenience. MB.224 retired the guard that parsed them: a test of the
    Dockerfile proves no behaviour a user depends on.
    A Dockerfile change also runs on its own PR, because `pr-gate.yml` builds
    the image under a tag hashed from `Dockerfile.node` and
    `package-lock.json`; an edit to this action does not, because every caller
    resolves it at `@main`.
- **`job-summary`** — a pass/fail `$GITHUB_STEP_SUMMARY` callout, with a tailed
  log excerpt on failure.
- **`pr-comment`** — upserts one marked comment per check (`<!-- ci-<slug> -->`),
  in `minimize` (resolve-on-pass) or `comment` (always post) mode, plus a
  separate fail-only thread for `merge-queue: true` callers. Every caller runs
  it under `!cancelled()`, not `always()`: the action reads any outcome but
  `success` as a failure, so a leg cancelled by a newer push's
  `cancel-in-progress` posted "❌ failed — 0 errors" over a check that never
  finished. The next run's comment is the one that counts.
- **`build-image`** — the build-or-reuse sequence `build-image.yml`,
  `build-e2e-image.yml` and `build-db-image.yml` share: compute the
  content-addressed GHCR tag, log in, set up buildx, `docker buildx imagetools inspect`
  the tag, and `docker/build-push-action` only on a miss; the `image`
  output is the ref. Three things stay in the caller because the action cannot
  take them: `actions/checkout` (a local action resolves from the checked-out
  tree), the `hashFiles(...)` call (it takes literal globs, so the hashed list
  is written where it can be read; the action fails on an empty hash rather
  than pushing an untagged ref), and `secrets.GITHUB_TOKEN` (`secrets` is out
  of scope inside a composite, so the registry password is an input — the same
  route `vercel-secrets-guard` takes).
  - **The layer cache is in the registry** (MB.99). buildx reads and writes
    `ghcr.io/<repo>/<path>:buildcache` with `mode=max`, one tag per image
    beside its hash tags, so a build on one PR warms the next PR's and every
    branch reads the same copy. `mode=max` caches the stages before the
    target too, which is how `testing` and `e2e` reuse `development`'s
    `npm ci` layer. A hash tag is hex, so it can never collide with
    `buildcache`.
  - **Why not the Actions cache.** A `type=gha` entry written by a
    `pull_request` run can be restored only by re-runs of that PR, so each
    PR stored its own copy of the same blobs, filled the 10 GB cap, and got
    the Next.js and npm caches, the entries that do pay, evicted by last
    access. Exporting there also rewrote layers the push had just uploaded,
    where a registry export finds those blobs and writes a manifest. The
    measurements are
    [`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md),
    "Facts the plan rests on".
  - **Cost.** GHCR storage is free for a public repo. Each build moves
    `:buildcache` and leaves the previous cache manifest untagged, the same
    way the hash tags already accumulate; pruning the packages' old versions
    is a later task.
- **`vercel-secrets-guard`** — the warn-and-skip check on
  `VERCEL_DEPLOY_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`, at `id: guard`
  in `migrate.yml`'s `migrate` job and `deploy.yml`'s `deploy` and `teardown`
  jobs; `skipping` is the word the warning names. Every later step in those
  jobs is gated on `steps.guard.outputs.enabled == 'true'`, which is why the id
  is fixed. The three secrets arrive as inputs, and a reference to a secret
  that does not exist is `''`, so a misspelt name still reads as unset. The
  Neon guards — `migrate.yml`'s `neon-guard` and `neon-snapshot-prune.yml`'s
  `guard` — stay inline: a different, two-secret shape, and the prune workflow
  has no checkout to resolve a local action from.

**What cannot become a composite action**, so it is not re-proposed: the
`container:` / `defaults:` preamble `checks.yml`, `vitest.yml` and
`playwright.yml` share, and the `services: postgres:` block `vitest.yml` and
`playwright.yml` share. Those are job-level keys, evaluated before the first
step runs; a composite contributes steps and nothing above them, and the only
job-level `uses:` is a reusable workflow, which is a whole job rather than a
piece spliced into one. That repetition is the price of the shape and stays
where [Container jobs](container-jobs.md) describes it.
