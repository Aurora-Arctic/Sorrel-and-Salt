# MB.22 — Playwright in the devcontainer

**Status:** decided · **Date:** 2026-09-17

`Docker/Dockerfile.node`'s `development` stage is Alpine/musl. Chromium has no
official musl build, so Playwright cannot launch a browser natively in the
devcontainer at all — before this task, `make docker-e2e`'s separate Debian
image (`Docker/Dockerfile.e2e`) was the only way to run the suite, and only
from the host, never from an editor session attached to the devcontainer.

## Decided

**Split the runner from the browser.** The Playwright _test runner_ is plain
Node.js with no native browser dependency, so it stays in the Alpine
devcontainer unchanged. Only the _browser_ needs Debian/glibc, so it runs in a
long-lived `playwright-server` compose service (`Docker/docker-compose.yaml`,
profile `e2e`) built from the same `Docker/Dockerfile.e2e` image CI already
uses — no new image, and therefore no version drift risk: the browser
`playwright run-server` launches is pinned to the exact Playwright/browser
version CI's `e2e` service already runs.

The runner dials that browser over Playwright's own remote-browser protocol:
`connectOptions.wsEndpoint` in `playwright.config.ts`, fed from
`PLAYWRIGHT_WS_ENDPOINT`. That value is a WebSocket address
(`ws://playwright-server:4444/`) — not a page, and not something opened in a
browser tab.

## Why this over the alternatives

**Rebasing the devcontainer off Debian** was rejected because it reverses
M0.11's Alpine slimming decision for the sake of one developer's workflow —
the devcontainer, `workshop`, and `studio` services would all carry Debian's
larger image just so Playwright's browser has somewhere to run, when only the
browser actually needs it.

**Running the whole suite inside the `e2e` container, with a debugger
attached** (`NODE_OPTIONS=--inspect-brk` on that service) was the simpler
fallback and was seriously considered. It gives breakpoints, but not a
native-feeling `npm run e2e` from the devcontainer terminal, and not in-editor
UI mode — the workflow stays "shell into a different container." Letting
`npm run e2e` just work from the devcontainer terminal, the same way it does
on the host, was the actual ask, so the remote-browser approach won out.

## What this costs

Headed/interactive Playwright features don't work well against a remote
browser, because there is no display attached to the container that browser
runs in: `page.pause()`'s inspector window has nowhere to open, and UI mode's
live locator picker (which needs to hover and click on the actual page as it
renders) has nothing to point at.

**Trace viewer and UI mode's own web UI both work fine** — that's the whole
trade-off. Trace viewer replays a recorded run (`npm run e2e:trace`); it
doesn't need a live browser at all, only the trace file. UI mode's UI is
itself served in the _runner's_ browser tab (on the host, via the forwarded
port), showing before/after screenshots and network/console logs streamed
back from the remote browser rather than a live view of it — so it degrades
gracefully to "recorded steps," not "nothing."

## What this rules out

`PLAYWRIGHT_WS_ENDPOINT` must be scoped to only the `devcontainer` compose
service (`.devcontainer/docker-compose.yml`) and never baked into an npm
script or unconditionally into `playwright.config.ts`. CI
(`.github/workflows/playwright.yml`) and `make docker-e2e` must keep
launching a local browser inside the `e2e` container, unchanged — neither
sets the variable, so neither takes the `connectOptions` branch. If it were
set anywhere else, CI and `make docker-e2e` would silently start depending on
`playwright-server` being up, which it never is in either of those contexts.

## Caveat — unverified

This was authored and reviewed **without a live `docker compose` run**:
neither `make` nor `docker` is available in this devcontainer session (see
CLAUDE.md's own text on that), so the compose YAML and the
`connectOptions`/`PLAYWRIGHT_WS_ENDPOINT` wiring are reasoned through, not
exercised. Before this is trusted, someone with host access needs to run the
first manual verification pass:

```
make playwright-server-up
# from inside the devcontainer:
npm run e2e
```

and confirm the suite actually completes against the remote browser, that a
deliberately failing spec still writes a usable trace, and that `make
docker-e2e` and the CI workflow are unaffected.

## Related

`claude-docs/debugging.md` documents the full debugging setup MB.22 shipped,
including this piece. `claude-docs/testing.md`'s E2E section and
`playwright.config.ts` itself carry the mechanism; this record carries the
trade-off reasoning.
