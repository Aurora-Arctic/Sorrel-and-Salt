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

---

**2026-09-17, MB.23 — Playwright codegen for local development.**

`playwright codegen` always launches its own local browser — no
`--ws-endpoint` flag exists — so MB.22's `playwright-server` (a headless
remote Chromium reached over `PLAYWRIGHT_WS_ENDPOINT`) couldn't serve it.
MB.22's own design record had already named the cause:
`playwright-server` has no display, so `page.pause()`'s Inspector window
had nowhere to open either.

Gave `playwright-server` a display instead of standing up a second service.
`Docker/Dockerfile.e2e`'s single, previously-unnamed stage is now `AS e2e`;
a new `FROM e2e AS headed` stage layers on Xvfb, `openbox`, and an
x11vnc + noVNC + websockify bridge, reachable at `:7900`. Because an
unqualified `docker build` picks whichever stage is _last_ in the file,
both `.github/workflows/build-e2e-image.yml` and the `e2e` compose service
now pin `target: e2e` explicitly — without that pin either would silently
start building `headed` instead. `playwright-server` builds `target:
headed` and takes its own image tag, `sorrel-e2e-headed` (previously it
shared `sorrel-e2e` with the `e2e` service, harmless only because both
built identical content — building different stages under one tag is a
last-build-wins bug waiting to happen). A new `Docker/playwright-entrypoint.sh`
raises the display, then `exec "$@"`s into whatever command the service (or
a `docker compose exec`) actually asked for, so MB.22's `run-server`
behaviour is unchanged; `docker-compose.yaml` sets it as `entrypoint:`
explicitly rather than relying only on the Dockerfile's own `ENTRYPOINT`.

`make docker-codegen NAME=<spec>` (`makefile`, beside MB.22's
`playwright-server-up`/`-down`) starts `playwright-server` if needed, then
`exec`s `playwright codegen` into it as the caller's uid, so the recorded
file lands in `e2e/` owned by a real user rather than root.
`.devcontainer/devcontainer.json` forwards the new **7900** alongside
MB.22's inspector ports.

As a side effect, `page.pause()`'s Inspector and UI mode's live locator
picker — both written off in MB.22's design record as not working against a
remote browser — now work, since both just needed somewhere to draw.
Amended `claude-docs/design-decisions/mb.22-playwright-in-devcontainer.md`
in place with a dated note rather than rewriting its original reasoning,
per CLAUDE.md's rule that a doc disagreeing with the code gets reconciled.
Wrote `claude-docs/design-decisions/mb.23-codegen-needs-a-display.md` for
the fuller reasoning (why a second service was rejected, the image-tag
collision, the accepted browser-in-a-browser cost).

Updated `claude-docs/debugging.md` (port table, the "known limitation"
section rewritten since it's no longer one, a new "Recording a spec"
subsection with the five-point adaptation checklist), `docker.md` (the two
Dockerfile stages, the second image tag, `docker-codegen`), and `ci.md`
(the `target: e2e` pin and why it now matters). `testing.md` already
pointed to `debugging.md` for the full debugging setup, so no duplicate
pointer was needed there.

Known limitation stated plainly rather than worked around: sign-in is
OAuth-only, so an authenticated flow still can't be recorded end-to-end —
that waits on seeded sessions from M1.21–M1.23. No hook for
`--save-storage` was built ahead of that.

On request, also extended `make docker-all` to bring `playwright-server` up
alongside app/Postgres/workshop/studio — it's long-running like the other
three, and now has a display worth having by default. `e2e` stays out of
that list on purpose: it's a one-shot suite run
(`docker compose run --rm`), not a service to leave up, so the target names
its five services explicitly (`up -d app postgres workshop studio
playwright-server`) rather than blanket-enabling the `e2e` profile with no
service list, which would also start `e2e` itself running the whole suite
under `up -d` semantics. `CLAUDE.md`'s Commands table and `docker.md`'s
makefile summary are updated to match; `TASKS.md`'s MB.21 prose (which
described `docker-all`'s original scope) gets a forward-pointer rather than
a rewrite, since it was accurate as of MB.21 and CLAUDE.md's convention is
to correct what's wrong, not erase what was true.

Manual verification then turned up a fourth bug, and the most instructive
one. With the display working and the recorder up, the recorded page was
inert: it rendered correctly and no click did anything. Driving the same
remote browser from the devcontainer (connect to
`ws://playwright-server:4444`, load `http://sorrel-app:8000`, look for
React's `__react*` keys on the button) confirmed the app was never
hydrating — every chunk returned 200, no page error, no failed request,
and no fiber on the DOM node.

The cause is `next dev`'s cross-origin block
(`next/dist/server/lib/router-utils/block-cross-site-dev.js`): requests to
`/_next/*` from a host outside `localhost` are 403'd unless the host is in
`allowedDevOrigins`. A `<script src>` sends no `Origin` header and counts
as same-origin, so the static chunks sail through — but the **HMR
websocket upgrade** does send one and gets rejected, and under Turbopack
that connection is what boots the client runtime. Correct SSR HTML, clean
console apart from one websocket error, zero interactivity. Fixed with
`allowedDevOrigins: ['sorrel-app']` in `next.config.ts`, verified by
re-running the same probe (hydrated, `data-theme` cycling
`null → light → dark`, background colour changing with it). Scoped to
`sorrel-app` alone rather than also listing `app`, since `app` can never be
loaded by a real browser anyway (the HSTS gTLD problem above) — listing it
would document a path that cannot work. The block is gated on
`development`, so `next start` on 8001 — the e2e suite's server — was never
affected, which is exactly why MB.22's remote-browser path never surfaced
it.

Recording against a working page then exposed a genuine app bug, folded
into this task on request rather than split out: with nothing stored and a
light OS preference, the first click on `ThemeToggle` was a visual no-op.
`globals.scss` resolves three theme states — `data-theme` when present,
else a light system preference, else dark — but only a _stored_ choice ever
stamps that attribute, so `handleToggle` read an absent attribute as "not
light" and applied `light`: the theme already showing. `index.scss` had the
same gap, keying its settled-facet rules off `html[data-theme='light']`
alone, so the crescent sat on a light page until the mount effect swapped
it a paint later — the exact swing MB.2 removed, still happening for anyone
who had never clicked the toggle.

Fixed by resolving the current theme the way the stylesheet does rather
than reading the attribute alone (`resolveCurrentTheme()`: attribute, then
`matchMedia('(prefers-color-scheme: light)')`, then dark — asking for
`light` and not `dark`, since "no preference" has to resolve to dark to
match the `:root` default), and by lifting the settled-facet rules into a
mixin included from both light tiers, mirroring `globals.scss` selector for
selector. Four tests added, three of which failed first. Verified in the
real browser: `aria-pressed` now reads `true` on a light system at mount,
and the first click actually changes the background.

One thing deliberately left alone: while the recorder is attached, the dev
overlay reports a hydration mismatch on `<body data-pw-cursor="pointer">`.
That attribute is Playwright's own, set to drive the pointer styling it
paints over the page, and it lands before React loads — the "browser
extension messed with the HTML" case Next's error text names. Hydration
still completes. Silencing it would mean `suppressHydrationWarning` on
`<body>`, masking real body-level mismatches everywhere and permanently to
quiet a tool artifact that only appears under the recorder, and would
contradict `layout.tsx`'s documented reason for scoping its one suppression
to `<html>`. Documented in `debugging.md` as expected instead.
