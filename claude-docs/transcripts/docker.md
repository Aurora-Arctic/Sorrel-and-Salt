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
