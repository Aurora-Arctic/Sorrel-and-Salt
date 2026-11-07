# The CI images carry no source layer

**Status:** decided. Live home: `claude-docs/ci/composite-actions.md` and `claude-docs/docker.md`; the guard is `tests/guards/image-source-layer.test.ts`.

## Decision

- **Neither CI image carries source.** `Dockerfile.node` and `Dockerfile.e2e` copy in the manifests, run `npm ci` and stop; `headed` copies `Docker/playwright-entrypoint.sh` alone. Source arrives from outside: the `..:/app` bind mount in every compose service and the devcontainer, or `checkout-to-app`'s `cp -a` in CI.
- **`checkout-to-app` is checkout plus copy.** It has no clean step and runs no git in `/app`.
- **`tests/guards/image-source-layer.test.ts` allowlists each Dockerfile's `COPY` and `ADD` sources.** A new `COPY` is a decision recorded in the diff that adds it.
- **`/app` stays `node`-owned and vitest still runs as root in CI.** The guards `test-location`, `lint-db-client-boundary` and `slug-rule` keep `git -c safe.directory=*` for that reason.

## Why

An overlay never deletes. With `COPY . .` baked in and `cp -a` laid over it, every file dropped from the repo since the image was built stayed on disk in every container job, untracked and not ignored, and was linted, typechecked and globbed as if the branch had it. The source layer had one reader, CI, and it was the bug: every compose service bind-mounts over it. Removing the layer makes the stale file impossible rather than cleaned up after (the sweep-task rule's tell, `CLAUDE.md`, "Conventions"), and the ownership mismatch stops mattering to the action.

An edit to a composite action reaches a job only after a release carries it to `main`, since callers resolve it at `@main`. A Dockerfile change builds and runs its own image on its PR, because `pr-gate.yml` tags the image from `hashFiles('Docker/Dockerfile.node', 'package-lock.json')`.

## Rules out

- **Any source `COPY` in either image**, including `COPY src src`. The guard is an allowlist, not a `.` denylist.
- **Rebuilding the image per push.** It means hashing the source, so every push pays the `npm ci` the content-addressed tag exists to skip, to refresh a layer nobody reads.
- **A `git clean` step in `checkout-to-app`.** It has nothing to delete, and it would put git back in a `node`-owned `/app` under root.
