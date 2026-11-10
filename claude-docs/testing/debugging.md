# Debugging

Stepping into a server, a service, a repository call or a test, watching what `withAudit` does to a query, and recording a Playwright spec. Tooling only.

## Getting set up

`npm run setup` copies `.vscode/launch.example.json` and `.vscode/tasks.example.json` to `launch.json` and `tasks.json` (keeping any that exist). The real files are gitignored (`.gitignore`'s `.vscode/*` deny, with the two examples carved out), because a developer's own breakpoints and task tweaks do not belong in a PR.

`launch.json` holds three **attach**-only configs, because every debuggable process starts from a terminal inside the devcontainer:

- **Attach: Next.js server**: port 9229, `restart: true` (Next's dev server can recycle the inspected process, and without `restart` an edit drops the session), `skipFiles: ["<node_internals>/**"]`.
- **Attach: Vitest**: port 9230, same `skipFiles`.
- **Attach: Playwright runner**: port 9231. Nothing listens there by default.

All three set `localRoot` and `remoteRoot` to `/app`: the devcontainer mounts the repo there and VS Code's debug adapter runs inside the same container, so there is one filesystem view.

`tasks.json` holds three background tasks, `dev:debug`, `test:debug` and `e2e:ui`, each a thin wrapper over the npm script. Each `pattern.regexp` is a deliberate non-match (`isBackground` needs a `problemMatcher.background` pair, and VS Code cannot take one without a `pattern`; oxlint and tsc own the Problems panel). No task is a `preLaunchTask`: starting and attaching are two steps, since `e2e:ui` needs no debugger.

## Port map

| Port  | What                                                                                            | Where it's forwarded/published                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 8000  | `next dev`                                                                                      | devcontainer.json, `app` service (Docker/docker-compose.yaml)                                                             |
| 8001+ | `next start`, one per e2e worker slot                                                           | devcontainer.json forwards 8001 alone; slot `n` serves on `8001 + n`, reached inside the compose network                  |
| 8100  | `next start`, e2e configured providers (`FIRST_SLOT_PORT + 99` in `tests/e2e/slots.ts`)         | none — reached inside the compose network                                                                                 |
| 8101  | `next start`, the one e2e server that keeps its compendium data cache (`FIRST_SLOT_PORT + 100`) | none — reached inside the compose network                                                                                 |
| 8102  | `next start`, the e2e workshop server (`FIRST_SLOT_PORT + 101`)                                 | none — reached inside the compose network                                                                                 |
| 5432  | Postgres                                                                                        | `postgres` service (Docker/docker-compose.yaml)                                                                           |
| 8025  | Mailpit UI and REST API                                                                         | `mailpit` service (Docker/docker-compose.yaml)                                                                            |
| 3456  | Job viewer (`npm run jobs:web`)                                                                 | job viewer service (Docker/docker-compose.yaml)                                                                           |
| 4983  | Drizzle Studio                                                                                  | devcontainer.json, `studio` service                                                                                       |
| 9229  | Node inspector — `next dev --inspect`                                                           | devcontainer.json, `app` service                                                                                          |
| 9230  | Node inspector — `vitest --inspect-brk`                                                         | devcontainer.json only (no long-running compose service serves this)                                                      |
| 9231  | Node inspector — Playwright runner (manual)                                                     | devcontainer.json only — reserved, nothing listens by default                                                             |
| 9323  | Playwright trace viewer                                                                         | devcontainer.json only                                                                                                    |
| 9324  | Playwright UI mode                                                                              | devcontainer.json only                                                                                                    |
| 51204 | Vitest UI (`@vitest/ui` default port)                                                           | devcontainer.json only                                                                                                    |
| 61000 | Storybook workshop                                                                              | `workshop` service                                                                                                        |
| 4444  | `playwright run-server` (remote browser)                                                        | `playwright-server` service (Docker/docker-compose.yaml, profile `e2e`) — dialed by the runner, never opened in a browser |
| 7900  | Playwright display — codegen, `page.pause()`                                                    | devcontainer.json, `playwright-server` service — a page you open, unlike 4444                                             |

The 8100 to 8102 rows are derived: `FIRST_SLOT_PORT` is 8001 or `E2E_PORT_BASE`, and a different base moves all three. The `devcontainer.json`-only rows are forwarded because the process that opens them starts from an editor terminal or a `tasks.json` task, so no compose service publishes them.

From the host, the `make` equivalents are `make dev-debug`, `make test-debug`, `make test-ui`, `make e2e-ui` and `make e2e-trace`, mirroring [`commands.md`](../commands.md). Neither `make` nor `docker` exists inside the devcontainer: run the npm scripts there.

## Server-side debugging

`npm run dev:debug` runs `next dev --inspect=0.0.0.0:9229`. It uses `next dev`'s native flag, not `NODE_OPTIONS`: Next's dev server spawns child processes that inherit `NODE_OPTIONS` and would each open an inspector on the next free port, colliding with 9230 (Vitest's). There is no `--brk`, so the server is already serving when a debugger attaches. Attach with the "Attach: Next.js server" config, or host Chrome or Edge at `chrome://inspect`; 9229 is published to the host.

There is no browser inside the container, so a **client-side** breakpoint (React code in the browser) is host Chrome DevTools against the forwarded port 8000. There is no VS Code client-side launch config.

## Server edits reload the server's modules

`next.config.ts` sets `experimental.turbopackServerFastRefresh: false`, so after an edit `next dev` drops its server modules and loads them from disk on the next request. The default instead re-runs the edited module and every module that imports it, which breaks the GraphQL schema that each module registers on the one `builder` from `src/graphql/builder.ts` as it loads:

- **Edit a module's GraphQL file** (`src/modules/*/graphql/*.ts`) and it re-runs against the builder it already registered on. Every `/api/graphql` request then fails with `PothosSchemaError: Duplicate field …` until the server restarts.
- **Edit `src/graphql/pagination.ts`** and the patch applies without an error, but the endpoint goes on serving the schema it started with.

With the setting off, both edits are served within 3 s. The cost is the first request after an edit, which reloads the modules: about 150–270 ms against 10 ms for the GraphQL route. A CLI `--server-fast-refresh` overrides the config, so no `dev` script passes it.

Not taken: declining hot updates through Turbopack's `module.hot` (undocumented server-side API, repeated in every registering file), and registering types through a function the route calls (rewrites every module's `graphql/` files for a development-only benefit).

## A restart compiles from the files

`next.config.ts` sets `experimental.turbopackFileSystemCacheForDev: false`. By default `next dev` keeps its compiled work in `.next/dev/cache/turbopack`, and that cache has served an old copy of a Sass partial (such as `src/scss/_variables.scss`, loaded with `@use`) after a new variable was added or an agent or merge changed the partial with the server running. Every page then failed with "Undefined variable" or "() isn't a valid CSS value", `npx sass src/app/globals.scss` compiled the same files cleanly, and only stopping the server and deleting `.next/dev/cache` helped.

With the cache off, a restart is enough; the first page after a restart compiles cold. `next build` keeps its own cache in `.next/cache` under `turbopackFileSystemCacheForBuild`, unchanged. The running server can still miss a partial change, for a reason not found: if a page shows one of those errors while `npx sass` passes, restart `next dev`.

## Test debugging

**Vitest.** `npm run test:debug` runs `vitest run --inspectBrk=0.0.0.0:9230 --no-file-parallelism --maxWorkers=1`. `--inspectBrk` halts before the process's own code runs, so it never spawns workers that race for the port (unlike plain `--inspect`, which is why `dev:debug` needs Next's native flag). `--maxWorkers=1` is still needed: a multi-worker run opens one inspector port per worker and nothing can say which to attach to, so debugging gives up the parallelism `test:coverage` uses. The config-file `poolOptions.<pool>.singleThread` form is not accepted as a CLI flag by this Vitest. Attach with "Attach: Vitest" or `chrome://inspect`.

**Playwright** has three debugging paths:

- **Trace viewer** (`npm run e2e:trace -- <path-to-trace.zip>`; `make e2e-trace TRACE=<path>`) replays a recorded trace (DOM snapshots, network, console, actions) from a `.zip` a run already wrote, so it works the same for a local or a CI run. Off CI, `playwright.config.ts` captures trace, screenshot and video on failure (`retain-on-failure` / `only-on-failure` / `retain-on-failure`); on CI it is `on-first-retry` / `off` / `off`. Port 9323.
- **UI mode** (`npm run e2e:ui`) is an interactive runner: pick a spec, watch it, time-travel through actions. Port 9324, via `playwright test --ui --ui-host 0.0.0.0 --ui-port 9324`; `--ui-host` is required because UI mode binds `localhost` by default.
- **`--debug`** (`npm run e2e:debug`) is Playwright's step-through Inspector.

A **specific spec** under `--inspect-brk` has no npm script. Run it by hand, then attach with "Attach: Playwright runner":

```
NODE_OPTIONS='--inspect-brk=0.0.0.0:9231' npx playwright test <file>
```

### The remote browser

The devcontainer is Alpine/musl (`Docker/Dockerfile.node`) and Chromium has no official musl build, so Playwright cannot launch a local browser here. The runner is plain Node, so only the browser moves. The `playwright-server` compose service (profile `e2e`, the same `Docker/Dockerfile.e2e` image as the `e2e` service and CI's `playwright` job, so no version drift) runs `playwright run-server --host 0.0.0.0 --port 4444`, a long-lived Chromium the runner dials over Playwright's remote-browser protocol. `make playwright-server-up` and `make playwright-server-down` (host) control it.

- **`PLAYWRIGHT_WS_ENDPOINT` stays scoped to the `devcontainer` compose service**: `.devcontainer/docker-compose.yml` sets `ws://playwright-server:4444/` there and nowhere else. Never bake it into an npm script or set it unconditionally in `playwright.config.ts`: `make docker-e2e` and CI's `playwright` job launch Chromium locally in the one-shot `e2e` container, and a broader setting would make both depend on `playwright-server`, which is never up there.
- **`PLAYWRIGHT_AUDIT_WS_ENDPOINT` follows the same rule**: set in the same place as `ws://playwright-audit:4444/` for the WebKit, Firefox and phone audit (`make playwright-audit-up`, Microsoft's image on the `audit` profile), and read only when `E2E_AUDIT=1` asks for it (`npm run e2e:audit`) ([`e2e.md`](e2e.md), "The audit").
- **The remote branch moves `baseURL` and not the readiness check.** With `PLAYWRIGHT_WS_ENDPOINT` set, every `baseURL` becomes `http://devcontainer:<port>` (`browserUrl` in `tests/e2e/slots.ts`), since a remote browser cannot resolve the runner's `localhost` and `next start --hostname 0.0.0.0` binds every interface. Each `webServer.url` readiness poll stays on `http://localhost:<port>`, because the poll runs in the runner's own process. Making both match breaks one of them.
- **`ws://playwright-server:4444/` is a WebSocket address**, passed as `connectOptions.wsEndpoint`, not a page to open. Open the forwarded 9323 and 9324, which are the runner's UIs and work the same over a remote browser.

**Headed Playwright** draws on a virtual display (Xvfb and a window manager) in `playwright-server`, reachable at `http://localhost:7900` over noVNC. `page.pause()`'s Inspector and UI mode's live locator picker render there, and `make docker-codegen` opens it. Trace viewer and UI mode's replay need no window. There is one display per container, so one headed session at a time, and it is a containerised Chromium without your profile or extensions. UI mode has no recorder as of Playwright 1.63; a release that adds one would retire this display.

**The display is declared on the compose service as well as in the entrypoint.** `playwright-entrypoint.sh` raises Xvfb and exports `DISPLAY=:99`, but that export lives in the entrypoint's process, and `docker compose exec` (what `make docker-codegen` uses) would fail with `Missing X server or $DISPLAY`. `environment: DISPLAY: ':99'` on the service reaches every process. Keep both.

### Recording a spec

`make docker-codegen NAME=<spec>` (host) starts `playwright-server` if it is down, then runs `playwright codegen` in it as your own uid, so `tests/e2e/<spec>.spec.ts` is yours rather than root's. Open `http://localhost:7900`: a headed Chromium on `http://sorrel-app:8000` and the Inspector beside it with record armed. `make docker-up` must be running. Close the Chromium window to end the session; if the two windows are frozen and overlapping, the window manager did not start.

- **Use `sorrel-app`, not `app`.** `.app` is an HSTS-preloaded gTLD, so Chrome upgrades the bare `app` compose service to `https://` and fails with `ERR_SSL_PROTOCOL_ERROR` against the plain-HTTP dev server, and no flag turns the preload list off. `sorrel-app` is a second DNS alias for the same container in `docker-compose.yaml`.
- **If the page renders but nothing responds to a click**, the app did not hydrate: check `allowedDevOrigins` in `next.config.ts`. `next dev` rejects cross-origin `/_next/*` requests from any host but `localhost` unless listed, and the rejected request is the HMR websocket. Static chunks still return 200 and the console stays clean; the only tell is a websocket error. `sorrel-app` is listed, and any new hostname a real browser uses needs adding.
- **One hydration error while recording is expected.** The dev overlay reports a mismatch on `<body data-pw-cursor="pointer">`, an attribute the recorder sets before React loads. Hydration completes and the page works. Do not silence it with `suppressHydrationWarning` on `<body>`, which would mask real body-level mismatches everywhere; `layout.tsx` scopes its one suppression to `<html>`.

A recorded spec is a draft:

1. Import `test` and `expect` from `./fixtures`, never `@playwright/test`: the coverage auto-fixture only runs through `tests/e2e/fixtures.ts`.
2. Rewrite the absolute `http://sorrel-app:8000/...` URLs to `baseURL`-relative paths.
3. If it touches the database, add `test.describe.configure({ mode: 'serial' })` and a `beforeAll` calling `recreateE2eDatabase()` from `./database` (`claude-docs/testing/e2e.md`, "E2E — Playwright").
4. Consider `assertNoAccessibilityViolations` from `./axe` for any new page.
5. Strip codegen's redundant assertions and brittle `nth()` locators.

An authenticated flow cannot be recorded yet, since sign-in is OAuth-only and `--save-storage` waits on seeded sessions: record unauthenticated pages.

## Database debugging

- **`DEBUG_SQL=1`** on any process reading `src/db/connection.ts` (`DEBUG_SQL=1 npm run dev`, `DEBUG_SQL=1 npm run test:coverage`) prints every SQL statement the repository emits, `withAudit`'s `set_config('app.current_user_id', …)` included. It is off by default. It tells a row missing to the workspace predicate a `Membership` proof adds apart from a row missing to soft-delete filtering: both read as "not there".
- **`make db-psql`** (host) runs `psql -U sorrel sorrel` against the compose Postgres.
- **Drizzle Studio** (`npm run db:studio`, `make db-studio`, `make docker-studio`, port 4983) is a visual browser for the local database; its UI is hosted at `https://local.drizzle.studio` and connects back to the forwarded port.

## Next.js DevTools MCP

`.mcp.json` carries a `next-devtools` server (`npx -y next-devtools-mcp@latest`) that gives an MCP client tools to inspect a running Next.js dev server (routes, build errors, runtime state).
