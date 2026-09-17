# Debugging — transcript

## 2026-09-17 — MB.22: Modern debugging tooling

Minted on request, for the same reason as MB.21 but broader: there was no
debugging story in this repo at all. No Node inspector wired anywhere in the
container, no `.vscode/` directory, no way to step into a service, a
repository call, or a test, and no way to watch what `withAudit`'s
`SET LOCAL app.current_user_id` and RLS actually do to a query beyond
reading its output. Scoped and sized as a single task — an explicit
exception to the normal 1–2h sizing — because the work is uniformly
tooling-only (no table, no service, no page touched), lands as one coherent
developer-experience change, and the user asked for it as one PR.

**Node inspector, wired three places.** `package.json` gained `dev:debug`
(`next dev --inspect=0.0.0.0:9229`, no `--brk` — the server is serving by
the time anything attaches) and `test:debug`
(`vitest run --inspectBrk=0.0.0.0:9230 --no-file-parallelism
--maxWorkers=1`). Both use the framework's own native inspector flag rather
than `NODE_OPTIONS`, and not interchangeably for the same reason: an earlier
draft used `NODE_OPTIONS='--inspect=0.0.0.0:9229'` for `dev:debug` and, on
manual verification, it leaked into Next's own internal child processes —
each inherited `NODE_OPTIONS`, tried to open its own inspector, and one
landed on 9230, colliding with the port reserved for Vitest. `--inspect-brk`
doesn't have this problem (it halts before the process's own code runs, so
nothing has spawned children yet to inherit the variable), which is why the
manual "debug one Playwright spec" workflow documented below still uses
`NODE_OPTIONS='--inspect-brk=0.0.0.0:9231'` safely — verified by hand, not
assumed. `test:debug`'s switch to Vitest's native `--inspectBrk` is for CLI
consistency with `dev:debug`, plus a second, unrelated bug caught the same
way: the config-file `poolOptions.<pool>.singleThread`/`singleFork` dotted
form the original draft used isn't accepted as a CLI flag by this Vitest
version at all (`CACError: Unknown option`) — `--maxWorkers=1` is what
actually pins the run to one worker. The Vitest one forces a single worker
deliberately: multi-worker Vitest opens one inspector port per worker, and
there was no way to address them individually or know which one to attach
to, so debugging trades away `test:coverage`'s parallelism. `--inspectBrk`
halts before the first line runs, removing any race between process start
and debugger attach. 9229 is published on the `app` compose service too
(`Docker/docker-compose.yaml`) so a container-launched `dev:debug` is
reachable from the host as well as from inside the devcontainer.

