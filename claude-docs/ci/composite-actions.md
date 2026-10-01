## Composite actions

`.github/actions/` — five actions. `timer-start` and `timer-elapsed` were two
more until MB.32 deleted them: 46 lines across twelve workflows to
print an elapsed time into a job summary. `duration` stays an **optional**
input on `job-summary` and `pr-comment`, so restoring a timer would need no
edit at any call site; nothing passes it today.

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
    job ever sees. Until MB.42 both `Dockerfile.node` and `Dockerfile.e2e`
    baked the whole repo in with `COPY . .`, and every file dropped from the
    repo since the image was last built stayed on disk after the overlay —
    untracked, not gitignored, and indistinguishable to `oxlint`, `tsc` or a
    `tests/**` glob from a file the branch actually had. That layer was
    shadowed by the `..:/app` bind mount in every compose service and in the
    devcontainer; CI was its only reader, and there it was the bug.
  - **`tests/guards/image-source-layer.test.ts` is what keeps it that way.**
    It parses every `COPY`/`ADD` in both Dockerfiles and checks each source
    against a per-file allowlist — the two manifests, plus
    `Docker/playwright-entrypoint.sh` for `Dockerfile.e2e`'s `headed` stage. An
    allowlist rather than a `.` denylist: `COPY src src` is as much a source
    layer as `COPY . .`, and a new COPY is a decision, not a convenience. The
    guard runs in CI's `vitest` job, so a source layer re-added tomorrow fails
    in the diff that adds it rather than on the next PR that deletes a file.
    And the fix is live on the PR that makes it: `pr-gate.yml` builds the
    image under a tag hashed from `Dockerfile.node` and `package-lock.json`,
    so a Dockerfile change runs on its own image — unlike an edit to this
    action, which every caller resolves at `@main`.
  - Found by MB.41, whose new test-location guard failed on its first CI run
    reporting 34 test files outside `tests/` — every one of them that move's own
    predecessor, still sitting where the image had baked it. The count is the
    tell: 34, not that branch's 39, because the image predated the five test
    files added since. The guard was changed to scan the git index instead,
    which is right on its own merits and left the condition itself untouched
    until MB.42.
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
    PR stored its own copy of the same blobs. At MB.99 the Actions cache held
    94 entries and 10,219 MB against its 10 GB cap, 67 of them buildkit blobs
    under PR merge refs, and GitHub was evicting by last access — which
    meant the Next.js build cache and the npm cache, the entries that do
    pay. The export was slow too: PR 510's build pushed its image in 43s and
    then spent 32s writing the same layers into the Actions cache. A
    registry export finds the blobs the push has just uploaded and writes a
    manifest.
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
