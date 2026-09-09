# Docker / local stack — summary

Full history: [`transcripts/docker.md`](transcripts/docker.md) ·
Decisions: [`design-decisions/`](design-decisions/)

The local development stack: one image, `docker compose`, a real local
Postgres, no Neon connection and no host Node-version juggling.
`Docker/Dockerfile.node` (M0.11) is the image; `Docker/docker-compose.yaml`
(M0.12, M0.13) is the stack.

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
  - **`postgres`** (M0.13) — `build:`s straight from
    `Docker/Dockerfile.postgres` (M0.18), the same way `app`/`workshop`
    build from `Dockerfile.node` (M0.19; this file is local dev only, so it
    builds rather than pulling the GHCR image `build-db-image.yml` publishes
    for CI/deployment). Named volume `postgres_data` at
    `/var/lib/postgresql/data`. Health check
    `pg_isready -U postgres -d sorrel_template` — not `sorrel`/`sorrel`,
    since neither exist in this image yet, only the baked-in `postgres`
    superuser and the empty `sorrel_template`. `app` has
    `depends_on: { postgres: { condition: service_healthy } }`, so
    `make docker-up` blocks on `postgres Healthy` before `app Starting`.
    `DATABASE_URL: postgres://sorrel:sorrel@postgres:5432/sorrel` is still
    set on `app` but inert — every `POSTGRES_*` env var is ignored by a real
    container from this image, since PGDATA is already populated at build
    time (M0.18) and `docker-entrypoint.sh` only reads them on first boot.
    Harmless today since `app` doesn't query the database yet; M1.27 is what
    gives the image real, known-password credentials. A `postgres_data`
    volume left over from the old plain `postgres:17` image only has the
    `sorrel` role/database that image's own init created — switching
    `image:`/`build:` doesn't reset an existing volume, so it keeps serving
    that old data; `make docker-rebuild` (`down -v`) gets a fresh one.
    Port `5432` is
    published for the host-side Vitest `db` project. `workshop` does not
    depend on it.
  - **Volumes** — one `node_modules` volume per service (`node_modules_app`,
    `node_modules_workshop`); a single shared volume makes the two services
    race to populate it from their images on first mount. Plus `postgres_data`
    for the database. All persist across `docker compose restart` and
    `make docker-down`; only `make docker-rebuild` (`down -v`) clears them. No
    LMDB / `.cache` / `gatsby_*` volume.
- **`makefile`** targets, each a `docker compose -f Docker/docker-compose.yaml`
  wrapper (via the `COMPOSE` variable):
  - `make docker-up` — start the app on 8000 and Postgres, detached; waits
    for the Postgres health check before the app starts.
  - `make docker-workshop` — also start the workshop on 61000
    (`--profile workshop up`).
  - `make docker-build` — build both images (`--profile workshop build`).
  - `make docker-down` — stop and remove everything, workshop profile included;
    named volumes kept.
  - `make docker-rebuild` — `down -v` (drops the `node_modules` volumes) then
    rebuild and start the app.
  - `make docker-logs` — follow.
  - `make docker-update-token` — run `Docker/update-token.sh` to refresh the
    devcontainer's `CLAUDE_CODE_OAUTH_TOKEN` in `Docker/.env`. Standalone, not
    a prerequisite of `docker-up` (resume-2026 chained it there) — `docker-up`
    no longer starts the devcontainer.
- **`.dockerignore`** (repo root, M0.11) — excludes `node_modules`, `.next`,
  `.git`, `build`, coverage and local env/state from the build context.
- **`.devcontainer/`** (M0.14) — `devcontainer.json` plus a
  `docker-compose.yml` overlay merged on top of `Docker/docker-compose.yaml`.
  The overlay adds one service, `devcontainer`, that mirrors `app`: builds
  `Docker/Dockerfile.node` `target: development` (no `devcontainer` image
  stage or main-stack service), same `..:/app` bind mount, same
  `DATABASE_URL`, same `depends_on: postgres` health gate — but its own
  `node_modules_devcontainer` volume, no published ports, and
  `command: sleep infinity` so it idles instead of running `npm run dev`.
  `devcontainer.json` forwards **8000** (`next dev`) and **8001** (production
  build), and adds zsh + oh-my-zsh (`common-utils` feature) at create time plus
  `gh` via `postCreateCommand: sudo apk add --no-cache github-cli` — the slim
  `development` image has neither, and the `github-cli` devcontainer feature is
  Debian-only so it fails the build on Alpine.
  - **Path base is `Docker/`.** VS Code Remote-Containers runs `docker compose`
    with no `--project-directory`, so relative paths in the overlay resolve
    against the first `-f` file's dir. Hence `./claude-home` → `Docker/claude-home`
    and `Docker/.env` is the auto-loaded env file — the resume-2026 layout.
  - **Auth.** `CLAUDE_CODE_OAUTH_TOKEN` (from `make docker-update-token` →
    `Docker/.env`) pre-authenticates the in-container Claude CLI;
    `GITHUB_PERSONAL_ACCESS_TOKEN` (set by hand in `Docker/.env`, also passed
    as `GH_TOKEN`) authenticates `gh`. Template: `Docker/.env.example`. All
    `${…:-}` so a missing `Docker/.env` is not an error.
  - **`claude-home`.** `Docker/claude-home` (git-ignored) bind-mounts to
    `/home/node/.claude` so Claude's context survives `make docker-rebuild`
    (`down -v`); `initializeCommand` `mkdir`s it host-side first.
  - `make docker-up` is untouched: it names only `Docker/docker-compose.yaml`.
    Reasoning:
    [`design-decisions/m0.14-devcontainer.md`](design-decisions/m0.14-devcontainer.md).