**Vitest UI and Playwright's own tooling** got the same treatment:
`test:ui` (`vitest --ui`, default port 51204), `e2e:ui`
(`playwright test --ui --ui-host 0.0.0.0 --ui-port 9324` — `--ui-host` is
required, UI mode's server binds `localhost` otherwise, same reasoning as
`ladle serve`'s own `--host 0.0.0.0`), `e2e:debug` (`playwright test
--debug`, Playwright's step-through Inspector), and `e2e:trace`
(`playwright show-trace --host 0.0.0.0 --port 9323`). `playwright.config.ts`
now defaults local trace/screenshot/video capture to on-failure
(`retain-on-failure` / `only-on-failure` / `retain-on-failure`) rather than
requiring a flag to get something to look at after a local failure; CI's
existing `on-first-retry` / `off` / `off` is unchanged, matching CI's
existing retry behavior.

**The Playwright-in-Alpine problem.** This devcontainer is Alpine/musl
(`Docker/Dockerfile.node`), and Chromium has no musl build at all, so
Playwright cannot launch a local browser here — not a missing package, an
unsupported platform. Rather than rebasing the devcontainer off Debian, a
new `playwright-server` compose service (profile `e2e`, `Docker/Dockerfile.e2e`
— the same image the one-shot `e2e` service and CI's `playwright` job
already build, so no version drift) runs `playwright run-server --host
0.0.0.0 --port 4444`, a long-lived Chromium a runner dials into over
Playwright's own remote-browser protocol. Brought up/down independently via
`make playwright-server-up` / `-down`, the same pattern `studio` (MB.21)
already established for an opt-in, independently-lifecycled service.
`.devcontainer/docker-compose.yml`'s `devcontainer` service sets
`PLAYWRIGHT_WS_ENDPOINT: ws://playwright-server:4444/` — on that service
only, never in an npm script or the standalone `e2e` service — so
`make docker-e2e` and CI are provably unaffected and keep launching Chromium
locally. `playwright.config.ts` reads that variable: when set, it takes the
`connectOptions.wsEndpoint` branch and switches `baseURL` to
`http://devcontainer:8001` (a remote browser can't resolve the runner's own
`localhost`; `next start --hostname 0.0.0.0` already binds every interface,
so the compose service name works instead) — but the `webServer` readiness
check keeps polling `http://localhost:8001` unconditionally, because that
check runs in the runner's own process regardless of where the browser
lives.

Flagged clearly in both `debugging.md` and inline comments:
`ws://playwright-server:4444/` is a WebSocket address for Playwright's
remote-browser protocol, not a URL — opening it in a browser does nothing.
What you look at in a host browser are the forwarded ports, 9323 (trace
viewer) and 9324 (UI mode), both of which are the _runner's_ UI regardless
of where the browser process actually runs. Headed/interactive features that
draw directly into a browser window — `page.pause()`'s Inspector overlay, UI
mode's live locator picker — don't work well against a remote browser, for
the unsurprising reason that there's no local window for them to draw into;
documented as a known limitation, not chased as a bug.

**`.vscode/launch.example.json` and `.vscode/tasks.example.json`**, both new
and both committed (`.gitignore` carves them out of the existing
`.vscode/*` deny; the real `launch.json`/`tasks.json` stay per-developer and
ignored). `launch.json` is attach-only throughout — every debuggable process
here already starts from a terminal, by hand or via a background task, never
from VS Code itself — with configs for the Next.js server (9229, `restart:
true` so a Fast-Refresh-triggered process recycle reattaches instead of
dropping the session), Vitest (9230), and a Playwright runner (9231). Nothing
listens on 9231 by default — there's no dedicated npm script for debugging
one specific spec, since a scripted version would need a hardcoded spec path
or extra argument plumbing for what's a one-off debugging session. The
documented workaround is running
`NODE_OPTIONS='--inspect-brk=0.0.0.0:9231' npx playwright test <file>` by
hand, then attaching. `localRoot`/`remoteRoot` are both `/app` on every
config — deliberately identical, not a placeholder pair — because the
devcontainer mounts the repo at `/app` and VS Code's debug adapter runs
inside that same container, so there's one filesystem view, not a
host/container split to translate across.

`tasks.json` wraps `dev:debug`, `test:debug`, and `e2e:ui` as background
tasks. `isBackground: true` requires a `problemMatcher` carrying a
`background.beginsPattern`/`endsPattern` pair before VS Code will track
"starting" vs. "ready" at all, and there's no way to supply that pair
without also supplying a `pattern` — none of these three commands emit
compiler-style diagnostics worth routing into the Problems panel (oxlint and
tsc already own that), so each task's `pattern.regexp` is a deliberate
non-match kept only to satisfy the schema.

**Ports.** devcontainer.json's `forwardPorts` grew from 8000/8001/4983 (dev,
production build, Drizzle Studio) to include 9229 (Next inspector), 9230
(Vitest inspector), 9231 (reserved Playwright inspector), 9323 (trace
viewer), 9324 (UI mode), and 51204 (Vitest UI) — each labeled in
`portsAttributes`. `Docker/docker-compose.yaml`'s `app` service now also
publishes 9229, and the new `playwright-server` service publishes 4444.

**`DEBUG_SQL`.** `src/db/connection.ts` now passes
`{ logger: process.env.DEBUG_SQL === '1' }` to `drizzle()` — off by default,
so ordinary test output and CI are unaffected. Set it to print every
statement the repository emits, `withAudit`'s
`SET LOCAL app.current_user_id` included, which is the fastest way to tell a
row missing to RLS apart from one missing to soft-delete filtering: both
read as "not there" from the caller, and only the statement log shows which
filter actually did it.

**`make db-psql`** wraps `docker compose exec postgres psql -U sorrel
sorrel` for a raw prompt against the running compose Postgres, alongside
Drizzle Studio (MB.21, unchanged by this task beyond being folded into the
same debugging story in `debugging.md`).

**Next.js DevTools MCP.** `.mcp.json` gained a `next-devtools` server
(`npx -y next-devtools-mcp@latest`) next to the existing `asana` one, giving
an MCP client tools to inspect a running dev server — routes, build errors,
runtime state — directly rather than inferring them from terminal output.

Wrote `claude-docs/debugging.md` as the new subsystem summary and opened
this transcript alongside it, per the sweep/compression conventions in
CLAUDE.md — MB.22 closes Wave 2, so `MW.2`'s compression pass picks both up
rather than leaving them behind.
