# Docker / local stack — summary

Full history: [`transcripts/docker.md`](transcripts/docker.md) ·
Decisions: [`design-decisions/`](design-decisions/)

The local development stack: one image, `docker compose`, no Neon connection
and no host Node-version juggling. `Docker/Dockerfile.node` (M0.11) is the
image; `Docker/docker-compose.yaml` (M0.12) is the stack; the `postgres`
service arrives in M0.13.

- **`Docker/Dockerfile.node`** — two stages on `node:26.6.0-alpine`:
  `development` (deps + source, `CMD ["npm","run","dev"]`) and `testing`
  (`FROM development`, `NODE_ENV=test`, a vitest default command). Deps install
  from the manifests before `COPY . .`, so a source edit keeps the `npm ci`
  layer cached. ~862 MB, ~79% below resume-2026's devcontainer image.
  Reasoning:
  [`design-decisions/m0.11-slim-dockerfile-node.md`](design-decisions/m0.11-slim-dockerfile-node.md).
- **`Docker/docker-compose.yaml`** — `name: sorrel-and-salt` (pinned so it
  doesn't collide with resume-2026's `docker` project on the same machine).
  Ported from resume-2026 minus the Gatsby LMDB cache volume, the
  `/gatsby-public` volume, and the `devcontainer` service. Reasoning:
  [`design-decisions/m0.12-docker-compose.md`](design-decisions/m0.12-docker-compose.md).
  - **`app`** — builds `target: development`, serves `next dev` on **8000**. No
    `command:`; `package.json`'s `dev` script already binds `0.0.0.0:8000` and
    is the Dockerfile `CMD`. `.next/` is written into the bind mount (git- and
    docker-ignored); there is no `.next` volume.
  - **`workshop`** — behind the **`workshop` compose profile**, so a bare
    `make docker-up` does not start it. Builds the same stage, runs
    `npm run workshop -- --host 0.0.0.0` (`ladle serve` binds `localhost`
    otherwise), publishes **61000** (serve) and **61002** (pinned HMR socket).
  - **Volumes** — one `node_modules` volume per service (`node_modules_app`,
    `node_modules_workshop`); a single shared volume makes the two services
    race to populate it from their images on first mount. They persist across
    `docker compose restart` and `make docker-down`; only `make docker-rebuild`
    (`down -v`) clears them. No LMDB / `.cache` / `gatsby_*` volume.
- **`makefile`** targets, each a `docker compose -f Docker/docker-compose.yaml`
  wrapper (via the `COMPOSE` variable):
  - `make docker-up` — start the app on 8000, detached.
  - `make docker-workshop` — also start the workshop on 61000
    (`--profile workshop up`).
  - `make docker-build` — build both images (`--profile workshop build`).
  - `make docker-down` — stop and remove everything, workshop profile included;
    named volumes kept.
  - `make docker-rebuild` — `down -v` (drops the `node_modules` volumes) then
    rebuild and start the app.
  - `make docker-logs` — follow.
  - No `update-token` prerequisite — resume-2026 had one for the devcontainer's
    Claude CLI; there is no devcontainer service here.
- **`.dockerignore`** (repo root, M0.11) — excludes `node_modules`, `.next`,
  `.git`, `build`, coverage and local env/state from the build context.
- **`.devcontainer/`** (M0.14) builds `Docker/Dockerfile.node`
  `target: development` directly — there is no `devcontainer` image stage or
  compose service to point at.
