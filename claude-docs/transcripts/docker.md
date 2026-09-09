# Docker / local stack — transcript

Append-only. Newest entry at the bottom. Summary: [`../docker.md`](../docker.md).

## 2026-09-08 — M0.11 · slim `Docker/Dockerfile.node` (backfilled)

- Two-stage file on `node:26.6.0-alpine` — `development` (deps + source +
  `CMD ["npm","run","dev"]`) and `testing` (`FROM development`, `NODE_ENV=test`,
  a vitest default command). No third `devcontainer` stage, no Playwright.
- Deps installed from the manifests alone (`COPY package.json package-lock.json`
  → `npm ci`) before `COPY . .`, so a source edit leaves the install layer
  `CACHED`.
- New root `.dockerignore` — mandatory once the image `COPY`s source, so the
  host's macOS `node_modules` can't overwrite the container's `npm ci`.
- Final image ~862 MB, down ~79% from resume-2026's ~4,035 MB devcontainer.
- Full reasoning:
  [`../design-decisions/m0.11-slim-dockerfile-node.md`](../design-decisions/m0.11-slim-dockerfile-node.md).

## 2026-09-08 — M0.12 · `Docker/docker-compose.yaml` ported

- **`Docker/docker-compose.yaml`** created from
  `resume-2026/Docker/docker-compose.yaml`, Gatsby pieces removed:
  - LMDB cache volume (`gatsby_cache_*` at `/app/.cache`) — gone, nothing in
    its place. `next dev` writes `.next/` into the bind mount (git- and
    docker-ignored). A `.next` named volume was tried and reverted: fresh named
    volumes mount root-owned and `next dev` runs as `node`, so it needs a
    Dockerfile `mkdir`/`chown` — an M0.11-file change, deferred to a task that
    needs it.
  - `/gatsby-public` volume + `link-public.js` symlink — gone, Gatsby-only.
  - `devcontainer` service — gone. Dockerfile has no such stage (M0.11);
    `.devcontainer/` will build `development` directly (M0.14). No devcontainer
    ⇒ no token injection ⇒ `docker-up` drops the `update-token` prerequisite.
- **Two services: `app` (`next dev`, 8000) and `workshop` (`ladle serve`,
  61000 + 61002 HMR).** The workshop container is the one item the Asana task
  added past the milestone breakdown; the project owner confirmed it ships
  here. Both build `Docker/Dockerfile.node` `target: development`, tag
  `sorrel-node:development`.
- **`workshop` is behind the `workshop` compose profile** (project owner's
  call mid-task): `make docker-up` starts `app` only, `make docker-workshop`
  adds the workshop. `docker-build` / `docker-down` / `docker-rebuild` carry
  `--profile workshop` so they still cover it.
- **`app` needs no `command:`** — `package.json`'s `dev` is already
  `next dev --hostname 0.0.0.0 --port 8000` and is the Dockerfile `CMD`.
  `workshop` runs `npm run workshop -- --host 0.0.0.0`; `ladle serve` binds
  `localhost` without it.
- **One `node_modules` volume per service** (`node_modules_app`,
  `node_modules_workshop`). First tried a single shared volume — the two
  services raced to populate the fresh volume from their images and one died
  with `mkdir .../is-plain-obj: file exists`. resume-2026 keeps them separate
  for the same reason.
