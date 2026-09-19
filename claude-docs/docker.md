# Docker / local stack — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

The local development stack: one image, `docker compose`, a real local Postgres,
no Neon connection and no host Node-version juggling.

- **`Docker/Dockerfile.node`** — two stages on `node:26.6.0-alpine`:
  `development` (dependencies only, `CMD ["npm","run","dev"]`) and `testing`
  (`FROM development`, `NODE_ENV=test`, a vitest default command; also carries
  `bash` + `git`, which the alpine base lacks and the CI workflows require).
  **Neither stage carries source** (MB.42): the image copies in the two
  manifests, runs `npm ci`, and stops. Source arrives from outside — the
  `..:/app` bind mount in every compose service and the devcontainer, or
  `checkout-to-app`'s copy in CI — and
  `tests/guards/image-source-layer.test.ts` allowlists each Dockerfile's
  `COPY` sources so a source layer cannot come back unnoticed. Until MB.42 a
  `COPY . .` followed the dependency layer; the bind mount shadowed it
  everywhere but CI, where a file the repo had deleted survived the copy and
  was linted, typechecked and globbed as if the branch still had it.
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

  - **`db-init`** (M1.24) — the Docker seed hook: a **one-shot** container on
    the same `development` stage, running
    `sh -c 'npm run db:migrate && npm run db:seed'` and exiting. `app` waits on
    `condition: service_completed_successfully`, so the first
    `make docker-up` on a clean `postgres_data` volume comes up migrated and
    seeded rather than pointed at an empty database, and a failed migration
    stops `app` instead of producing a running app that 500s on first request.
    - **It is not in `Docker/postgres-init/`, and could not be.** The seed is
      TypeScript and the Postgres image has no Node — and that directory does
      not run at container start anyway: `Dockerfile.postgres` populates
      PGDATA during the image _build_, so `docker-entrypoint.sh` finds an
      initialised data directory and skips `/docker-entrypoint-initdb.d/`
      entirely. A Node-side one-shot is what the outcome actually costs.
      Distinct from the test harness's templates (M1.27): those clone
      `sorrel_template` and run these same two npm scripts against the clone
      at test-run setup (`tests/support/seeded-database.ts`), and are what
      the Vitest workers and Playwright clone, not what `app` connects to.
    - **No compose profile**, unlike `workshop`/`studio`/`e2e`: a bare
      `make docker-up` has to reach it.
    - **`SEED_SCENARIO: ${SEED_SCENARIO:-minimal}`** — host environment or
      `Docker/.env`, defaulting to the bare install. An unrecognised name fails
      this container (and so `app`) rather than quietly seeding `minimal`; see
      `resolveScenario` in `claude-docs/db.md`.
    - **It re-runs on every `docker compose up`, deliberately.** Migrations are
      journal-guarded and every scenario is idempotent by fixed id, so the cost
      is a few seconds and the payoff is that a developer who just pulled new
      migrations gets them applied by the command they were going to run anyway.
  - **`app`** — builds `target: development`, serves `next dev` on **8000**. No
    `command:`; `package.json`'s `dev` script already binds `0.0.0.0:8000` and
    is the Dockerfile `CMD`. `.next/` is written into the bind mount (git- and
    docker-ignored); there is no `.next` volume. Gated on `postgres` being
    healthy **and** on `db-init` having exited zero (M1.24).
    - **Second DNS alias `sorrel-app` (MB.23), for browser-facing URLs only.**
      `.app` is a Google-registered gTLD, and every major browser ships a
      hard-coded HSTS-preload entry for the bare domain `app` — a real
      Chrome navigating to `http://app:8000` gets silently upgraded to
      `https://` and fails with `ERR_SSL_PROTOCOL_ERROR`, and no launch flag
      can disable it (the preload list is compiled into the binary, not
      loaded at runtime). Nothing else in this repo hits `app` from a real
      browser — the remote-browser e2e path's `baseURL` is
      `http://devcontainer:8001` — so this only bit `make docker-codegen`
      (`claude-docs/debugging.md`), which is what surfaced it. Every
      non-browser reference (`DATABASE_URL`-style service-to-service
      traffic) keeps using bare `app`; `sorrel-app` exists solely for URLs a
      real browser will load.
  - **`workshop`** — behind the **`workshop` compose profile**, so a bare
    `make docker-up` does not start it. Same build stage; runs
    `npm run workshop -- --host 0.0.0.0` (`ladle serve` binds `localhost`
    otherwise) and publishes **61000** (serve) and **61002** (pinned HMR socket).
    Does not depend on `postgres`.
  - **`studio`** (MB.21) — behind the **`studio` compose profile**, same
    build stage; runs `npm run db:studio` (`drizzle-kit studio --host
0.0.0.0 --port 4983`, reading `drizzle.config.ts`) and publishes
    **4983**. Unlike `workshop`, it **does** depend on `postgres` (health
    gated) — there is nothing to browse without a database connection. The
    Studio UI is hosted externally at `https://local.drizzle.studio`; the
    browser connects from there back to `127.0.0.1:4983`, so this service
    serves data only, never a page.
  - **`postgres`** — `build:`s straight from `Docker/Dockerfile.postgres` rather
    than pulling the GHCR image `build-db-image.yml` publishes for CI; this file
    is local dev only. Named volume `postgres_data` at
    `/var/lib/postgresql/data`; health check
    `pg_isready -U postgres -d sorrel_template` — it probes `postgres`/
    `sorrel_template` because that pair proves the server is up, not because
    `sorrel` is missing (`Docker/postgres-init/enable-extensions.sql` creates
    the `sorrel` role and database at image build time). Both `app` and
    `db-init` have `depends_on: { postgres: { condition: service_healthy } }`,
    so `make docker-up` blocks on `postgres Healthy` before either starts. Port
    **5432** is published for the host-side Vitest `db` project.
    - **Every `POSTGRES_*` env var is ignored**: PGDATA is populated at image
      _build_ time, and `docker-entrypoint.sh` only reads those vars on first
      boot. The credentials the image really has (`sorrel`/`sorrel`) come from
      its own init script instead. `DATABASE_URL` on `app` is **not** inert as
      of Wave 1 — `src/db/connection.ts` throws when it is unset, and the
      Better Auth route handlers query through that client. The schema and
      seed data come from `db-init` at container start, never from the image
      (M1.27 decided against baking them in); the credentials are already real.
    - **Switching `image:`/`build:` never resets an existing named volume** — a
      stale `postgres_data` keeps serving whatever the previous image's init
      created. `make docker-rebuild` (`down -v`) is what gets a fresh one.
  - **Volumes** — one `node_modules` volume per service
    (`node_modules_app`, `node_modules_workshop`, `node_modules_studio`,
    `node_modules_e2e`, `node_modules_playwright_server`,
    `node_modules_db_init`, `node_modules_devcontainer`);
    a single shared volume makes the services race to populate it from their
    images on first mount. `db-init` runs to completion before `app` starts and
    so could not actually race it — it gets its own anyway, because "one per
    service" is the rule that makes that reasoning unnecessary. All persist across `docker compose restart` and
    `make docker-down`; only `make docker-rebuild` clears them.
    - **A new named volume over a path the app writes needs a matching
      `mkdir` + `chown node:node` in `Docker/Dockerfile.node`.** A fresh named
      volume mounts root-owned while `next dev` runs as `node`, so adding one
      (a `.next` volume, say) without that fails silently.
  - **Ladle's preview port 61001 is deliberately not published** — only 61000
    (serve) and 61002 (HMR) are.
  - **`Docker/Dockerfile.e2e`** has two stages as of MB.23:
    `e2e` (named, previously the file's only stage — Microsoft's Playwright
    base plus `npm ci`, headless, what CI and `make docker-e2e` build) and
    `FROM e2e AS headed` (adds Xvfb, openbox and an x11vnc/noVNC bridge for a
    display). Because an unqualified `docker build` picks the _last_ stage,
    both `.github/workflows/build-e2e-image.yml` and the `e2e` compose
    service pin `target: e2e` explicitly. The `playwright-server` compose
    service (MB.22, profile `e2e`) builds `target: headed` instead, and — to
    avoid a last-build-wins collision with the `e2e` service's `sorrel-e2e`
    tag — takes its own image, `sorrel-e2e-headed`. It publishes **7900**
    (noVNC) alongside its existing 4444 (the runner's WebSocket); see
    `claude-docs/debugging.md` for what runs behind it.

- **`makefile`** — each target wraps
  `docker compose -f Docker/docker-compose.yaml` (via the `COMPOSE` variable):
  `docker-up` (app + Postgres, detached, migrated and seeded by `db-init`
  first — `SEED_SCENARIO=demo make docker-up` picks a scenario),
  `docker-workshop` (adds the workshop
  on 61000), `docker-studio` (adds Drizzle Studio on 4983, MB.21), `docker-all`
  (app + Postgres + workshop + studio + the Playwright browser server
  together — `--profile e2e up -d` is scoped to name `playwright-server`
  explicitly rather than every service that profile enables, since `e2e`
  itself is a one-shot suite run, not a service to leave up; MB.23),
  `docker-build`, `docker-down` (keeps named volumes), `docker-rebuild`
  (`down -v`, then rebuild and start), `docker-logs`, and **`docker-build` /
  `docker-down` / `docker-rebuild` all pass
  `--profile workshop --profile studio --profile e2e`** so they still reach
  every profiled service; a new profiled service that forgets one of these
  three targets is left orphaned by `docker-down`. Plus `docker-update-token`
  (refreshes the devcontainer's `CLAUDE_CODE_OAUTH_TOKEN` in `Docker/.env` —
  standalone, not a prerequisite of `docker-up`), and `docker-codegen
NAME=<spec>` (MB.23) — starts `playwright-server` if needed, then `exec`s
  `playwright codegen` into it as the caller's uid, writing
  `e2e/<spec>.spec.ts`; see `claude-docs/debugging.md` for the recording
  workflow itself.
- **`.dockerignore`** (repo root) — excludes `node_modules`, `.next`, `.git`,
  `build`, coverage and local env/state from the build context.
- **`.devcontainer/`** — `devcontainer.json` plus a `docker-compose.yml` overlay
  merged on top of `Docker/docker-compose.yaml`. The overlay adds one service,
  `devcontainer`, mirroring `app` (same `development` stage, `..:/app` bind
  mount, `DATABASE_URL`, `depends_on: postgres` health gate) — but **not**
  `app`'s `db-init` gate (M1.24), on purpose: attaching an editor should not
  block on a migration run, and the devcontainer is where
  `npm run db:reset` is run from when the database does need rebuilding. It
  has its own
  `node_modules` volume, no published ports, and `command: sleep infinity` —
  which only sticks because `devcontainer.json` sets **`overrideCommand: false`**;
  without that the lifecycle re-pins the container to `npm run dev`.
  `devcontainer.json` forwards ten ports — **8000** (`next dev`), **8001**
  (production build), **4983** (Drizzle Studio, MB.21 — `npm run db:studio`
  run directly, since `make`/`docker` aren't in the devcontainer), and the
  seven debugging ports MB.22/MB.23 added (9229, 9230, 9231, 9323, 9324,
  51204, 7900); `claude-docs/debugging.md`'s port map is the annotated
  version. It also adds
  zsh + oh-my-zsh (`common-utils` feature) plus `gh` via
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
