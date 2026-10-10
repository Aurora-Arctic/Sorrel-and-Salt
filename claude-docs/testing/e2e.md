## E2E — Playwright (M1.11)

`playwright.config.ts` (repo root) runs specs under `tests/e2e/` against a
**production build**, not `next dev`: the first `webServer` entry is
`npm run build && npm run start`, on **8001** (`PORT` env override; `start`
defaults to 8000, `next dev`'s port, which an e2e run keeps clear of).
`reuseExistingServer` is off whenever `CI` is set, so a CI run always builds
and starts its own servers rather than attaching to ones left over on the
ports.

**Each worker slot has a server and a database of its own** (MB.112), as each
Vitest pool slot has a database. A database each, because each spec file
reseeds by dropping its database `WITH (FORCE)`, which would cut a sharing
worker's connections mid-test. A server each, because the code under test
runs in `next start`, which built its client at boot, not in the Playwright
worker, so a database swapped in the worker would never reach the page.
[`design-decisions/mb.112-server-per-worker.md`](../design-decisions/mb.112-server-per-worker.md)
holds the argument, and the two alternatives turned down: a server each
worker starts for itself, and one server picking a database per request.

- **The slot is Playwright's `parallelIndex`** — `TEST_PARALLEL_INDEX` inside
  the worker, which `tests/e2e/slots.ts`'s `currentSlot()` reads, throwing
  outside a Playwright worker. It is unique
  among running workers, and the worker Playwright starts to replace one
  after a failed test keeps it. The reseed, `signInAs()` and `baseURL` each
  read it, so a retried test's database, session and pages always agree on
  one slot.
- **The worker count is `E2E_WORKERS`, not `--workers`**, because the servers
  are declared up front, one per slot. `playwright.config.ts` sets `workers`
  to `E2E_SLOTS`: `E2E_WORKERS` if it is set, otherwise half the CPUs floored
  at one — Playwright's own default, so two on CI's four-vCPU runner.
  Anything but a whole number from 1 to `MAX_SLOTS` (99) throws, naming the
  variable. A `--workers` above the count would put a worker on a slot with
  no server, so `tests/e2e/fixtures.ts`'s worker-scoped auto fixture `slot`
  fails every test such a worker runs, with a message naming the limit and
  saying to raise `E2E_WORKERS` instead — before anything reaches for a
  server or a database that was never started.
- **Slot `n` serves on `8001 + n`, from `sorrel_e2e_<n>`.** Slot 0's entry
  builds; each further slot's runs `npm run start` over that build.
  Playwright starts `webServer` entries one after another, which is what lets
  the later ones serve the first's build. `tests/e2e/fixtures.ts` overrides
  `baseURL` with the slot's server for any project that sets none, so the
  default `chromium` project reaches its own slot's; there is no top-level
  `use.baseURL`.
- **A further slot costs about half a second and 180 MB**, MB.112's
  measurement of one more `next start` over the built `.next-e2e`; the
  servers start in turn, so the half seconds add to startup.

**The configured-providers server is one more**, because the sign-in page
reads OAuth credentials per request and its two provider states cannot share
a process. Every slot's server runs with each provider variable set to `''` —
blank rather than absent, because Next never lets `.env.local` override a
variable already set, so a developer's real credentials cannot leak into it.
Its `webServer` entry, after the slots', runs `npm run start` on **8100** with placeholder
credentials for all four, against `sorrel_e2e_providers`, which no spec
reseeds. 8100 is fixed above every slot's port, and the 99-slot cap keeps it
there, so no slot can reach that server, or attach to it under a local
`reuseExistingServer`. Two projects split the specs between them: `chromium`
(everything except `tests/e2e/sign-in-configured-providers.spec.ts`, against
its slot's server) and `chromium-configured-providers` (that spec alone,
against 8100 through its own `baseURL`). Both run with `reducedMotion:
'reduce'`, set once in the shared `use`, so an axe scan never samples a colour
mid-transition — on hover, or as a Save button enables and `.btn` fades its
colours in. Only `chromium` collects
JS coverage (`tests/e2e/fixtures.ts`) — the second project runs the same
bundle. Placeholder ids are useless to a real authorization endpoint, so
nothing may click a provider button against 8100; the spec aborts and fails
on any request to `/api/auth/sign-in/`.

**The compendium-cache server is the last** (M8.6): `npm run start` on
**8101** against `sorrel_e2e_cache`, which no spec reseeds, and the one
server whose data cache holds. Every other sets `NEXT_DATA_CACHE=off`,
because its database is reseeded under it and a cache would not follow. A
third project, `chromium-compendium-cache`, runs
`tests/e2e/compendium-cache.spec.ts` alone against it, and `chromium`
ignores that spec too
([`db/compendium-cache.md`](../db/compendium-cache.md), "In tests").

- **`tests/e2e/database.ts`** — the same two-tier shape as the Vitest harness,
  through the same `tests/support/seeded-database.ts` (M1.27).
  `seedE2eTemplate()` builds `sorrel_e2e_template` — `sorrel_template`
  cloned, migrated and `standard`-seeded, ~1 s — and `cloneE2eDatabases()`
  clones every slot's `sorrel_e2e_<slot>`, `sorrel_e2e_providers` and
  `sorrel_e2e_cache` from it,
  tens of milliseconds each. `e2eDatabaseUrl(database)` swaps
  `DATABASE_URL`'s pathname to that database, by default the calling worker's
  slot's; the config passes each server its own as `webServer.env.DATABASE_URL`,
  so the built app reads from it instead of the dev database.
  `recreateE2eDatabase()` re-clones the calling worker's slot database alone,
  and `dropE2eTemplate()` removes the template again.
- **`globalSetup: './tests/e2e/global-setup.ts'`** calls `seedE2eTemplate()`
  and then `cloneE2eDatabases()`, once per run. It runs _after_ the servers
  have started, since Playwright sets up the `webServer` entries first, and
  still finishes before any test. So nothing may query a database at server
  boot or on the readiness poll's `GET /`, which on a first run would find
  none
  ([`design-decisions/mb.112-server-per-worker.md`](../design-decisions/mb.112-server-per-worker.md),
  "Setup runs after the servers").
  `global-teardown.ts` drops the template after the last spec; the slot and
  providers databases are left for inspection.
- **Reseeding between spec files** is each spec file's own `test.beforeAll`,
  not a Playwright hook that runs implicitly — see `tests/e2e/smoke.spec.ts`. It
  calls `recreateE2eDatabase()`, never `src/db/seed` directly: a clone of the
  seeded template _is_ the reseed, and it costs a clone rather than a seed.
  Until M1.27 the template it cloned was the empty `sorrel_template`, so the
  baseline every file started from was an empty database —
  [`design-decisions/m1.11-e2e-reseed-without-seed.md`](../design-decisions/m1.11-e2e-reseed-without-seed.md)
  records why that was enough at the time.
  **Every db-touching spec file must open with
  `test.describe.configure({ mode: 'serial' })`** (M1.14) — `playwright.config.ts`
  sets `fullyParallel: true`, which lets Playwright split one file's tests
  across multiple workers, and `beforeAll` then runs once _per worker_
  handling that file rather than once for the file. Two workers both
  reaching `smoke.spec.ts` both ran `DROP`/`CREATE DATABASE sorrel_e2e`
  concurrently and threw `duplicate key value violates unique constraint
"pg_database_datname_index"` before this was added. `serial` pins the
  whole file to one worker, so the reset genuinely happens once. Per-slot
  databases have since ended that race but not the rule: `serial` is still
  what keeps a file's tests on one worker, running in order against its one
  reseed of that worker's database.
- **Mail is read back from Mailpit** (MB.65). `tests/e2e/mailpit.ts`'s
  `latestMessageTo(address)` searches Mailpit's REST API at `MAILPIT_URL` for
  the newest message to that address and returns its sender, recipients,
  subject, text and HTML, polling up to ten seconds because the app sends in
  the background of the request that caused it. The address goes in quoted:
  unquoted, Mailpit's query language splits it at a `+`. A spec that follows
  a mailed link gives its recipient a fresh address, so a retry or a parallel
  worker cannot read another's message; `tests/e2e/mail-transport.spec.ts`
  is the example, and sends from the runner because nothing in the app mails
  yet. Compose and `playwright.yml` both run Mailpit; outside them the helper
  throws on the unset URL rather than reporting that no mail arrived.
- **A signed-in browser without a provider** (MB.71). No spec can finish a
  real OAuth round trip, so `tests/e2e/session.ts`'s `signInAs(page, email,
providers, role, { emailVerified })` writes what a Discord sign-in would leave into the calling
  worker's slot database, the one its server reads: a user stamped as
  its own creator, holding the site role given
  (`user` unless the spec asks for `admin`), verified unless the spec passes
  `emailVerified: false` (MB.205, for an admin approving an unverified
  account), one `accounts` row per provider named, and a session. It then hands the browser the session cookie Better
  Auth would have set. The value is the token, a dot, and its base64
  HMAC-SHA256 under `BETTER_AUTH_SECRET`, percent-encoded as better-call's
  `signCookieValue` does it. The runner and the served build share that
  secret: `playwright.yml` and compose set it at job level, and a local run
  sets it on the command line, or the helper throws. The name is
  `__Secure-better-auth.session_token` because a production build's base URL
  forces https. It rides as an extra request header, not in the cookie jar,
  since a browser never sends a `Secure` cookie to the plain-http
  `devcontainer:<port>` a remote browser uses. Give each call a fresh address:
  the email index is unique.
- **`next.config.ts`'s `distDir`** reads `NEXT_DIST_DIR`, defaulting to
  `.next`. `webServer.env` sets it to `.next-e2e` so a concurrent `next dev`
  on 8000 (CLAUDE.md's Commands table promises both can run at once) never
  shares — and can't corrupt — the production build e2e is serving from.
- **`next.config.ts`'s `experimental.isrFlushToDisk`** is off when
  `NEXT_ISR_FLUSH_TO_DISK` is `'false'`, which every e2e server sets, so each
  server keeps whatever data cache it has — the compendium read's `unstable_cache`
  (CLAUDE.md rule 6) — in its own memory. The servers share one `.next-e2e`
  build, and a cache flushed to disk there would hand one slot's compendium
  to another. It also stops runtime ISR writes and the image optimiser's disk
  cache, and it is off on Vercel anyway
  ([`design-decisions/mb.112-server-per-worker.md`](../design-decisions/mb.112-server-per-worker.md),
  "The data cache is per server too").
- **`next.config.ts`'s `cacheMaxMemorySize`** is 0 when `NEXT_DATA_CACHE`
  is `'off'`, which every e2e server but the compendium-cache server sets,
  so with nothing flushed to disk either, their data cache holds nothing and
  every `unstable_cache` read reaches the slot's database, reseeded or not
  ([`db/compendium-cache.md`](../db/compendium-cache.md), "In tests").
- **No Neon connection anywhere** — `e2eDatabaseUrl()`/`adminUrl()` only ever
  rewrite the pathname of the ambient `DATABASE_URL`, which points at the
  local `postgres` Docker service exactly as Vitest's does.
- **The browser may be remote** (MB.22). `PLAYWRIGHT_WS_ENDPOINT` is set by
  the `devcontainer` compose service alone. When it is present,
  `playwright.config.ts` passes it as `connectOptions.wsEndpoint`, and every
  `baseURL` becomes `http://devcontainer:<port>` — the slot's server's port,
  8100 for the configured-providers project or 8101 for the compendium-cache one (`tests/e2e/slots.ts`'s
  `browserUrl`) — since a remote browser cannot resolve the runner's
  `localhost`. It reaches those ports inside the compose network;
  `devcontainer.json` forwards 8001 alone, for opening slot 0's server from
  the host. `webServer.url`'s readiness poll deliberately stays on
  `localhost`, because that poll runs in the runner's own process wherever the
  browser lives; making both sides match breaks one of them. Why the browser
  moves at all (Alpine/musl has no Chromium), why the variable must not be set
  any more broadly, and the full setup: `claude-docs/debugging.md`.

`npm run e2e` (`playwright test`) runs the suite; `E2E_WORKERS=<n> npm run e2e`
runs it on `n` workers, and so `n` slot servers. Browser binaries
(`npx playwright install chromium`) are a one-time local step. CI (M1.14)
does not reuse `build-image.yml`'s shared `testing` image for this — that
image is Alpine/musl-based and explicitly excludes Playwright's browser/
system deps (see `Docker/Dockerfile.node`'s header comment; Playwright's
Chromium build has no official musl support at all). Instead
`.github/workflows/playwright.yml` runs in a dedicated image
(`Docker/Dockerfile.e2e`, built `FROM mcr.microsoft.com/playwright:v1.63.0-noble`
and published by `build-e2e-image.yml`) with browsers already baked in — see
`claude-docs/ci/reusable-checks.md`. `Docker/docker-compose.yaml`'s opt-in `e2e` service
(`make docker-e2e`) builds that same image for local use, so a devcontainer
session can run the full suite without installing browsers into its own
Alpine-based image.