- **`name: sorrel-and-salt` pinned.** Without it the project name is `docker`
  (the compose file's parent dir), which `resume-2026/Docker/docker-compose.yaml`
  already uses on this machine. Observed: a stale shared `docker_node_modules`
  shadowed the image's baked deps and both containers exited `next: not found`.
- **`makefile`** — `docker-build` / `docker-up` / `docker-workshop` /
  `docker-down` / `docker-rebuild` / `docker-logs` added, each a thin
  `docker compose -f Docker/docker-compose.yaml …` wrapper via a `COMPOSE`
  variable; added to `.PHONY`; `make help` lines follow. No `update-token`
  prerequisite (resume-2026 had one for the devcontainer).
- **Verified:** clean `make docker-up` → `app` only, `curl` 200 on 8000;
  `make docker-workshop` → adds `workshop`, `curl` 200 on 61000;
  `make docker-down` removes both; `docker compose restart` keeps
  `node_modules_app` intact (359 entries, `.bin/next` still executable);
  project has only the two `node_modules_*` volumes, no LMDB volume;
  `docker compose config` validates.
- Reasoning:
  [`../design-decisions/m0.12-docker-compose.md`](../design-decisions/m0.12-docker-compose.md).

## 2026-09-08 — M0.13 · `postgres` service added

- **Built from DESIGN.md §11, not ported** — `resume-2026` has no database.
- **`postgres` service on `image: postgres:17`** (plain upstream). DESIGN.md
  §11 pins only the major. M0.18 publishes a preseeded Postgres 17 image
  (extensions + empty `sorrel_template`) to GHCR; M0.19 repoints this service
  and the CI `services:` block at that one tag "from one place". The literal
  ships now with a comment naming its successor — no indirection with no image
  to point at.
- **Named volume `postgres_data:/var/lib/postgresql/data`**, same lifecycle
  contract as `node_modules_*`: survives `restart` and `docker-down`, cleared
  only by `docker-rebuild` (`down -v`).
- **Health check `pg_isready -U sorrel -d sorrel`** (`interval 5s`,
  `retries 10`, `start_period 10s`). `app` gets
  `depends_on: { postgres: { condition: service_healthy } }`, so
  `make docker-up` blocks on `postgres Healthy` before `app Starting` —
  visible in the `up` output, not just eventually true.
- **`DATABASE_URL: postgres://sorrel:sorrel@postgres:5432/sorrel` on `app`** —
  reaches the DB by compose service name; throwaway `sorrel`/`sorrel` creds
  via `POSTGRES_USER`/`_PASSWORD`/`_DB`, no secret. M0.14's devcontainer sets
  the same value; no `devcontainer` compose service exists to carry it.
- **Port `5432:5432` published** for the host-side Vitest `db` project;
  in-network services use the `postgres` hostname. `workshop` gets no
  `DATABASE_URL` and no `depends_on` — it never touches a database.
- **`makefile`** — `docker-up` comment updated (starts app + Postgres, waits
  on the health check); no target changes.
- **Verified:** `make docker-up` from clean → compose output
  `postgres Started` → `Waiting` → `Healthy` → `app Starting`;
  `docker compose ps` shows `postgres` `Up (healthy)`, `select version()` →
  `PostgreSQL 17.11`. From inside `app`: `DATABASE_URL` set, Node TCP connect
  to `postgres:5432` succeeds. Persistence: insert `42`, restart the
  `postgres` container, wait healthy, `select` still returns `42`; the volume
  also survives `down` (no `-v`). `docker compose config` validates;
  `--services` = `postgres,app`, `--volumes` = `postgres_data,node_modules_app`.
- Reasoning:
  [`../design-decisions/m0.13-postgres-service.md`](../design-decisions/m0.13-postgres-service.md).

## 2026-09-08 — M0.14 · `.devcontainer/` ported against the `development` stage

- **Two files.** `.devcontainer/devcontainer.json` + a
  `.devcontainer/docker-compose.yml` overlay. `dockerComposeFile` lists
  `../Docker/docker-compose.yaml` then the overlay.
- **Path base = `Docker/`, confirmed against the extension source.** VS Code
  Remote-Containers (`devContainersSpecCLI.js`) runs `docker compose -f … up`
  with no `--project-directory`, so Compose uses the first `-f` file's dir,
  `Docker/`. Hence in the overlay `context: ..` = repo root, `./claude-home` =
  `Docker/claude-home`, and `Docker/.env` is the auto-loaded env file — the
  resume-2026 layout, unchanged. (Earlier probing with `--project-directory`
  set gave different bases; the extension never sets it.)
- **Overlay adds one service, `devcontainer`, mirroring `app`** — build
  `target: development` (no `devcontainer` image stage; M0.11), `..:/app:cached`
  bind mount, same `DATABASE_URL`, same
  `depends_on: { postgres: { condition: service_healthy } }`. Differences:
  its own `node_modules_devcontainer` volume (a shared fresh volume races,
  per M0.12), **no published ports** (the editor forwards), and
  `command: ["sleep", "infinity"]` with `overrideCommand: false` so it idles
  instead of running the `development` stage's `npm run dev` `CMD`.
- **`forwardPorts: [8000, 8001]`** — 8000 `next dev`, 8001 the production
  build. resume-2026 forwarded only 8001. `portsAttributes` labels both.
- **zsh via the `common-utils` feature, `gh` via `postCreateCommand`**, not
  the image — resume-2026 installed both in the deleted `devcontainer`
  Dockerfile stage; the slim `development` image has neither.
  `ghcr.io/devcontainers/features/common-utils:2` (`installZsh` /
  `installOhMyZsh` / `configureZshAsDefaultShell`, `username: node`) handles
  zsh + oh-my-zsh. `ghcr.io/devcontainers/features/github-cli:1` was tried for
  `gh` but it is Debian-only (no `apk` branch in its `install.sh`) and failed
  the Alpine build with exit 127; replaced with
  `postCreateCommand: "sudo apk add --no-cache github-cli"` (Alpine's
  `community` repo carries it; `sudo` is passwordless via `common-utils`). The
  `terminal.integrated` zsh profile in `devcontainer.json` is kept.
- **`.devcontainer/devcontainer-lock.json`** committed — the devcontainer CLI
  writes it on first build, pinning the `common-utils` feature to a resolved
  digest for reproducible rebuilds (analogous to `package-lock.json`).
- **Claude + GitHub auth ported from resume-2026 (same PR, project owner's
  call).** `Docker/update-token.sh` (`make docker-update-token`) runs
  `claude setup-token` on the host and upserts `CLAUDE_CODE_OAUTH_TOKEN` into
  git-ignored `Docker/.env`; `Docker/.env.example` is the committed template.
  The overlay passes `CLAUDE_CODE_OAUTH_TOKEN`, `GITHUB_PERSONAL_ACCESS_TOKEN`,
  and `GH_TOKEN` (= the PAT, the name `gh` reads) through with `${…:-}` so
  `config` stays warning-free when `Docker/.env` is absent. `Docker/.env` is
  auto-loaded as the project-dir env file — no `env_file:`/`--env-file`.
- **`claude-home` persistence.** `./claude-home:/home/node/.claude:cached`
  (→ git-ignored `Docker/claude-home`) — a bind mount so it survives
  `make docker-rebuild`'s `down -v`. `devcontainer.json` `initializeCommand`
  does the host-side `mkdir -p` so Compose doesn't create it root-owned.
- Extension list ported as-is minus the duplicate `ms-playwright.playwright`.
- **Verified:** `docker compose -f Docker/docker-compose.yaml -f
.devcontainer/docker-compose.yml config` validates; `devcontainer` resolves
  `context` to the repo root, `./claude-home` → `Docker/claude-home`,
  `target: development`, `depends_on.postgres.condition: service_healthy`,
  `node_modules_devcontainer`. `… up -d --build devcontainer` from clean:
  `postgres Healthy` → `devcontainer Starting`. Inside: `whoami` → `node`,
  `pwd` → `/app`, `DATABASE_URL` set, `node_modules` has 359 entries with
  `.bin/next` + `.bin/tsc`, `require('next/package.json').version` → `16.3.4`,
  `net.connect(5432, 'postgres')` connects. With a throwaway `Docker/.env`:
  `CLAUDE_CODE_OAUTH_TOKEN` / `GH_TOKEN` / `GITHUB_PERSONAL_ACCESS_TOKEN` all
  present in `printenv`; `touch /home/node/.claude/x` as `node` writes through
  to host `Docker/claude-home/`. `devcontainer.json` parses as strict JSON.
  `make docker-up` unaffected (names only `Docker/docker-compose.yaml`).
  The `common-utils` feature, `postCreateCommand`, and `initializeCommand`
  only run under the editor — not exercised by plain `docker compose`.
- **Editor run (2026-09-08):** first "Reopen in Container" failed building the
  `github-cli` feature (exit 127, Debian-only). Dropped that feature, moved
  `gh` to `postCreateCommand` (`sudo apk add --no-cache github-cli`); rebuild
  succeeded. `devcontainer-lock.json` written for the remaining feature.
- Reasoning:
  [`../design-decisions/m0.14-devcontainer.md`](../design-decisions/m0.14-devcontainer.md).
