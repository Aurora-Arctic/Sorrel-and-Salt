# Docker / local stack — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

The local development stack: one image, `docker compose`, a real local Postgres,
no Neon connection and no host Node-version juggling.

- **`Docker/Dockerfile.node`** — two stages on `node:26.6.0-alpine`:
  `development` (deps + source, `CMD ["npm","run","dev"]`) and `testing`
  (`FROM development`, `NODE_ENV=test`, a vitest default command; also carries
  `bash` + `git`, which the alpine base lacks and the CI workflows require).
  Deps install from the manifests before `COPY . .`, so a source edit keeps the
  `npm ci` layer cached. ~862 MB.
  - **Always `npm ci`, never `npm i`.** `libc6-compat` is the only `apk` package
    in the base stage; keep it that way.
  - **Playwright and any other browser tooling goes in a NEW stage**, never
    added to `testing` — `testing` is the image CI and the app share, and
    browsers would add roughly half a gigabyte to it.
  - **No `tini`.** PID-1 signal handling is delegated to compose's `init: true`,
    so any new service (or a bare `docker run`) needs that flag or it inherits
    zombie-reaping and signal problems.
- **`Docker/docker-compose.yaml`** — `name: sorrel-and-salt`, pinned so it does
  not collide with another project's compose stack on the same machine.

  - **`app`** — builds `target: development`, serves `next dev` on **8000**. No
    `command:`; `package.json`'s `dev` script already binds `0.0.0.0:8000` and
    is the Dockerfile `CMD`. `.next/` is written into the bind mount (git- and
    docker-ignored); there is no `.next` volume.
  - **`workshop`** — behind the **`workshop` compose profile**, so a bare
    `make docker-up` does not start it. Same build stage; runs
    `npm run workshop -- --host 0.0.0.0` (`ladle serve` binds `localhost`
    otherwise) and publishes **61000** (serve) and **61002** (pinned HMR socket).
    Does not depend on `postgres`.
  - **`postgres`** — `build:`s straight from `Docker/Dockerfile.postgres` rather
    than pulling the GHCR image `build-db-image.yml` publishes for CI; this file
    is local dev only. Named volume `postgres_data` at
    `/var/lib/postgresql/data`; health check
    `pg_isready -U postgres -d sorrel_template` (only the `postgres` superuser
    and the empty `sorrel_template` exist in the image today). `app` has
    `depends_on: { postgres: { condition: service_healthy } }`, so
    `make docker-up` blocks on `postgres Healthy` before `app Starting`. Port
    **5432** is published for the host-side Vitest `db` project.
    - **Every `POSTGRES_*` env var is ignored**, and `DATABASE_URL` on `app` is
      inert: PGDATA is populated at image _build_ time, and
      `docker-entrypoint.sh` only reads those vars on first boot. Harmless until
      the app queries the database; M1.27 gives the image real, known-password
      credentials.
    - **Switching `image:`/`build:` never resets an existing named volume** — a
      stale `postgres_data` keeps serving whatever the previous image's init
      created. `make docker-rebuild` (`down -v`) is what gets a fresh one.
  - **Volumes** — one `node_modules` volume per service
    (`node_modules_app`, `node_modules_workshop`, `node_modules_devcontainer`);
    a single shared volume makes the services race to populate it from their
    images on first mount. All persist across `docker compose restart` and
    `make docker-down`; only `make docker-rebuild` clears them.
    - **A new named volume over a path the app writes needs a matching
      `mkdir` + `chown node:node` in `Docker/Dockerfile.node`.** A fresh named
      volume mounts root-owned while `next dev` runs as `node`, so adding one
      (a `.next` volume, say) without that fails silently.
  - **Ladle's preview port 61001 is deliberately not published** — only 61000
    (serve) and 61002 (HMR) are.

- **`makefile`** — each target wraps
  `docker compose -f Docker/docker-compose.yaml` (via the `COMPOSE` variable):
  `docker-up` (app + Postgres, detached), `docker-workshop` (adds the workshop
  on 61000), `docker-build`, `docker-down` (keeps named volumes), `docker-rebuild`
  (`down -v`, then rebuild and start), `docker-logs`, and
  **`docker-build` / `docker-down` / `docker-rebuild` all pass
  `--profile workshop`** so they still reach the profiled service; a new target
  that forgets it leaves the workshop container orphaned. Plus
  `docker-update-token` (refreshes the devcontainer's `CLAUDE_CODE_OAUTH_TOKEN`
  in `Docker/.env` — standalone, not a prerequisite of `docker-up`).
- **`.dockerignore`** (repo root) — excludes `node_modules`, `.next`, `.git`,
  `build`, coverage and local env/state from the build context.
- **`.devcontainer/`** — `devcontainer.json` plus a `docker-compose.yml` overlay
  merged on top of `Docker/docker-compose.yaml`. The overlay adds one service,
  `devcontainer`, mirroring `app` (same `development` stage, `..:/app` bind
  mount, `DATABASE_URL`, `depends_on: postgres` health gate) but with its own
  `node_modules` volume, no published ports, and `command: sleep infinity` —
  which only sticks because `devcontainer.json` sets **`overrideCommand: false`**;
  without that the lifecycle re-pins the container to `npm run dev`.
  `devcontainer.json` forwards **8000** (`next dev`) and **8001** (production
  build), and adds zsh + oh-my-zsh (`common-utils` feature) plus `gh` via
  `postCreateCommand: sudo apk add --no-cache github-cli` — the slim image has
  neither, and the `github-cli` feature is Debian-only, so it fails to build on
  Alpine. `make docker-up` is unaffected: it names only
  `Docker/docker-compose.yaml`.
  - **Path base is `Docker/`.** VS Code Remote-Containers runs `docker compose`
    with no `--project-directory`, so relative paths in the overlay resolve
    against the first `-f` file's directory — hence `./claude-home` →
    `Docker/claude-home`, and `Docker/.env` as the auto-loaded env file.
  - **Auth.** `CLAUDE_CODE_OAUTH_TOKEN` (via `make docker-update-token`)
    pre-authenticates the in-container Claude CLI;
    `GITHUB_PERSONAL_ACCESS_TOKEN` (set by hand in `Docker/.env`, also passed as
    `GH_TOKEN`) authenticates `gh`. Template: `Docker/.env.example`. All are
    `${…:-}`, so a missing `Docker/.env` is not an error.
  - **New interactive tooling goes in `features` or `postCreateCommand` — never
    a new Dockerfile stage**, which would re-bloat the image CI and the app
    share. **Vet every feature for Alpine first**: many are Debian-only and fail
    the build (which is why `gh` is a `postCreateCommand`, not a feature).
    Features are pinned in the committed `devcontainer-lock.json`.
  - **`claude-home`.** `Docker/claude-home` (git-ignored) bind-mounts to
    `/home/node/.claude` so Claude's context survives `make docker-rebuild`;
    `initializeCommand` `mkdir`s it host-side first. The Claude CLI itself comes
    from the `anthropics/devcontainer-features/claude-code` feature.
    - **`~/.claude.json` is NOT under that bind mount**, and it is where the
      Asana MCP OAuth grant lives — so expect to re-authorize Asana after a
      `make docker-rebuild`.
