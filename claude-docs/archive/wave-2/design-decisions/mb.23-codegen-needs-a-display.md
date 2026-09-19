# MB.23 — Codegen needs a display

**Status:** decided · **Date:** 2026-09-17

`playwright codegen` records role/label queries from a real interaction — the
exact query style CLAUDE.md mandates ("role and label queries only") — but
MB.22's `playwright-server` compose service, built to give the (Alpine,
browser-less) devcontainer a remote Chromium over `PLAYWRIGHT_WS_ENDPOINT`,
cannot serve it. `npx playwright codegen --help` exposes no `--ws-endpoint`:
the recorder always launches its own local browser, full stop. MB.22's own
design record ([`mb.22-playwright-in-devcontainer.md`](mb.22-playwright-in-devcontainer.md))
already names the underlying reason in its "What this costs" section —
`page.pause()`'s inspector window has nowhere to open, because
`playwright-server` has no display attached. Codegen is exactly that failure
mode, not a new one.

## Decided

**Give `playwright-server` a display**, rather than build a second service.
`Docker/Dockerfile.e2e` gains a second stage, `headed` (`FROM e2e AS
headed`), adding Xvfb, a window manager (openbox), and an x11vnc + noVNC +
websockify bridge that makes that display reachable from an ordinary host
browser tab at `:7900`. `playwright-server` builds `headed` instead of `e2e`,
publishes `7900` alongside its existing `4444`, and gets a
`playwright-entrypoint.sh` that raises the display before `exec "$@"`-ing
into whatever command it was given — so MB.22's `run-server` behaviour is
byte-for-byte unchanged. `make docker-codegen NAME=<spec>` then `exec`s
`playwright codegen` into that already-running container.

Once the service has a display, `page.pause()`'s Inspector and UI mode's live
locator picker — the two things MB.22's design record wrote off as a cost —
work as a side effect. That record is amended in place with a dated note; see
"What this makes obsolete" below.

## Why this over the alternatives

**A separate `codegen` service** was the first design and loses on every
axis: a second service, a second `node_modules_*` volume, a second image
tag, and a port fight — `docker compose run --service-ports` while
`playwright-server` is `up -d` collides on the ports both would want to
publish. It also leaves MB.22's limitation standing when the fix is a strict
subset of the work a second service would duplicate.

**`docker compose run --rm playwright-server <codegen-command>`** (a command
override instead of `exec`) avoids the extra service but starts a second,
redundant container — its own Xvfb, its own noVNC — alongside the one already
running, and still fights the already-published ports. `docker compose exec`
into the running container is strictly better: same display, same published
port, nothing new to bind. The repo already reaches for `exec` this way in
`make db-psql`.

**Playwright's UI mode instead of a display at all.** The tempting one, and
worth stating plainly so it isn't re-litigated: UI mode is served over plain
HTTP (`--ui-host 0.0.0.0 --ui-port 9324`, already wired as `npm run e2e:ui`
in MB.22), needs no display, and does have a locator picker — so it looks
like it should make this whole stack unnecessary. It does not. UI mode's
"Pick locator" works against the **DOM snapshot** in the trace viewer, which
is exactly why it needs no display, and as of Playwright 1.63 UI mode has no
recorder at all. Recording is `playwright codegen`, which opens two real
windows — the browser and the Inspector — and `page.pause()` is the same.
There is no display-free path to what this task exists to deliver. If a
future Playwright release adds recording to UI mode, this decision is worth
revisiting, because that version of it would genuinely retire the display.

## The two things this rules out

**`target: e2e` must stay pinned everywhere that isn't `playwright-server`.**
`Docker/Dockerfile.e2e` had exactly one, unnamed stage before this task, so a
bare `docker build`/`build-push-action` picked it by default. Adding
`headed` as the file's new last stage means that default silently changes
unless `.github/workflows/build-e2e-image.yml` and the `e2e` compose service
both pin `target: e2e` explicitly. Missing either one means CI or
`make docker-e2e` starts building (and shipping) the display layer for no
reason — extra image weight, a `USER root` step it doesn't need, nothing it
uses.

**`playwright-server` must not share `sorrel-e2e` with the `e2e` service.**
Both declared `image: sorrel-e2e` before this task, which was harmless only
because they built the same stage. The moment one builds `headed`, that
becomes a silent last-build-wins bug — whichever service built most recently
overwrites the tag, and the other service starts running against content it
never asked for, with nothing in the output saying so. `playwright-server`
now takes its own tag, `sorrel-e2e-headed`.

## What this makes obsolete

`mb.22-playwright-in-devcontainer.md`'s "What this costs" section states
that headed/interactive Playwright features "don't work well against a
remote browser, because there is no display attached to the container that
browser runs in." That is now false — the display MB.23 adds is exactly
what was missing — and CLAUDE.md is explicit that a doc disagreeing with the
code gets reconciled, not left. That file carries a dated amendment rather
than being rewritten: the original reasoning (why headed features need a
local window to draw into) is still correct and still explains _why_ a
display was the fix, even though the limitation itself no longer holds.

