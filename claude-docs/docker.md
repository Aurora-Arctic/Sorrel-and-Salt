# Docker / local stack

The local development stack: one image, `docker compose`, a real local Postgres, no Neon connection and no host Node-version juggling.

## The application image

`Docker/Dockerfile.node` has two stages on the Node alpine image: `development` (dependencies only, `CMD ["npm","run","dev"]`) and `testing` (`FROM development`, `NODE_ENV=test`, a vitest default command; it also carries `bash` and `git`, which the alpine base lacks and the CI workflows require).

**Neither stage carries source.** The image copies in the two manifests, runs `npm ci`, and stops. Source arrives from outside: the `..:/app` bind mount in every compose service and the devcontainer, or `checkout-to-app`'s copy in CI. A new `COPY` source is a decision for review, because a copied source survives in CI after the repo deletes a file and is then linted, typechecked and globbed as if the branch still had it (guard: `tests/guards/image-source-layer.test.ts`).

- **Always `npm ci`, never `npm i`.** `libc6-compat` is the only `apk` package in the base stage; keep it that way.
- **Playwright and any other browser tooling goes in a new stage**, never in `testing`, which CI and the app share and which browsers would grow by roughly half a gigabyte.
- **No `tini`.** PID-1 signal handling is compose's `init: true`, so any new service (or a bare `docker run`) needs that flag or it inherits zombie-reaping and signal problems.

## The compose file

`Docker/docker-compose.yaml` is named `sorrel-and-salt`. The name is pinned because the default, the parent directory, would be `docker`, which `resume-2026` (also under a `Docker/` directory) already claims on the same machine; the two would share `node_modules` volumes and clobber each other. The build context is the repo root (`..`), read through the root `.dockerignore`, which excludes `node_modules`, `.next`, `.git`, `.reports/` and local env and state files.

### db-init

A one-shot container on the `development` stage that runs `sh -c 'npm run db:migrate && npm run db:seed'` and exits. `app` waits on `condition: service_completed_successfully`, so the first `make docker-up` on a clean `postgres_data` volume comes up migrated and seeded, and a failed migration stops `app` instead of leaving a running app that 500s.

- **It cannot live in `Docker/postgres-init/`.** The seed is TypeScript and the Postgres image has no Node. That directory also never runs at container start: `Dockerfile.postgres` populates PGDATA during the image build, so `docker-entrypoint.sh` finds an initialised data directory and skips `/docker-entrypoint-initdb.d/`.
- It is not the test harness's template database: that clones `sorrel_template` and runs these same two scripts against the clone (`tests/support/seeded-database.ts`), and is what the Vitest workers and Playwright use, not what `app` connects to.
- **No compose profile**, unlike `workshop`, `studio` and `e2e`: a bare `make docker-up` has to reach it.
- **`SEED_SCENARIO`** comes from `${SEED_SCENARIO:-minimal}` (host environment or `Docker/.env`). An unrecognised name fails this container, and so `app`, rather than quietly seeding `minimal` (`resolveScenario`, `claude-docs/db/migrations-and-scripts.md`).
- **It re-runs on every `docker compose up`, deliberately.** Migrations are journal-guarded and every scenario is idempotent by fixed id, so the cost is a few seconds and a developer who just pulled migrations gets them from the command they were running anyway.

### app

Builds `target: development` and serves `next dev` on **8000**. It has no `command:`: `package.json`'s `dev` script already binds `0.0.0.0:8000` and is the Dockerfile `CMD`. `.next/` is written into the bind mount (git- and docker-ignored); there is no `.next` volume. It waits on `postgres` healthy and on `db-init` exited zero.

**Second DNS alias `sorrel-app`, for browser-facing URLs only.** `.app` is a Google-registered gTLD and every major browser hard-codes an HSTS-preload entry for the bare domain `app`: a real Chrome navigating to `http://app:8000` is upgraded to `https://` and fails with `ERR_SSL_PROTOCOL_ERROR`, and no launch flag disables it. Service-to-service traffic (`DATABASE_URL`-style) keeps using bare `app`; use `sorrel-app` for any URL a real browser loads (`make docker-codegen` is the case that needs it, `claude-docs/testing/debugging.md`). The remote-browser e2e path does not need it, since its `baseURL` is `http://devcontainer:<port>`.

### mailpit

