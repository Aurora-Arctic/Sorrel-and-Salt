# Debugging — summary

This summary is self-contained (MB.22, extended by MB.23) — nothing here
requires opening `package.json`, `makefile`, `Docker/docker-compose.yaml`,
`.devcontainer/`, `Docker/Dockerfile.e2e`, or `playwright.config.ts` to
follow.

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

| Port  | What                                                 | Where it's forwarded/published                                                                                            |
| ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 8000  | `next dev`                                           | devcontainer.json, `app` service (Docker/docker-compose.yaml)                                                             |
| 8001  | `next start` (production build, e2e target)          | devcontainer.json                                                                                                         |
| 4983  | Drizzle Studio (MB.21)                               | devcontainer.json, `studio` service                                                                                       |
| 9229  | Node inspector — `next dev --inspect`                | devcontainer.json, `app` service                                                                                          |
| 9230  | Node inspector — `vitest --inspect-brk`              | devcontainer.json only (no long-running compose service serves this)                                                      |
| 9231  | Node inspector — Playwright runner (manual)          | devcontainer.json only — reserved, nothing listens by default                                                             |
| 9323  | Playwright trace viewer                              | devcontainer.json only                                                                                                    |
| 9324  | Playwright UI mode                                   | devcontainer.json only                                                                                                    |
| 51204 | Vitest UI (`@vitest/ui` default port)                | devcontainer.json only                                                                                                    |
| 61000 | Ladle workshop                                       | pre-existing (M0.30), `workshop` service                                                                                  |
| 4444  | `playwright run-server` (remote browser)             | `playwright-server` service (Docker/docker-compose.yaml, profile `e2e`) — dialed by the runner, never opened in a browser |
| 7900  | Playwright display — codegen, `page.pause()` (MB.23) | devcontainer.json, `playwright-server` service — a page you open, unlike 4444                                             |

Everything in that table except 8000, 8001, 4983, 4444 and 61000 is new to
MB.22; 7900 is MB.23's. All the
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
runner itself is plain Node with no native browser dependency, so only the
_browser_ moves: rebasing the devcontainer (and `workshop`, and `studio`)
off Debian was considered and rejected, since it reverses M0.11's Alpine
slimming for the sake of the one process that actually needs glibc. The
`playwright-server` compose service (profile `e2e`, same `Docker/Dockerfile.e2e`
image the `e2e` service and CI's `playwright` job already use, so no version
drift) runs `playwright run-server --host 0.0.0.0 --port 4444`, a long-lived
Chromium a runner can dial into over Playwright's own remote-browser
protocol. Bring it up/down independently with
`make playwright-server-up` / `make playwright-server-down` from the host.

**`PLAYWRIGHT_WS_ENDPOINT` must stay scoped to the `devcontainer` compose
service** (`.devcontainer/docker-compose.yml` sets
`ws://playwright-server:4444/` there and nowhere else). It must never be
baked into an npm script or set unconditionally in `playwright.config.ts`:
`make docker-e2e` and CI's `playwright` job both launch Chromium locally
inside the one-shot `e2e` container, and setting the variable anywhere
broader would silently make both depend on `playwright-server` being up,
which it never is in either context.

**The remote branch also moves `baseURL`, and deliberately not the readiness
check.** When `PLAYWRIGHT_WS_ENDPOINT` is set, `playwright.config.ts`
switches `baseURL` to `http://devcontainer:8001` — a remote browser cannot
resolve the runner's own `localhost`, and `next start --hostname 0.0.0.0`
already binds every interface, so the compose service name works. The
`webServer.url` readiness poll stays on `http://localhost:8001`
unconditionally, because that poll runs in the runner's own process no
matter where the browser lives. The asymmetry is correct; making both sides
match breaks one of them.

**`ws://playwright-server:4444/` is a WebSocket address, not a URL you open
in a browser.** It's what `playwright.config.ts` passes as
`connectOptions.wsEndpoint` when `PLAYWRIGHT_WS_ENDPOINT` is set — the
protocol Playwright's own runner uses to drive a browser process running
somewhere else. Trying to load it as a page does nothing useful. What you
_do_ open in a host browser are the forwarded ports: 9323 for the trace
viewer, 9324 for UI mode. Both work the same over a remote browser as over a
local one, because both are the _runner's_ own UI, not the browser's.

**Headed/interactive Playwright now has somewhere to draw (MB.23).**
`playwright-server` carries a virtual display (Xvfb + a window manager),
reachable from an ordinary host browser tab at **`http://localhost:7900`**
over noVNC — `page.pause()`'s Inspector overlay and UI mode's live locator
picker both render there. This is also what `make docker-codegen` (below)
opens. Trace viewer and UI mode's step-by-step replay don't need a live
window at all and are unaffected either way.