## Accepted cost

Browser-in-a-browser: the recorder is a containerised Chromium streamed over
noVNC into a host tab, not a native process — slightly laggy, and not your
own profile or extensions. There is exactly one display per
`playwright-server` container, so one recording session at a time. A native
host recorder was considered and rejected: it needs a host Node install plus
a separate Chromium download, recording against whatever version that
download happens to resolve to rather than the one `PLAYWRIGHT_VERSION`
pins — reintroducing the exact version-drift risk `Docker/Dockerfile.e2e`'s
header comment already warns about.

## Known limitation, stated plainly

Sign-in is OAuth-only (Google/GitHub, `src/lib/auth.ts`), so an authenticated
flow cannot be recorded end-to-end today. Codegen's
`--save-storage`/`--load-storage` pair is the eventual answer, but needs
seeded sessions, which don't exist until M1.21–M1.23 fill in `seed()`. This
task records unauthenticated pages only and builds no hook for storage-state
loading.

## Caveat — first draft was authored without a live `docker compose` run

Neither `make` nor `docker` is available in this devcontainer session, so
the first draft of the Dockerfile stages, entrypoint script, and compose
wiring were reasoned through, not exercised. Host-side manual verification
caught four real bugs that reasoning alone missed — all fixed before this
task is considered done:

- **`http://localhost:7900` served a directory listing, not the client.**
  `websockify --web=/usr/share/novnc` serves that directory as a plain
  static file server; the `novnc` apt package's landing page is `vnc.html`,
  not `index.html`, so hitting the bare root found nothing to serve as an
  index. Fixed with `RUN ln -s vnc.html /usr/share/novnc/index.html` in the
  `headed` stage.
- **`make docker-codegen` failed with `Missing X server or $DISPLAY`,
  even though Xvfb was actually running.** The entrypoint script's
  `export DISPLAY=:99` only lives in that script's own shell process.
  `docker compose exec` (what `docker-codegen` uses) starts a _new_ process
  using the container's initial environment, which never saw that export —
  a version of the classic "entrypoint exports don't reach `docker exec`"
  gotcha. Fixed by also declaring `environment: DISPLAY: ':99'` on the
  `playwright-server` compose service itself, so it's part of every
  process the container runs, not just the one the entrypoint launches.
- **`make docker-codegen` then failed with `net::ERR_SSL_PROTOCOL_ERROR`
  navigating to `http://app:8000`.** `.app` is a real, Google-registered
  gTLD, and every major browser ships a hard-coded HSTS-preload entry for
  the bare domain `app` (mandated at `.app`'s registration) — a real Chrome
  loading `http://app:8000` gets silently upgraded to `https://` before the
  TCP connection even opens, and fails against a plain-HTTP dev server. No
  Chromium launch flag disables this: the preload list is compiled into the
  binary, not loaded at runtime. `playwright-server`'s existing remote-
  browser e2e path (MB.22) never hit this — its `baseURL` is
  `http://devcontainer:8001`, not `app` — so this was invisible until
  `docker-codegen` became the first thing to load `app` in a real,
  unconfigured Chrome. Fixed by giving the `app` compose service a second
  DNS alias, `sorrel-app` (not a reserved TLD), and pointing
  `docker-codegen`'s URL and the recording docs at that instead. Every
  non-browser reference to `app` (service-to-service traffic like
  `DATABASE_URL`) is unaffected and keeps using the bare name.
- **The recorded page rendered but was completely dead — nothing
  interactive responded to a click.** Not a recorder problem: the app was
  never hydrating. Next's dev server 403s cross-origin requests to
  `/_next/*` for any host outside `localhost` unless it's listed in
  `allowedDevOrigins`, and `sorrel-app` wasn't. The static chunks survive
  that check (a `<script src>` sends no `Origin` and counts as same-origin),
  so every asset returned 200 and the console stayed clean apart from one
  websocket error — but the **HMR websocket upgrade** does send an `Origin`
  and got rejected, and under Turbopack the client runtime boots through
  that connection. The result is the worst possible failure shape: correct
  SSR HTML, no error, no hydration, every handler silently absent. Fixed by
  adding `allowedDevOrigins: ['sorrel-app']` to `next.config.ts`. This is
  dev-only (`next dev`), so the e2e suite's `next start` on 8001 was never
  affected — which is why MB.22's remote-browser path never surfaced it.

All four are now covered by the manual verification pass rather than
reasoning alone. If `make docker-codegen` or `:7900` misbehave again after
this, treat it as a new bug, not a recurrence of any of these — all four
mechanisms are now exercised, not just designed.

The fourth one generalises: **any new hostname a real browser uses to reach
`next dev` needs to be in `allowedDevOrigins`**, and the symptom will be a
page that renders correctly and does nothing, not an error.

## Related

`claude-docs/debugging.md` documents the recorder alongside the rest of the
debugging setup MB.22 shipped. `mb.22-playwright-in-devcontainer.md` carries
the remote-browser trade-off this task partially resolves.
