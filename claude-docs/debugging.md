# Debugging — summary

This summary is self-contained (MB.22) — nothing here requires opening
`package.json`, `makefile`, `Docker/docker-compose.yaml`, `.devcontainer/`,
or `playwright.config.ts` to follow.

Before this task there was no debugging story at all: no Node inspector
wired anywhere in the container, no `.vscode/` directory, no way to step
into a service, a repository call, or a test, and no way to watch what
`withAudit`'s `SET LOCAL app.current_user_id` and RLS actually do to a query
beyond reading its output. This is tooling only — no table, no service, no
page.

## Getting set up

Copy the two committed examples to their real (gitignored, per-developer)
names:

```
cp .vscode/launch.example.json .vscode/launch.json
cp .vscode/tasks.example.json .vscode/tasks.json
```

`launch.json`/
`tasks.json` themselves stay out of git (`.gitignore`'s `.vscode/*` deny,
with the two `.example.json` files carved out as the exceptions) — they're
where a developer's own breakpoints, watch expressions, and task tweaks
live, and nobody else's belong in a PR.

`launch.json` holds three **attach**-only configs — nothing here uses
`request: "launch"`, because every debuggable process already starts from a
terminal inside the devcontainer (by hand or via a `tasks.json` background
task) rather than being spawned by VS Code itself:

- **Attach: Next.js server** — port 9229, `restart: true` (Next's dev
  server/Fast Refresh can recycle the inspected process; without `restart`
  an edit-triggered restart drops the session instead of reattaching),
  `skipFiles: ["<node_internals>/**"]`.
- **Attach: Vitest** — port 9230, same `skipFiles`.
- **Attach: Playwright runner** — port 9231. Nothing listens here by
  default; see below.

All three set `localRoot`/`remoteRoot` to the same path (`/app`) —
deliberately, not a placeholder: the devcontainer mounts the repo at `/app`
and VS Code's own debug adapter runs inside that same container (via Dev
Containers), so there is exactly one filesystem view, not a host/container
pair to translate between.

`tasks.json` holds three **background** tasks — `dev:debug`, `test:debug`,
`e2e:ui` — each a thin wrapper over the matching npm script, `isBackground:
true`, with a `problemMatcher.background.beginsPattern`/`endsPattern` pair
so VS Code's Run Task UI can tell "starting" from "ready" (that pair is
mandatory input for `isBackground`; VS Code has no way to supply it without
also supplying a `pattern`, so each task's `pattern.regexp` is a deliberate
non-match — none of these three commands produce compiler-style
file:line:message diagnostics worth routing into the Problems panel; oxlint
and tsc already own that). No task is wired to a `launch.json` config via
`preLaunchTask` — starting a task and attaching to it are kept as two
separate steps, since `e2e:ui` in particular is useful with no debugger
attached at all.

## Port map

| Port  | What                                        | Where it's forwarded/published                                                                                            |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 8000  | `next dev`                                  | devcontainer.json, `app` service (Docker/docker-compose.yaml)                                                             |
| 8001  | `next start` (production build, e2e target) | devcontainer.json                                                                                                         |
| 4983  | Drizzle Studio (MB.21)                      | devcontainer.json, `studio` service                                                                                       |
| 9229  | Node inspector — `next dev --inspect`       | devcontainer.json, `app` service                                                                                          |
| 9230  | Node inspector — `vitest --inspect-brk`     | devcontainer.json only (no long-running compose service serves this)                                                      |
| 9231  | Node inspector — Playwright runner (manual) | devcontainer.json only — reserved, nothing listens by default                                                             |
| 9323  | Playwright trace viewer                     | devcontainer.json only                                                                                                    |
| 9324  | Playwright UI mode                          | devcontainer.json only                                                                                                    |
| 51204 | Vitest UI (`@vitest/ui` default port)       | devcontainer.json only                                                                                                    |
| 61000 | Ladle workshop                              | pre-existing (M0.30), `workshop` service                                                                                  |
| 4444  | `playwright run-server` (remote browser)    | `playwright-server` service (Docker/docker-compose.yaml, profile `e2e`) — dialed by the runner, never opened in a browser |

Every port above 8001 that isn't 4444 or 61000 is new to this task. All the
`devcontainer.json`-only rows are forwarded because the process that opens
them runs inside the devcontainer and is started from an editor terminal or
a `tasks.json` task, not by a long-running compose service — there is
nothing in `Docker/docker-compose.yaml` to publish a port from.