There is exactly **one display per `playwright-server` container**, so one
headed session at a time, and what you get is a containerised Chromium
streamed over noVNC into a host tab — slightly laggy, and not your own
profile or extensions. A native host recorder was rejected for needing a
host Node install and a separate Chromium download, recording against
whatever version that resolves to rather than the one `PLAYWRIGHT_VERSION`
pins. **Worth revisiting if Playwright ever adds recording to UI mode**: UI
mode needs no display because its "Pick locator" works against the trace
viewer's DOM snapshot, and as of 1.63 it has no recorder at all — a release
that added one would genuinely retire this display.

**The display is declared on the compose service, not just in the
entrypoint.** `playwright-entrypoint.sh` raises Xvfb and exports
`DISPLAY=:99`, but that export lives only in the entrypoint's own process;
`docker compose exec` (what `make docker-codegen` uses) starts a fresh
process from the container's initial environment and would fail with
`Missing X server or $DISPLAY`. `environment: DISPLAY: ':99'` on the
`playwright-server` service is what makes it reach every process. Keep both.

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

### Recording a spec (MB.23)

`make docker-codegen NAME=<spec>` (host) starts `playwright-server` if it
isn't already up, then `exec`s `playwright codegen` into it as your own
uid — so the file it writes, `e2e/<spec>.spec.ts`, is owned by you rather
than root. Open **`http://localhost:7900`** in a host browser: a headed,
interactive Chromium on the app's home page (`http://sorrel-app:8000` —
**not** `http://app:8000`: `.app` is a real, HSTS-preloaded gTLD in every
major browser, so a genuine Chrome navigating to the bare `app` compose
service gets silently upgraded to `https://` and fails with
`ERR_SSL_PROTOCOL_ERROR` against a plain-HTTP dev server — no launch flag
turns this off, since the preload list is compiled into the browser binary.
`sorrel-app` is a second DNS alias for the exact same `app` container,
added to `docker-compose.yaml` for this reason — `make docker-up` needs to
be running either way), and the Playwright Inspector beside it with its
record button already armed. Both windows are draggable by their title
bars; if they're frozen and overlapping, the window manager didn't start.
Click around, then close the Chromium window to end the session.

**If the page renders but nothing responds to a click**, the app didn't
hydrate — check `allowedDevOrigins` in `next.config.ts`. `next dev` rejects
cross-origin requests to `/_next/*` from any host but `localhost` unless
it's listed there, and the rejected request is the HMR websocket the
Turbopack client runtime boots through. Static chunks still return 200 and
the console stays clean, so the only tell is a websocket error and a page
where every handler is silently missing. `sorrel-app` is listed for exactly
this reason; any _new_ hostname a real browser uses to reach `next dev`
needs adding too.

**One hydration error while recording is expected and is not an app bug.**
The dev overlay reports a mismatch on `<body data-pw-cursor="pointer">` —
that attribute is the recorder's own, set by Playwright to drive the
crosshair/pointer styling it paints over the page
(`body[data-pw-cursor=pointer] * { cursor: pointer }`). It mutates the DOM
before React loads, which is the "a browser extension messed with the HTML"
case Next's own error text names. Only that attribute goes unpatched;
hydration completes and the page is fully interactive. It is deliberately
**not** silenced with `suppressHydrationWarning` on `<body>`: that would
mask genuine body-level mismatches everywhere, permanently, to quiet a tool
artifact that only appears while the recorder is attached. `layout.tsx`
scopes its one suppression to `<html>` for the same reason.

A recorded spec is a draft, not something to open a PR with as-is:

1. Import `test`/`expect` from `./fixtures`, never `@playwright/test` — the
   coverage auto-fixture only runs through `./fixtures` (`e2e/fixtures.ts`).
2. Rewrite the absolute `http://sorrel-app:8000/...` URL codegen wrote to a
   `baseURL`-relative path — `sorrel-app` only exists to dodge the HSTS
   preload issue above and has no meaning outside a manually-recorded spec;
   every other e2e URL in this repo is already `baseURL`-relative or uses
   `devcontainer`/`localhost`, never `sorrel-app`.
3. If it touches the database, add `test.describe.configure({ mode: 'serial'
})` and a `beforeAll` calling `recreateE2eDatabase()` from `./database` —
   see the comment atop `e2e/smoke.spec.ts` for why parallel workers racing
   `DROP/CREATE DATABASE` isn't theoretical.
4. Consider `assertNoAccessibilityViolations` from `./axe` for any new page.
5. Strip codegen's redundant assertions and any brittle `nth()`-match
   locator it fell back to.

Sign-in is OAuth-only, so an authenticated flow can't be recorded
end-to-end yet — record unauthenticated pages for now; `--save-storage`
wiring waits on seeded sessions (M1.21–M1.23).

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

- **No client-side (Chrome/Edge) VS Code launch config.** There's no browser
  running inside the container to attach a client-side debugger to. Debug
  client-side (React/browser) code with host Chrome DevTools against the
  forwarded port 8000 directly; `chrome://inspect` also reaches the
  server-side inspector on 9229, since `--inspect` is published the same
  way.