The local and e2e inbox, from the pinned `axllent/mailpit` image, with no profile. It accepts mail over HTTP (`POST /api/v1/send`) and delivers none of it; its UI and the REST API that `tests/e2e/mailpit.ts` reads share **8025**, and `/mailpit readyz` is its health check. `app`, `e2e` and the `devcontainer` overlay wait on it healthy and set `MAIL_TRANSPORT=mailpit` and `MAILPIT_URL=http://mailpit:8025`, so every message the app sends locally lands at `http://localhost:8025`. It is HTTP rather than SMTP because every deployed target is HTTP too and `src/lib/mail.ts` keeps one shape of transport ([`auth.md`, "First-party email verification and email delivery"](design-decisions/auth.md#first-party-email-verification-and-email-delivery), "Delivery").

### workshop

Behind the `workshop` profile, so a bare `make docker-up` does not start it. Same build stage; it runs `npm run workshop` (Storybook, bound to every interface by the script's `--host 0.0.0.0`) and publishes **61000** alone, since the live-reload socket shares that port. A browser on the host reaches it as `localhost:61000`, a name Vite always accepts; the Playwright browser reaches it as `devcontainer`, which `.storybook/main.ts` allows. It does not depend on `postgres`.

- It sets `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_0` and `GIT_CONFIG_VALUE_0` so git trusts `/app` (`safe.directory`) in this container only. The container's user does not own the host-mounted `/app`, git refuses it ("dubious ownership"), and Storybook's change detection (`git rev-parse`) would fail. No config file is written.
- No file-watch polling is set; if host edits stop showing up, set `CHOKIDAR_USEPOLLING=1` on the service.
- Its packages reinstall on start when the lock file changed (see Volumes).

### studio

Behind the `studio` profile, same build stage; it runs `npm run db:studio` (`drizzle-kit studio --host 0.0.0.0 --port 4983`, reading `drizzle.config.ts`) and publishes **4983**. Unlike `workshop` it depends on `postgres` (health gated). The Studio UI is hosted at `https://local.drizzle.studio` and the browser connects from there back to `127.0.0.1:4983`, so this service serves data only, never a page.

### jobs

Behind the `jobs` profile, same build stage; it runs `npm run jobs:web` (`workflow web --noBrowser`, the Workflow SDK's own page) and publishes **3456**. It lists the background job runs a local dev server has made (each run's steps, events and hooks), read from `.next/workflow-data/` through the `..:/app` bind mount (`WORKFLOW_TARGET_WORLD=local`, `WORKFLOW_LOCAL_DATA_DIR`). It shows whichever dev server last ran, in `app` or the devcontainer, and nothing until one has. It needs no database and no sign-in, and is local only (deployed runs are on the Vercel dashboard). Cancelling a run on the page acts on the local data only.

### postgres

Built from `Docker/Dockerfile.postgres` rather than pulling the GHCR image `build-db-image.yml` publishes for CI. Named volume `postgres_data` at `/var/lib/postgresql/data`. Port **5432** is published for the host-side Vitest `db` project. The health check is `pg_isready -U postgres -d sorrel_template`: that pair proves the server is up (`Docker/postgres-init/enable-extensions.sql` creates the `sorrel` role and database at image build time). `app` and `db-init` gate on it with `condition: service_healthy`. The image's `CMD` sets `max_connections=200`; a container from an older build lacks it, so `make docker-build` then `make docker-up` recreates it ([`testing/db-harness.md`](testing/db-harness.md#connections-per-run-mb179)).

- **Every `POSTGRES_*` env var is ignored**: PGDATA is populated at image build time and `docker-entrypoint.sh` reads those vars only on first boot. The credentials the image has (`sorrel`/`sorrel`) come from its own init script. `DATABASE_URL` on `app` is not inert: `src/db/connection.ts` throws when it is unset and the Better Auth route handlers query through that client. The schema and seed data come from `db-init` at container start, never from the image.
- **Switching `image:`/`build:` never resets an existing named volume**: a stale `postgres_data` keeps serving what the previous image's init created. `make docker-rebuild` (`down -v`) gets a fresh one. The tell is a `FATAL: role "postgres" does not exist` line on every health-check tick, from a volume that has only the `sorrel` role. It is not a failing check, since `pg_isready` asks only whether the server answers.

### Volumes

One `node_modules` volume per service: `node_modules_app`, `_workshop`, `_studio`, `_jobs`, `_e2e`, `_playwright_server`, `_db_init`, `_devcontainer`. A single shared volume makes the services race to populate it from their images on first mount. `db-init` could not race `app`, but gets its own anyway so the rule stays "one per service". All persist across `docker compose restart` and `make docker-down`; `make docker-rebuild` clears them.

- **A lock-file change reinstalls by itself.** Docker fills a named volume from the image only when the volume is first created, so afterwards the volume hides the packages of a rebuilt image. `Docker/ensure-deps.sh` is the `entrypoint` of every service that mounts one of these volumes (`db-init`, `app`, `workshop`, `studio`, `jobs`, `e2e`, `playwright-server`, `devcontainer`). It compares the SHA-256 of `package-lock.json` with the one saved at `node_modules/.lock-sha256`; if they differ, or the file is missing, it runs `npm ci`, saves the new hash, then runs the service's command. `Dockerfile.node` and `Dockerfile.e2e` save the same hash after their own `npm ci`, so a fresh volume copies it and nothing installs twice. `npm ci` empties `node_modules` but not the directory, so it works on a mount point.
  - Setting `entrypoint` clears the image's `CMD`, so every wrapped service names its `command` in compose (`app` writes out `npm run dev`).
  - A failed install stops the container, except on `devcontainer`, which sets `ENSURE_DEPS_ON_FAILURE=warn`: it warns, saves no hash (so the next start retries) and starts anyway, so an offline start still opens the editor.
  - The script reads the lock file only. A Dockerfile change, or a browser a new Playwright version needs (both live in the image, outside `node_modules`), still needs a rebuild.
  - `playwright-audit` and `lighthouse-chrome` mount no `node_modules` volume and are not wrapped.
- **A new named volume over a path the app writes needs a matching `mkdir` and `chown node:node` in `Docker/Dockerfile.node`.** A fresh named volume mounts root-owned while `next dev` runs as `node`, so without it the write fails silently.

### The end-to-end image

`Docker/Dockerfile.e2e` has two stages. `e2e` is the Node bookworm-slim image plus `npm ci` and Chromium's headless shell (what CI and `make docker-e2e` build). `headed` (`FROM e2e`) adds the full Chromium, Xvfb, openbox and an x11vnc/noVNC bridge. An unqualified `docker build` picks the last stage, so `.github/workflows/build-e2e-image.yml` and the `e2e` compose service pin `target: e2e`. The `playwright-server` service (profile `e2e`) builds `target: headed` and takes its own image tag, `sorrel-e2e-headed`, to avoid a last-build-wins collision with `sorrel-e2e`. It publishes **7900** (noVNC) and 4444 (the runner's WebSocket); see `claude-docs/testing/debugging.md`.

### playwright-audit

Behind the `audit` profile, raised by `make playwright-audit-up` and stopped by `playwright-audit-down`: `playwright run-server` on Microsoft's `mcr.microsoft.com/playwright` image, which carries WebKit and Firefox as well as Chromium, for the devcontainer's `npm run e2e:audit` (`claude-docs/testing/e2e.md`, "The audit runs the suite in WebKit, Firefox and as a phone, on demand"). The image tag and the `npx -y playwright@<version>` it runs are the lockfile's `@playwright/test` version, kept in step by hand. No port is published: only the devcontainer dials it, at `ws://playwright-audit:4444/` (`PLAYWRIGHT_AUDIT_WS_ENDPOINT`, set in `.devcontainer/docker-compose.yml` alone). `ipc: host` is Playwright's own Docker advice for Chromium. It is not built from `Docker/Dockerfile.e2e`, which stays Chromium alone.

### lighthouse-chrome

On the same `audit` profile, raised by `make lighthouse-up` and stopped by `lighthouse-down`: a headless Chromium from the same Microsoft image with a DevTools port open, for the devcontainer's `npm run lighthouse:seo`. The Playwright servers launch Chromium over a pipe, so none of them has a DevTools port. `Docker/lighthouse-chrome.sh` (bind-mounted) finds the image's Chromium, starts it on loopback port 9223, and a Node forwarder publishes that on 9222. **No port is published to the host**, because DevTools has no authentication: only the devcontainer reaches it, at `lighthouse-chrome:9222` (`LIGHTHOUSE_CDP_HOST` and `LIGHTHOUSE_CDP_PORT`, set in `.devcontainer/docker-compose.yml` alone).

## The makefile

Each target wraps `docker compose -f Docker/docker-compose.yaml` (the `COMPOSE` variable).

- `docker-up`: app and Postgres, detached, migrated and seeded by `db-init` first (`SEED_SCENARIO=demo make docker-up` picks a scenario).
- `docker-workshop`, `docker-studio`, `docker-jobs`: add the workshop (61000), Drizzle Studio (4983) and the job viewer (3456).
- `docker-all`: app, Postgres, workshop, studio and the Playwright browser server together. Its `--profile e2e up -d` names `playwright-server` explicitly, since `e2e` itself is a one-shot suite run, not a service to leave up.
- `docker-build`, `docker-down` (keeps named volumes), `docker-rebuild` (`down -v`, then rebuild and start), `docker-logs`.
- **`docker-build`, `docker-down` and `docker-rebuild` all pass `--profile workshop --profile studio --profile jobs --profile e2e --profile audit`** so they reach every profiled service. A new profiled service must be added to all three, or `docker-down` orphans it (`audit` has nothing to build and rides on `docker-build` so the three stay one list).
- `playwright-server-up`/`-down`, `playwright-audit-up`/`-down` and `lighthouse-up`/`-down` raise and stop the two browser servers and the Lighthouse Chromium on their own.
- `docker-update-token` refreshes the devcontainer's `CLAUDE_CODE_OAUTH_TOKEN` in `Docker/.env`; it is not a prerequisite of `docker-up`.
- `docker-codegen NAME=<spec>` starts `playwright-server` if needed, then `exec`s `playwright codegen` into it as the caller's uid, writing `tests/e2e/<spec>.spec.ts` (recording workflow: `claude-docs/testing/debugging.md`).
- `make setup` wraps `npm run setup`, which copies `Docker/.env.example` to `Docker/.env` (beside the root and editor examples) and keeps any copy that exists.

## The dev container

`.devcontainer/` is `devcontainer.json` plus a `docker-compose.yml` overlay merged on top of `Docker/docker-compose.yaml`. The overlay adds one service, `devcontainer`, mirroring `app` (same `development` stage, `..:/app` bind mount, `DATABASE_URL`, `postgres` health gate) but **not** `app`'s `db-init` gate: attaching an editor should not block on a migration run, and `npm run db:reset` is run from the devcontainer when the database needs rebuilding. It has its own `node_modules` volume, no published ports, and `command: sleep infinity`, which only sticks because `devcontainer.json` sets **`overrideCommand: false`**; without it the lifecycle re-pins the container to `npm run dev`.

`devcontainer.json` forwards eleven ports: **8000** (`next dev`), **8001** (production build), **4983** (Drizzle Studio, run as `npm run db:studio` directly since `make` and `docker` are not in the devcontainer), **3456** (job viewer, `npm run jobs:web`), and seven debugging ports (9229, 9230, 9231, 9323, 9324, 51204, 7900), annotated in `claude-docs/testing/debugging.md`. It adds zsh and oh-my-zsh (`common-utils` feature) and `gh` via `postCreateCommand: sudo apk add --no-cache github-cli`, because the `github-cli` feature is Debian-only and fails on Alpine. `make docker-up` names only `Docker/docker-compose.yaml`, so the overlay does not affect it.

- **Path base is `Docker/`.** VS Code Remote-Containers runs `docker compose` with no `--project-directory`, so relative paths in the overlay resolve against the first `-f` file's directory: `./claude-home` is `Docker/claude-home`, and `Docker/.env` is the auto-loaded env file.
- **Auth.** `CLAUDE_CODE_OAUTH_TOKEN` (via `make docker-update-token`) pre-authenticates the in-container Claude CLI; `GITHUB_PERSONAL_ACCESS_TOKEN` (set by hand in `Docker/.env`, also passed as `GH_TOKEN`) authenticates `gh`. Template: `Docker/.env.example`. All are `${…:-}`, so a missing `Docker/.env` is not an error.
- **New interactive tooling goes in `features` or `postCreateCommand`, never a new Dockerfile stage**, which would re-bloat the image CI and the app share. **Vet every feature for Alpine first**; many are Debian-only and fail the build. Features are pinned in the committed `devcontainer-lock.json`.
- **`claude-home`.** `Docker/claude-home` (git-ignored) bind-mounts to `/home/node/.claude` so Claude's context survives `make docker-rebuild`; `initializeCommand` `mkdir`s it host-side first. The Claude CLI comes from the `anthropics/devcontainer-features/claude-code` feature.
  - **`~/.claude.json` is not under that bind mount**, so anything an MCP server stores there (an OAuth grant, say) is lost on `make docker-rebuild`. `/home/node/worktrees` is not preserved either, so commit worktree work before a rebuild.