From the **host**, the `make` equivalents are `make dev-debug`,
`make test-debug`, `make test-ui`, `make e2e-ui`, `make e2e-trace`, exactly
mirroring CLAUDE.md's Commands table (neither `make` nor `docker` exists
inside the devcontainer itself — run the npm scripts directly there).

## Server-side debugging

`npm run dev:debug` (`make dev-debug` from the host) runs
`next dev --inspect=0.0.0.0:9229` — `next dev`'s own native `--inspect` flag,
not `NODE_OPTIONS`: Next's dev server spawns its own child processes, which
inherit `NODE_OPTIONS` and would each try to open their own inspector on the
next available port, colliding with whatever else that port is reserved for
(9230, here, is Vitest's). No `--brk`, so the server
is already serving when a debugger attaches. Attach with VS Code's "Attach:
Next.js server" config, or point host Chrome/Edge at `chrome://inspect` —
9229 is published all the way to the host through `Docker/docker-compose.yaml`
(`app` service) and devcontainer.json, so either works without extra setup.
This is also the only debug path with a genuine client/server split: there
is no browser inside the container, so any **client-side** breakpoint (React
component code running in the browser, not the server) is host Chrome
DevTools against the forwarded port 8000 directly — there is no VS Code
client-side (Chrome/Edge) launch config, and none is planned, for the same
reason.

## Test debugging

**Vitest**: `npm run test:debug` runs
`vitest run --inspectBrk=0.0.0.0:9230 --no-file-parallelism --maxWorkers=1`
— Vitest's own native `--inspectBrk` flag, for CLI-flag consistency with
`next dev --inspect` above (and because the config-file
`poolOptions.<pool>.singleThread`/`singleFork` dotted form isn't accepted as
a CLI flag by this Vitest version — confirmed by hand, not assumed; that's
what `--maxWorkers=1` replaces). `--inspect-brk`/`--inspectBrk` halts
_before_ the process's own code runs, so — unlike plain `--inspect`, which is
why `dev:debug` above needs Next's native flag instead of `NODE_OPTIONS` —
it never reaches the point of spawning workers that would inherit
`NODE_OPTIONS` and race for the same port; `--maxWorkers=1` is still needed,
just for a different reason: multi-worker Vitest opens one inspector port per
worker, and nothing here
can address them individually or know which one to attach to, so debugging
trades away the parallelism `test:coverage` otherwise uses. `--inspectBrk` halts
execution at the first line until something attaches (VS Code's "Attach:
Vitest" config, or `chrome://inspect`), so there's no race between the
process starting and the debugger connecting.

**Playwright** has three separate debugging paths, because "debug a test"
means different things depending on whether the browser needs to be watched
live or just examined after the fact:

- **Trace viewer** (`npm run e2e:trace -- <path-to-trace.zip>`,
  `make e2e-trace TRACE=<path>` from the host) — replays a recorded trace:
  DOM snapshots, network, console, actions, all after the fact. This is the
  one that works identically whether the run happened locally or on CI,
  since it only ever reads a `.zip` a run already wrote. Locally (off CI),
  `playwright.config.ts` captures a trace, screenshot, and video on failure
  by default (`retain-on-failure` / `only-on-failure` / `retain-on-failure`)
  — no flag needed to get something to open; on CI it's `on-first-retry` /
  `off` / `off`, matching the existing CI-vs-local split for retries. Served
  on port 9323, viewed from the host browser.
- **UI mode** (`npm run e2e:ui`, `make e2e-ui`) — an interactive runner:
  pick a spec, watch it execute, inspect each step, time-travel through
  actions. Served on port 9324, viewed from the host browser, via
  `playwright test --ui --ui-host 0.0.0.0 --ui-port 9324` (the `--ui-host`
  is required — UI mode's server binds `localhost` by default, same
  reasoning as `ladle serve`'s `--host 0.0.0.0`).
- **`--debug`** (`npm run e2e:debug`) — Playwright's own step-through
  Inspector, opened via `PWDEBUG=1`-style `page.pause()` semantics.

**Why a remote browser exists at all, and what it costs**: this devcontainer
is Alpine/musl (`Docker/Dockerfile.node`), and Chromium has no official musl
build, so Playwright cannot launch a local browser here — full stop. The
`playwright-server` compose service (profile `e2e`, same `Docker/Dockerfile.e2e`
image the `e2e` service and CI's `playwright` job already use, so no version
drift) runs `playwright run-server --host 0.0.0.0 --port 4444`, a long-lived
Chromium a runner can dial into over Playwright's own remote-browser
protocol. Bring it up/down independently with
`make playwright-server-up` / `make playwright-server-down` from the host.
`.devcontainer/docker-compose.yml` sets `PLAYWRIGHT_WS_ENDPOINT: ws://playwright-server:4444/`
on the `devcontainer` service only — `make docker-e2e` and CI never set it,
so both keep launching Chromium locally inside the one-shot `e2e` container,
unaffected.

**`ws://playwright-server:4444/` is a WebSocket address, not a URL you open
in a browser.** It's what `playwright.config.ts` passes as
`connectOptions.wsEndpoint` when `PLAYWRIGHT_WS_ENDPOINT` is set — the
protocol Playwright's own runner uses to drive a browser process running
somewhere else. Trying to load it as a page does nothing useful. What you
_do_ open in a host browser are the forwarded ports: 9323 for the trace
viewer, 9324 for UI mode. Both work the same over a remote browser as over a
local one, because both are the _runner's_ own UI, not the browser's.

**Known limitation, not a bug**: headed/interactive features that expect to
draw directly on the browser window — `page.pause()`'s Inspector overlay,
UI mode's live locator picker — don't work well against a remote browser,
because there's no local window for them to draw into. Trace viewer and
UI mode's step-by-step replay (both reading recorded/streamed state rather
than needing a live window) are unaffected.

Debugging a **specific spec** under `--inspect-brk` (port 9231) has no
dedicated npm script — run it by hand:

```
NODE_OPTIONS='--inspect-brk=0.0.0.0:9231' npx playwright test <file>
```

then attach with VS Code's "Attach: Playwright runner" config. This is a
deliberate simplification rather than a gap: a scripted version would need
a hardcoded spec path or argument-plumbing that serves exactly one
debugging session's worth of value. Port 9231 is still reserved and
forwarded for when you need it.

## Database debugging

- **`DEBUG_SQL=1`** — set on any process reading `src/db/connection.ts`
  (`DEBUG_SQL=1 npm run dev`, `DEBUG_SQL=1 npm run test:coverage`, etc.) to
  print every SQL statement the repository emits, `withAudit`'s
  `SET LOCAL app.current_user_id` included. Off by default, so ordinary test
  output and CI are unaffected. This is the fastest way to tell a row
  missing to RLS apart from a row missing to soft-delete filtering — both
  produce "not there," and only the statement log shows which filter
  actually excluded it.
- **`make db-psql`** (host) — `docker compose exec postgres psql -U sorrel
sorrel` against the running compose Postgres: a raw SQL prompt for poking
  at RLS policies, indexes, or data directly, alongside whatever the app or
  a test is doing.
- **Drizzle Studio** (`npm run db:studio` / `make db-studio` /
  `make docker-studio`, port 4983) — a visual browser for the local
  database, predates this task (MB.21). Its own UI is hosted externally at
  `https://local.drizzle.studio` and connects back to the forwarded/published
  port; not re-explained here beyond that it's part of the same "how do I
  see what the database actually holds" story as `DEBUG_SQL` and `db-psql`.

## Next.js DevTools MCP

`.mcp.json` gained a `next-devtools` server (`npx -y next-devtools-mcp@latest`),
alongside the pre-existing `asana` one. It gives an agent (Claude Code
itself, or any other MCP client) tools to inspect a running Next.js dev
server directly — routes, build errors, runtime state — rather than
inferring them from terminal output.

## What doesn't work in the container, and why

- **Headed/interactive Playwright against the remote browser** (see above)
  — `page.pause()`'s Inspector, UI mode's live locator picker. There's no
  local browser window inside the container for either to draw into; trace
  viewer and UI mode's own replay UI (the runner's UI, not the browser's)
  are the supported paths instead.
- **No client-side (Chrome/Edge) VS Code launch config.** There's no browser
  running inside the container to attach a client-side debugger to. Debug
  client-side (React/browser) code with host Chrome DevTools against the
  forwarded port 8000 directly; `chrome://inspect` also reaches the
  server-side inspector on 9229, since `--inspect` is published the same
  way.
