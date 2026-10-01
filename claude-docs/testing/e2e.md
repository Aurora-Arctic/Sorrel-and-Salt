## E2E — Playwright (M1.11)

`playwright.config.ts` (repo root) runs specs under `tests/e2e/` against a
**production build**, not `next dev`: the first `webServer` entry is
`npm run build && npm run start`, on **8001** (`PORT` env override; `start`
defaults to 8000, `next dev`'s port, which an e2e run keeps clear of).
`reuseExistingServer` is off whenever `CI` is set, so a CI run always builds
and starts its own servers rather than attaching to ones left over on the
ports.

**Each worker slot has a server and a database of its own** (MB.112), as each
Vitest pool slot has a database. A database each, because a spec file's
reseed drops its database `WITH (FORCE)`: shared between workers, one file's
reseed would cut another worker's connections mid-test, and two files
starting together would race the same `CREATE DATABASE` — M5.4 held the suite
to one worker for that until MB.112. A server each, because in Playwright the
code under test does not run in the worker. Vitest's
`tests/support/db-setup.ts` sets `DATABASE_URL` before anything imports
`src/db/connection.ts`, which builds its client at import, so a Vitest
worker's own process reads the worker's own database. A Playwright worker
runs only the spec and drives the browser; the app runs in a `next start`
that built its client from `DATABASE_URL` once at boot. Swapping the variable
in the worker would move only what runs there — `recreateE2eDatabase()` and
`signInAs()` — so the worker would seed and sign in to its own database while
the page it opened read the server's.
[`design-decisions/mb.112-server-per-worker.md`](../design-decisions/mb.112-server-per-worker.md)
records the two alternatives turned down: a server each worker starts for
itself, and one server choosing its database per request.

- **The slot is Playwright's `parallelIndex`** — `TEST_PARALLEL_INDEX` inside
  the worker, which `tests/e2e/slots.ts`'s `currentSlot()` reads. It is unique
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
- **A further slot costs about half a second and 180 MB.** One more
  `next start` over the built `.next-e2e` answers in about 0.5 s and holds
  about 180 MB resident, and the servers start one after another, so each
  slot adds its half second to startup.

**The configured-providers server is one more**, because the sign-in page
reads OAuth credentials per request and its two provider states cannot share
a process. Every slot's server runs with each provider variable set to `''` —
blank rather than absent, because Next never lets `.env.local` override a
variable already set, so a developer's real credentials cannot leak into it.
The last `webServer` entry runs `npm run start` on **8100** with placeholder
credentials for all four, against `sorrel_e2e_providers`, which no spec
reseeds. 8100 is fixed above every slot's port, and the 99-slot cap keeps it
there, so no slot can reach that server, or attach to it under a local
`reuseExistingServer`. Two projects split the specs between them: `chromium`
(everything except `tests/e2e/sign-in-configured-providers.spec.ts`, against
its slot's server) and `chromium-configured-providers` (that spec alone,
against 8100 through its own `baseURL`, with `reducedMotion: 'reduce'` so a
hover scan never samples a colour mid-transition). Only `chromium` collects
JS coverage (`tests/e2e/fixtures.ts`) — the second project runs the same
bundle. Placeholder ids are useless to a real authorization endpoint, so
nothing may click a provider button against 8100; the spec aborts and fails
on any request to `/api/auth/sign-in/`.

- **`tests/e2e/database.ts`** — the same two-tier shape as the Vitest harness,
  through the same `tests/support/seeded-database.ts` (M1.27).
  `seedE2eTemplate()` builds `sorrel_e2e_template` — `sorrel_template`
  cloned, migrated and `standard`-seeded, ~1 s — and `cloneE2eDatabases()`
  clones every slot's `sorrel_e2e_<slot>` and `sorrel_e2e_providers` from it,
  tens of milliseconds each. `e2eDatabaseUrl(database)` swaps
  `DATABASE_URL`'s pathname to that database, by default the calling worker's
  slot's; the config passes each server its own as `webServer.env.DATABASE_URL`,
  so the built app reads from it instead of the dev database.
  `recreateE2eDatabase()` re-clones the calling worker's slot database alone,
  and `dropE2eTemplate()` removes the template again.
- **`globalSetup: './tests/e2e/global-setup.ts'`** calls `seedE2eTemplate()`
  and then `cloneE2eDatabases()`, once per run. It runs _after_ the servers
  have started, not before, as this section once said: Playwright's runner
  orders plugin setup — the `webServer` entries — ahead of the global setups,
  and a throwaway config logged its server about 100 ms before its
  `globalSetup` ran. Setup still finishes before any test, and that is enough
  only because postgres.js connects on its first query, and the readiness
  poll's `GET /`, carrying no session cookie, reads no database.
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
providers, role)` writes what a Discord sign-in would leave into the calling
  worker's slot database, the one its server reads: a verified user stamped as
  its own creator, holding the site role given
  (`user` unless the spec asks for `admin`), one `accounts` row per provider
  named, and a session. It then hands the browser the session cookie Better
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
  `NEXT_ISR_FLUSH_TO_DISK` is `'false'`, which every e2e server sets. They
  all serve the one `.next-e2e` build, and Next flushes its data cache —
  `unstable_cache`, which the compendium read sits under (CLAUDE.md rule 6) —
  to `.next-e2e/cache/fetch-cache` and reads it back on a memory miss, while
  `revalidateTag` reaches only its own process: shared on disk, one slot's
  server would serve another slot's cached compendium. Off, each server
  keeps its data cache in its own memory. The flag also gates runtime ISR
  writes and the image optimiser's disk cache; pages prerendered at build
  are still read from disk. On Vercel it is off regardless — Next's build
  passes `false` under `hasNextSupport`, and a server in minimal mode never
  flushes — so this moves e2e towards production, not away from it.
- **No Neon connection anywhere** — `e2eDatabaseUrl()`/`adminUrl()` only ever
  rewrite the pathname of the ambient `DATABASE_URL`, which points at the
  local `postgres` Docker service exactly as Vitest's does.
- **The browser may be remote** (MB.22). `PLAYWRIGHT_WS_ENDPOINT` is set by
  the `devcontainer` compose service alone. When it is present,
  `playwright.config.ts` passes it as `connectOptions.wsEndpoint`, and every
  `baseURL` becomes `http://devcontainer:<port>` — the slot's server's port,
  or 8100 for the configured-providers project (`tests/e2e/slots.ts`'s
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
