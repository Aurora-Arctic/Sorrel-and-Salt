## E2E — Playwright (M1.11)

`playwright.config.ts` (repo root) runs specs under `tests/e2e/` against a
**production build**, not `next dev`: the first `webServer` entry is
`npm run build && npm run start`, on **8001** (`PORT` env override; `start`
defaults to 8000, `next dev`'s port, which an e2e run keeps clear of).
`reuseExistingServer` is off whenever `CI` is set, so a CI run always builds
and starts its own servers rather than attaching to ones left over on the
ports.

**A spec proves what only a real server and browser can** (MB.230; rule 9 of
[`layer-ownership.md`](layer-ownership.md), "What a test may assert"):
navigation and redirects, server render and status codes, cookies, mail,
the data cache, the production build's config, a layout a browser measures,
and one axe scan per page state. It never re-runs a flow a component or
service test proves wholesale — a second filter or CRUD flow on a page
template another spec already drives, which compendium entries hold a
value, a dialog's states — and every admin route keeps its 403 test and one
flow with its scan, even where a lower layer proves that flow too. It asserts state as Vitest does: a `status`,
`alert`, `tooltip`, row or description is present, or carries the data the
action used, and never a page title, a heading on a plain load or a
sentence. A level-1 heading stays where it identifies the destination a
navigation reached, or the 403 page.

**Two suites share this harness** (M9.1). The story suite, `tests/e2e/stories/`,
is one browser flow per v1 story, run by `npm run test:stories` on
`playwright.stories.config.ts` and in the PR gate's `stories` job. The
gate suite, `tests/e2e/*.spec.ts`, is `npm run e2e`, and the root config ignores
`stories/`. A story's test names it with Playwright's tag option,
`test('…', { tag: '@story-6' }, …)`, or an array for several; the tag alone
decides which story a test counts for, and the checklist reads it
([`acceptance.md`](acceptance.md)). Tag a test only when its own steps are the
story's flow; visiting a story's page is not walking it.
`npx playwright test --grep @story-6` runs one story's tests. A gate spec that a
story flow proves is deleted, not kept beside it. The story suite shares the
gate suite's ports (8001 and up) and its lock, `/tmp/sorrel-e2e.lock`, so the
two never run at once on one machine.

**`assertNoAccessibilityViolations(page)` waits for a non-empty title and for
transitions to finish, and for nothing else** (`tests/e2e/axe.ts`): it scans
whatever the page holds at that instant. The title wait is there because a soft
navigation (a filter, a router refresh) removes the `<title>` for a moment and
puts the next one back, while the new rows are already in the page; measured at
about 4 ms on a quiet machine and 150 to 360 ms with the CPU throttled 20 to 40
times (MB.265). The swap can also land between that wait and axe's read of the
page (story 24), so a scan that reports `document-title` waits for a title again
and scans once more; a page that never has a title still fails, at the wait. So
the last web-first
assertion before each scan must be one that waits for the state being
scanned — a dialog visible, a Save enabled, a status shown, a URL reached —
never a negative such as `toHaveCount(0)` on something that was never there,
which passes before the page has rendered anything. A removal of what was
there — a dialog closing, a table emptied by a filter — does wait.

**One spec per page template also checks the phone width and both themes**
(MB.116). `assertNoSidewaysScroll(page)` (`tests/e2e/axe.ts`) sets the window
to 375px, the narrowest width a section signs off at, and fails if the page
is wider than the window. A theme needs naming, because a Playwright page is
in the light theme unless a spec says otherwise, while the site's own
default is dark: a spec that scans once has scanned the light theme only. So
the Welcome test in `smoke.spec.ts` checks the width and scans in each theme
in turn, `page.emulateMedia({ colorScheme })` before each scan, and the 403
test in `admin.spec.ts` checks the width before its scan; the account page
test in `account.spec.ts` does as the Welcome test does, and the unverified
account's email page gets a scan and the width check; story 1's sign-in test
in `stories/01-accounts.spec.ts` checks the width;
`sign-in-configured-providers.spec.ts` and the privilege ledger's story in
`stories/08-email-and-admin.spec.ts` scan in both themes too. It is one per template rather than one per page
because the frame decides the width and the surfaces text sits on, and every
page on a template shares them; the rest of the scans stay single, which
keeps the run short.

**Each worker slot has a server and a database of its own** (MB.112), as each
Vitest pool slot has a database. A database each, because each spec file
reseeds by dropping its database `WITH (FORCE)`, which would cut a sharing
worker's connections mid-test. (That drop may also end an autovacuum worker,
which the test role can do only through the image's `pg_signal_backend` grant,
[`ci/database-image.md`](../ci/database-image.md).) A server each, because the
code under test runs in `next start`, which built its client at boot, not in the
Playwright worker, so a database swapped in the worker would never reach the page.
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
  at one — Playwright's own default, which serves local runs (6 on 12 cores;
  9 and 12 were measured and did not beat it, see "Where a run's time goes").
  This is the local default; CI sets `E2E_WORKERS` itself.
  Anything but a whole number from 1 to `MAX_SLOTS` (99) throws, naming the
  variable. A `--workers` above the count would put a worker on a slot with
  no server, so `tests/e2e/fixtures.ts`'s worker-scoped auto fixture `slot`
  fails every test such a worker runs, with a message naming the limit and
  saying to raise `E2E_WORKERS` instead — before anything reaches for a
  server or a database that was never started.
- **CI runs four workers on its four-vCPU runner** (MB.236):
  `.github/workflows/playwright.yml` sets `E2E_WORKERS: 4` rather than take
  the default's two. A test spends most of its time waiting on the browser
  and the server, not computing in its worker, so four workers finish sooner
  than two even though they share four cores with the servers. On two, the 56
  tests took 55 s, each about a second on its worker in turn. Locally, on 12
  cores, the tests' own span fell from about 49 s to about 34 s; the gate's run
  on the real runner is the measurement the change was kept on. The two
  extra slots cost what any further slot does (below).
- **Slot `n` serves on `8001 + n`, from `sorrel_e2e_<n>`.** Slot 0's entry
  builds; each further slot's runs `npm run start` over that build.
  Playwright starts `webServer` entries one after another, which is what lets
  the later ones serve the first's build. `tests/e2e/fixtures.ts` overrides
  `baseURL` with the slot's server for any project that sets none, so the
  default `chromium` project reaches its own slot's; there is no top-level
  `use.baseURL`.
- **`E2E_PORT_BASE` moves the whole port block.** It sets the first slot's port (default 8001); the configured-providers server sits at base + 99 and the cache server at base + 100. It exists because Playwright reuses whatever already answers on a slot's port when not on CI: another session's dev server on 8001 was silently used as slot 0, and its tests failed with sessions that did not take. The value must be a whole number from 1024 to 65435, or `tests/e2e/slots.ts` throws. Workers inherit the runner's environment, so every reader sees the same block.
- **A further slot costs about half a second and 180 MB**, MB.112's
  measurement of one more `next start` over the built `.next-e2e`; the
  servers start in turn, so the half seconds add to startup.

#### Keeping the servers warm

(M11.18) `npm run e2e:servers` builds
`.next-e2e` and starts every server a run needs, from the same definitions
as the configs (`tests/e2e/servers.ts`), then prints one line per server and
waits. Stop it with Ctrl-C. While it is up, `npm run e2e` and
`npm run test:stories` attach to the servers instead of starting them
(Playwright's `reuseExistingServer`, on whenever `CI` is unset), which
skips the build and the boots: the output shows no build step. It is a
process the developer runs beside `npm run dev`, and staleness is the
developer's: nothing watches the code, so after a change stop it and start it
again, which rebuilds. A run against servers left over from older code tests
that older code. The servers are also shared by every checkout on the
machine, because the ports are fixed: a run from another worktree attaches
to them and tests this checkout's build, so stop them before switching.

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
  then sends its server ten session lookups at once, repeated until all answer 200. The drop kills the server's pooled connections, and the server reads
  each socket's close only some milliseconds later; a test's first request in
  that gap writes to a dead socket and gets a 500 (`CONNECTION_CLOSED`, `EPIPE`
  or `57P01`). With the coverage hooks off, the next file starts quickly enough
  to land in the gap (M11.18). The lookups find the dead connections first, and
  the pool replaces them. `dropE2eTemplate()` removes the template again.
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

#### Reseeding between spec files

Reseeding between spec files is each spec file's own `test.beforeAll`,
not a Playwright hook that runs implicitly — see `tests/e2e/smoke.spec.ts`. It
calls `recreateE2eDatabase()`, never `src/db/seed` directly: a clone of the
seeded template _is_ the reseed, and it costs a clone rather than a seed.
Until M1.27 the template it cloned was the empty `sorrel_template`, so the
baseline every file started from was an empty database —
[`design-decisions/m1.11-e2e-reseed-without-seed.md`](../design-decisions/m1.11-e2e-reseed-without-seed.md)
records why that was enough at the time.
**A file's tests spread across the workers, and `beforeAll` runs on each
worker that comes to the file** (M11.18): `playwright.config.ts` sets
`fullyParallel: true`, so a worker picking up its share of a file's tests
first reclones its own slot database and builds the file's setup rows
there, tens of milliseconds each, and runs that share in file order
(twelve tests over six workers ran `beforeAll` six times, measured). That
is why a file's setup belongs in `beforeAll`, never in its first test,
which only one worker would run; a test is independent when it signs in its
own user and reads only seed rows, rows its file's `beforeAll` wrote, or
rows it writes itself. **Serial mode,
`test.describe.configure({ mode: 'serial' })`, is the choice for a file
whose tests chain**, each reading what the one before it wrote — a mailed
link one test sends and the next follows, a cache one test warms and the
next reads — and the line says which chain in a comment beside it. It can
sit inside one `test.describe` block, pinning that block alone:
`tests/e2e/compendium-cache.spec.ts` and
`tests/e2e/stories/01-invitations.spec.ts` are serial whole, and
`01-accounts.spec.ts`'s coven-creation block and
`08-email-and-admin.spec.ts`'s primary-admin block are. The lint rule
`sorrel/e2e-chained-tests-serial` (`lint/source-sweeps.js`, on for
`tests/e2e/**/*.spec.ts`) holds the rule: it fails a test outside a serial scope that assigns a variable
declared outside it, the one shape every chained file here had, while an
assignment in a hook stays legal. Until M11.18 every
db-touching file was serial (M1.14), a rule written when the workers shared
one `sorrel_e2e` database and two of them reseeding it at once threw
`duplicate key value violates unique constraint "pg_database_datname_index"`.
MB.112's database per slot ended that race, and the rule outlived it by a
fortnight of runs whose wall time was their longest file's ("Where a run's time
goes", below).

- **Mail is read back from Mailpit** (MB.65). `tests/e2e/mailpit.ts`'s
  `latestMessageTo(address)` searches Mailpit's REST API at `MAILPIT_URL` for
  the newest message to that address and returns its sender, recipients,
  subject, text and HTML, polling up to ten seconds because the app sends in
  the background of the request that caused it. An optional third argument
  narrows the search to one subject, for a flow that mails one address twice
  (story 71: the verification link, then the reset link). The address goes in quoted:
  unquoted, Mailpit's query language splits it at a `+`. A spec that follows
  a mailed link gives its recipient a fresh address, so a retry or a parallel
  worker cannot read another's message;
  `tests/e2e/stories/01-invitations.spec.ts` is the example. A spec asserts the recipient and the link, never the
  subject or body: the wording is the email's own test's, and the link is
  what the reader follows. Compose and `playwright.yml` both run Mailpit;
  outside them the helper throws on the unset URL rather than reporting that
  no mail arrived.

#### A signed-in browser without a provider

(MB.71) No spec can finish a
real OAuth round trip, so `tests/e2e/session.ts`'s `signInAs(page, email,
providers, role, { emailVerified })` writes what a Discord sign-in would leave into the calling
worker's slot database, the one its server reads: a user stamped as
its own creator, holding the site role given
(`user` unless the spec asks for `curator` or `admin`; any role but `user` also holds `canCreateWorkspace`, which the CHECK demands (M11.20)), verified unless the spec passes
`emailVerified: false` (MB.205, for an admin approving an unverified
account), one `accounts` row per provider named, and a session. It then hands the browser the session cookie Better
Auth would have set. The value is the token, a dot, and its base64
HMAC-SHA256 under `BETTER_AUTH_SECRET`, percent-encoded as better-call's
`signCookieValue` does it. The runner and the served build share that
secret: `playwright.yml` and compose set it at job level, and a local run
sets it on the command line, or the helper throws. The name is
`better-auth.session_token`, not the `__Secure-` name a production build's https base URL would give it, because no browser sends a `Secure` cookie to a plain-http origin such as `devcontainer:<port>`. Every e2e server is started with `E2E_PLAIN_SESSION_COOKIE=true` (`tests/e2e/servers.ts`), which `src/lib/auth.ts` reads through `plainSessionCookie()` (`src/lib/e2e-session-cookie.ts`) as `advanced.useSecureCookies: false`. The helper puts the cookie in the context's jar with the host alone (a cookie ignores the port, so any slot's server gets it), so every engine sends it and a followed redirect keeps it. The flag does nothing wherever `VERCEL_ENV` is set, so no deploy can lose the prefix. A `next start` left running from an earlier run may keep its names, so stop it first. The other shape, https in front of each slot server, was left: a certificate and a proxy per port, to test one cookie name. Give each call a fresh address:
the email index is unique. To switch back to a user already made,
`signInAgainAs(page, userId)` gives the browser a new session for it
(MB.63).

- **`next.config.ts`'s `distDir`** reads `NEXT_DIST_DIR`, defaulting to
  `.next`. `webServer.env` sets it to `.next-e2e` so a concurrent `next dev`
  on 8000 (CLAUDE.md's Commands table promises both can run at once) never
  shares — and can't corrupt — the production build e2e is serving from.
- **CI restores `.next-e2e/cache` before the build** (MB.230):
  `playwright.yml`'s `actions/cache/restore` step, keyed `nextjs-e2e` on the
  lockfile and the source hashes, falling back to the newest entry for the
  same lockfile. The build
  runs inside `npm run e2e` as slot 0's `webServer` command, so the restore
  has to come before that step, and Turbopack's persistent cache under it is
  what a warm build reuses. The e2e image is Debian's, whose GNU `tar`
  `actions/cache` needs; Alpine's `testing` stage had to add it (MB.37). It
  carries no `zstd`, so the cache is gzip, as it was on the Ubuntu image
  before MB.237: the compression is part of a cache entry's version, so
  adding `zstd` would miss every entry saved without it. It is CI time, not
  test time.
- **The cache a pull request restores is saved on `staging`** (MB.234). GitHub
  lets a run restore caches saved on its own branch, on `main`, or on a pull
  request's base branch, and a pull request's own run saves under its merge
  ref, which only that pull request's later runs can read (GitHub Docs,
  "Dependency caching reference", "Restrictions for accessing a cache"). So
  MB.230's step, on its own, only ever saved: every run logged
  `Cache not found for input keys`. `.github/workflows/e2e-cache.yml` fills
  the gap. On a push to `staging` that touches what the build compiles or
  runs under, it calls `playwright.yml` with `build-only: true`, which adds
  `--grep-invert . --pass-with-no-tests` to `npm run e2e`. Every test title
  matches `.`, so no spec runs, but Playwright starts its `webServer` entries
  before it loads a spec, so slot 0 still runs `npm run build`, and an
  `actions/cache/save` step after it saves `/app/.next-e2e/cache` from
  `staging` under the restore step's key. Because it is the same workflow,
  the warm build has the pull request's image, path, build directory and
  environment, and the same key; a pull request's run then falls back to
  that entry through the lockfile-only restore key. The proof is a pull
  request's run logging `Cache restored from key`. It costs about 2½ free
  GitHub-hosted minutes per qualifying push
  ([`ci/runner-budget.md`](../ci/runner-budget.md)).
- **A pull request's run restores and never saves** (MB.235). Restore and
  save are two steps, `actions/cache/restore` and `actions/cache/save`,
  rather than MB.230's single `actions/cache`, which saves at the end of
  any job whose exact key missed. On a pull request the key's source hash
  changes with almost every push, so that step uploaded 150–240 MB on nearly
  every run, under the pull request's merge ref, where only a re-run of the
  same pull request could read it. The upload came after the tests, on the
  gate's critical path: 17s on run 38110758509. The save step runs only
  under `build-only`, only when the build succeeded (it has no `always()`,
  so a failed build hands nothing on), and only when the restore was not an
  exact hit.
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
`.github/workflows/playwright.yml` runs in a dedicated image,
`Docker/Dockerfile.e2e`, published by `build-e2e-image.yml` — see
`claude-docs/ci/reusable-checks.md`. `Docker/docker-compose.yaml`'s opt-in
`e2e` service (`make docker-e2e`) builds that same image for local use, so a
devcontainer session can run the full suite without installing browsers into
its own Alpine-based image.

**The e2e image is Debian with Chromium alone** (MB.237). It is built on
`node:26.6.0-bookworm-slim`, the same Node as `Dockerfile.node`. After
`npm ci`, the lockfile's own `@playwright/test` runs
`playwright install --with-deps --only-shell chromium`, so the browser always
matches the package. `--only-shell` takes the headless shell alone, which is what a
headless run launches; the `headed` stage adds the full Chromium for
`playwright-server`'s display. Until MB.237 the image was built on
Microsoft's `mcr.microsoft.com/playwright` image, which also carries Firefox
and WebKit and their system libraries, and pulling it was the largest fixed
cost of every e2e job. The browsers sit in `/ms-playwright`
(`PLAYWRIGHT_BROWSERS_PATH`) rather than under `$HOME`, because a GitHub
container job sets `HOME` to a directory the image never saw.

#### A password sign-in in the browser

A password sign-up or sign-in is a real browser post to Better Auth, unlike
the provider flows above, so two things about the e2e servers make it work.

- **The breached-password check never reaches the real service.** Every e2e
  server starts with `NODE_OPTIONS=--import tests/e2e/pwned-range-preload.mjs`
  (an absolute path, set in `tests/e2e/servers.ts`). The preload wraps the
  server's `fetch` for `https://api.pwnedpasswords.com/range/` alone and answers
  from `tests/e2e/pwned-range.mjs`: `BREACHED_PASSWORD` is on its list, and every
  other password is not. Every other request passes through. The check names
  the service's URL itself (`src/lib/breached-password.ts`), so the fetch is
  wrapped rather than an address switched by an environment variable in
  production code.
- **The browser's origin is trusted.** A production build trusts only the
  deployed hosts, so Better Auth refuses a post from `localhost:<port>` or
  `devcontainer:<port>` as "Invalid origin". Under the same
  `E2E_PLAIN_SESSION_COOKIE` flag as the cookie name above,
  `e2eTrustedOrigins()` (`src/lib/e2e-session-cookie.ts`) adds those two
  origins for the server's own `PORT` as `trustedOrigins`. It gives none
  wherever `VERCEL_ENV` is set, or without the flag; `tests/lib/e2e-session-cookie.test.ts`
  pins both.
- **A mailed reset link redirects to the production host.** Better Auth
  builds the redirect from its `baseURL`, which falls back to the production
  host for an origin it does not know, such as `devcontainer:<port>`. Story
  71 therefore follows the link with `maxRedirects: 0`, reads the
  `Location` header, and opens its path and query on the slot's own server.

The flow, story 70, is `tests/e2e/stories/16-password.spec.ts`
([`auth/passwords.md`](../auth/passwords.md)).

#### Passkeys

A browser offers WebAuthn only in a secure context, and the one plain-http
host that counts as one is `localhost`. Every other spec reaches its slot
server at `devcontainer:<port>` when the browser is remote, where
`PublicKeyCredential` is undefined. So the passkey stories (`73-passkeys.spec.ts`
and `74-passkeys-on-the-account-page.spec.ts`, sharing `passkeys-setup.ts`)
reach their slot server at `localhost` in two ways:

- **The browser.** Each spec connects to the browser server with
  `exposeNetwork: '<loopback>'`, which routes the remote browser's
  `localhost` back to the runner, and overrides the `baseURL` fixture with
  `serverUrl(slotPort(slot))`.
- **The server.** The passkey plugin takes its relying party (rpID) and its
  expected origin from the base URL, and a production build resolves its base
  URL across the deployed hosts, falling back to `https://sorrelandsalt.com`.
  So `baseURL()` in `src/lib/auth.ts` gives an e2e server the fixed
  `http://localhost:<PORT>` that `next dev` uses, under
  `plainSessionCookie()`: the same `E2E_PLAIN_SESSION_COOKIE` switch, which
  does nothing wherever `VERCEL_ENV` is set, so no deploy takes it. A
  `next start` left running from before this change keeps the old base URL;
  stop it first.

The passkey itself is held by Chromium's virtual authenticator, added
through a CDP session (`WebAuthn.enable`, then
`WebAuthn.addVirtualAuthenticator` with a resident-key, user-verifying
internal authenticator that answers every prompt). The spec writes a
`passkeys` row by SQL and gives the authenticator the matching private key
with `WebAuthn.addCredential`, rpID `localhost`, so the sign-in is the
browser's own ceremony against the server's own verification. CDP is
Chromium's alone, so these stories do not run in the audit's WebKit and
Firefox projects.

Story 74 signs in that way, then clears the authenticator's credentials
(`WebAuthn.clearCredentials`) before Add a Passkey: a registration lists the
account's existing keys as excluded, and an authenticator holding one of them
refuses to make another.

#### The audit runs the suite in WebKit, Firefox and as a phone, on demand

(M10.25). CI and `npm run e2e` stay Chromium alone, and the "phone" checks
there are a 375px window; the owner chose on 2026-10-12 that the other two
engines and a real phone profile are an occasional local audit and never a
CI gate, so an engine-specific bug is found before a sign-off rather than
during it, at the cost of one image pull and no CI minutes. The pieces:

- **`playwright-audit`**, a compose service on the `audit` profile
  (`make playwright-audit-up` / `playwright-audit-down` from the host), runs
  `playwright run-server` on Microsoft's `mcr.microsoft.com/playwright`
  image, which carries all three engines, at the tag the lockfile holds for
  `@playwright/test`, kept in step by hand since a runner and a server on
  different versions refuse each other at connect. It is not
  `Docker/Dockerfile.e2e`, which carries Chromium alone (MB.237), and that
  image, `.github/workflows/playwright.yml` and CI's time are untouched.
  `make docker-down` and `docker-rebuild` pass the `audit` profile, so the
  service is not left behind ([`docker.md`](../docker.md)).
- **`PLAYWRIGHT_AUDIT_WS_ENDPOINT`** (`ws://playwright-audit:4444/`) is set
  by the `devcontainer` compose service alone, beside
  `PLAYWRIGHT_WS_ENDPOINT`, and read only under `E2E_AUDIT=1`
  (`tests/e2e/slots.ts`'s `auditWsEndpoint`), by the rule in
  [`debugging.md`](../debugging.md): never baked into an npm script, never
  read unconditionally. Its presence alone changes nothing.
- **The story suite runs there too**: `playwright.stories.config.ts` adds the same
  three projects under the same flag (built by `auditProjects` in
  `playwright.config.ts`, with no `testIgnore`), and `npm run test:stories:audit`
  runs them. The story reporter lists one checklist line per story and counts it
  passing only when its test passed in every project that ran.
- **Three projects, `webkit`, `firefox` and `phone`**, exist in
  `playwright.config.ts` only under `E2E_AUDIT=1`, which without the
  endpoint throws naming the variable. The shared `use` names the Chromium
  server, so each carries its own `connectOptions`; each `testIgnore`s the
  configured-providers and compendium-cache specs, which run on their own
  ports under their own Chromium projects; and none names a `baseURL`, so
  `tests/e2e/fixtures.ts` gives each worker its own slot's server as it does
  the `chromium` project, and `browserUrl` names `devcontainer` for either
  remote server. The phone is Playwright's `iPhone 15` device, touch and
  the mobile viewport included, the oldest in its list whose iOS is on or
  above the browser floor's iOS Safari 17.4 (M10.24). Only `chromium`
  collects coverage, as before.
- **`npm run e2e:audit`** sets `E2E_AUDIT=1` and runs the three projects
  under `flock /tmp/sorrel-e2e.lock` (below). It needs what `npm run e2e`
  needs from the devcontainer: `BETTER_AUTH_SECRET` on the command line, and
  the ports free. A failure it finds becomes its own task, never a fix in the
  PR that ran it; the specs that walk focus by pressing Tab until an element
  is reached (story 1's in `stories/01-accounts.spec.ts`, `coven.spec.ts`,
  `shell.spec.ts`) are the WebKit failures the task expected rather than
  knew; the first audit's PR names what it found.
  The first audit (MB.255) found the session cookie never reaching a WebKit
  page, fixed under "A signed-in browser without a provider", and then three
  test-side gaps, fixed in the same task: `settleTransitions` read WebKit's
  cancelled transition as a failure, `mouse.wheel` does not exist in mobile
  WebKit (the modal-scroll spec skips on the phone profile), and the admin nav
  count assumed a desktop window. It then passed 275 and skipped one.

**Every e2e run from the devcontainer serialises on
`flock /tmp/sorrel-e2e.lock`** (M10.25 writes down what sessions already
did). Two runs collide on `sorrel_e2e_template`, which global setup drops and
rebuilds, even when their ports differ, and a second session's run may be
invisible to `ps`. So a run from a session is
`flock /tmp/sorrel-e2e.lock env BETTER_AUTH_SECRET=… npx playwright test …`;
`npm run e2e:audit` takes the lock itself, and the path is fixed so that
every session takes the same one. Vitest serialises on
`/tmp/sorrel-vitest.lock`, for the same reason: its `db` project shares one
Postgres. `npm run test` and `npm run test:coverage` take that lock
themselves, the same way `e2e:audit` takes its own, so never wrap either of
them, or `e2e:audit`, `test:stories` and `test:stories:audit`, in `flock`:
the outer `flock` holds the lock, the inner one waits for it, and the run
deadlocks forever. A direct `npx vitest run …` takes no lock and still needs
the wrapper: `flock /tmp/sorrel-vitest.lock npx vitest run …`.

### Where a run's time goes (M11.18)

The gate suite, `npm run e2e`, measured in the devcontainer on 16 October
2026: 12 cores, 32 GB, the browser on the `playwright-server` service, 62
tests on 6 workers, from a checkout of `staging` at 2e6be8ba, with no other
test run on the machine (the lock was held for the whole series). A run's
wall time is the time its tests need only when every worker stays busy; this
one takes the time its longest file needs, because that file is serial.

| Measure, median of three runs                              | Cold: the run starts the servers | Warm: the servers are already up |
| ---------------------------------------------------------- | -------------------------------- | -------------------------------- |
| Wall time                                                  | 34.4 s (36.3, 34.4, 33.7)        | 27.3 s (29.5, 27.3, 26.4)        |
| Sum of every test's duration                               | 74 s                             | 73 s                             |
| That work spread evenly over 6 workers                     | 12.4 s                           | 12.2 s                           |
| Longest file, `shell.spec.ts` (17 tests, serial, 1 worker) | 18.4 s                           | 18.4 s                           |
| `next build` with its cache and eight `next start`s        | about 10 s                       | 0 s                              |

"Cold" is the ordinary run: slot 0's `webServer` entry builds, every entry
starts, and the readiness polls pass. The build and the eight servers came
to 10.6 s when started by hand over the cached `.next-e2e`; a first run in a
fresh checkout, with no cache to build from, took 82 s. "Warm" attaches to
servers left running, which `reuseExistingServer: !CI` allows and `npm run e2e:servers` provides (see "Keeping the servers warm" in the slot list above). The warm run's 27 s is 18 s of
`shell.spec.ts` on one worker, with the other five idle behind it, and
about 9 s of startup and teardown: the template seed (1.4 s) and its
eight clones (0.9 s together), Playwright's own start and the worker
processes, and the coverage report at teardown.

What the rest of the suite costs, warm, per file: `admin-compendium.spec.ts`
11.4 s over 5 tests, `account.spec.ts` 10.6 s over 5, `workspace-invitation.spec.ts`
8.1 s over 4, `admin.spec.ts` 7.4 s over 5, and the other eight files 18 s
together. The longest single test is 3.5 s (`account.spec.ts`'s four-section
scan), so once no file is pinned to a worker, no run can be shorter than
startup plus about 4 s, and the even spread above is the floor to aim at.

**Warm servers, measured (M11.18, lever 5).** The same suite after the
servers were left up by `npm run e2e:servers` (all eight answering in 1.0 s
once built), three runs each, median in bold. The machine was not idle this
time: other sessions' runs shared the cores (load average 9 to 16, and every
run waited 85 to 123 s for the lock), so these figures run slower than the
table above and compare with each other, not with it. The warm series also
included one failure, an axe scan that found a page with no `<title>` on
`admin.spec.ts`'s zodiac filter test. MB.265 explained it: a soft navigation
leaves the document without a `<title>` for a moment, and a loaded machine let
the scan run inside that gap. The scan now waits for a title. The same failure
once seen in story 60 was not reproduced, so its cause is unproven; the same
wait covers it.

| Wall time, three runs  | Cold (the run builds and boots) | Warm (servers up)             |
| ---------------------- | ------------------------------- | ----------------------------- |
| `npm run e2e`          | 51.9, 36.5, **45.3** s          | 28.7, 30.9, 25.8 s (**28.7**) |
| `npm run test:stories` | not measured                    | 33.5 s (one run)              |

Median saving about 17 s of 45, more than the 10 s the build and boots cost
on an idle machine, since a loaded one starts eight servers slower.

Three settings were each turned off for one warm run, to see what every
test pays for them:

| Change, one warm run each                           | Wall time | Sum of test durations |
| --------------------------------------------------- | --------- | --------------------- |
| None (the warm median above)                        | 27.3 s    | 73 s                  |
| `video: 'off'`                                      | 25.2 s    | 67 s                  |
| No JS coverage (the `coverageAutoFixture` skipped)  | 23.4 s    | 65 s                  |
| Both                                                | 19.4 s    | 54 s                  |
| `E2E_WORKERS=12`, servers up, everything else as is | 29.8 s    | 104 s                 |

Recording a video of every test and collecting JS coverage after every test
cost about a quarter of the summed test time between them, and the video is
encoded on the browser server, which shares these cores. Twelve workers
bought nothing while one serial file sets the span: every test ran slower
under the extra servers' load, and the critical path is unchanged. CI's side of this is
[`ci/runner-budget.md`](../ci/runner-budget.md), "Where a gate run's time
goes". The levers that shorten the run, one PR each and in order, are the
task's plan,
[`design-decisions/m11.18-plan.md`](../design-decisions/m11.18-plan.md).

**Measuring it again.** Take the lock first and time the run inside it, so
another session's run waits rather than inflating the figure; then read the
per-file sums off the HTML report's embedded JSON (every number above came
from it) with `fflate`, already in `node_modules` as a dependency of the Vitest UI. Three runs, the
median, and say whether the servers were already up.

```sh
cd /app  # or the worktree
(
  flock 9
  time env ENABLE_IMPERSONATION= BETTER_AUTH_SECRET="$(grep -m1 '^BETTER_AUTH_SECRET=' .env.local | cut -d= -f2-)" npx playwright test
) 9>/tmp/sorrel-e2e.lock

node -e '
const fs = require("fs"); const { unzipSync, strFromU8 } = require("fflate");
const html = fs.readFileSync(".reports/playwright-report/index.html", "utf8");
const b64 = html.match(/id="playwrightReportBase64"[^>]*>data:application\/zip;base64,([^<]+)</)[1];
const rep = JSON.parse(strFromU8(unzipSync(Buffer.from(b64, "base64"))["report.json"]));
console.log("wall ms", rep.duration, "tests", rep.stats.total);
for (const f of rep.files.map((f) => [f.fileName, f.tests.length, f.tests.reduce((a, t) => a + t.duration, 0)]).sort((a, b) => b[2] - a[2])) console.log(f.join("\t"));'
```

The story suite (`npm run test:stories`) is the same shape, further along:
one cold run the same day took 99 s for 50 stories (15 more are `fixme`),
233 s of test work whose even spread on 6 workers would be 39 s, with
`07-admin.spec.ts` 78 s on one worker and `08-email-and-admin.spec.ts` 60 s
on another. It writes no HTML report locally, so its per-file sums are read
from the list reporter's `(2.6s)` suffixes instead — run it with
`PW_REPORTER=list`, because under Claude Code (`CLAUDECODE`) the story config
prints dots (M12.37); CI's figures for it are
the runner budget's `stories` row.

**After the serial rule was dropped** (the plan's lever 2, this task's second
PR), the same machine and method, three cold runs each, the servers started
by each run. The gate suite has 59 tests now: the three that only set up a
file's users moved into that file's `beforeAll`.

| Measure, median of three cold runs         | Before             | After                       |
| ------------------------------------------ | ------------------ | --------------------------- |
| Gate suite, wall time                      | 34.4 s             | 28.7 s (28.6, 28.7, 29.3)   |
| Gate suite, sum of every test's duration   | 74 s               | 76 s (74.5, 75.9, 79.3)     |
| `shell.spec.ts`, sum of its tests          | 18.4 s on 1 worker | 22.6 s spread over 6        |
| Story suite, wall time                     | 99 s (one run)     | 41.1 s (39.6, 41.1, 43.4)   |
| Story suite, Playwright's own time         | 96 s               | 40.7 s (39.1, 40.7, 43.0)   |
| Story suite, sum of every story's duration | 233 s              | 153 s (151.3, 153.4, 171.3) |
| `07-admin.spec.ts`, sum of its tests       | 78 s on 1 worker   | 67.4 s spread over 6        |

The story suite more than halved, because its two long files now spread over
every worker instead of setting the span one worker at a time. The gate suite
gained less: its critical path was `shell.spec.ts`, and that file's own time
went up by about 4 s, since its `beforeAll` (a reclone and a sign-in) now
runs once on each of the six workers that come to it rather than once. Its
tests are evenly spread, so the run is now its startup and teardown plus
the even spread of its tests, 12.7 s, and what is left to shorten is the
startup, the teardown, the video and the coverage: the plan's levers 3 to 5.

**After the video went** (lever 3, `video: 'off'` for every run, where CI
already had it off): three pairs of cold gate runs on one tree, video off then
on, each pair back to back, so that whatever else the machine was doing fell on
both sides alike. Another session loaded it throughout (load average 2 to 10),
which is why these absolute figures sit above the table before, and why the
pairs rather than the medians are the evidence. 62 tests, since staging had
grown by then.

| Pair | Video off: wall, sum of test durations | Video on: wall, sum of test durations |
| ---- | -------------------------------------- | ------------------------------------- |
| 1    | 30.3 s, 80 s                           | 32.5 s, 97 s                          |
| 2    | 31.1 s, 87 s                           | 35.6 s, 106 s                         |
| 3    | 34.4 s, 93 s                           | 36.5 s, 100 s                         |

Video off won every pair: a tenth to a sixth of the summed test time (the
single warm run in the variants table said 8%, these said 7% to 17%), and 2
to 4 s of wall. A failing test still leaves its trace and screenshot under
`.reports/test-results/`, checked by failing one on purpose.

**After coverage went behind a switch** (lever 4: JS coverage is collected only
under `E2E_COVERAGE=1`, which `playwright.yml` sets). Two sets of figures, and
they compare within themselves, not with each other, nor with the idle table at
the top of this section.

Set 1, before the reclone fix below: one interleaved pair, coverage off then
on, on a quiet machine, gate suite, 6 workers. Two further pairs were disturbed
by other sessions (lock waits of about 30 s, load near 11) and are not
reported.

| Coverage | Wall time | Sum of test durations |
| -------- | --------- | --------------------- |
| Off      | 27.2 s    | 70.9 s                |
| On       | 32.8 s    | 91.9 s                |

Set 2, after the reclone fix, on a loaded machine, Playwright's own reported
time:

| Coverage                       | Playwright's time                  |
| ------------------------------ | ---------------------------------- |
| Off                            | 39.4, 39.4, 38.1 s (median 39.4 s) |
| On (`E2E_COVERAGE=1`, one run) | 48.9 s                             |

Turning the hooks off exposed a race they had been hiding: the slot
database's reclone killed the server's pooled connections, and the next file
started fast enough to hit a dead one. The slot-databases bullet near the top
of this file explains the warm-up that now follows each reclone.
`.reports/coverage-e2e/` is written only under `E2E_COVERAGE=1`, which
`.github/workflows/playwright.yml` sets.

**Each suite's coverage, and the two merged (M14.28).** Both suites write
`.reports/coverage-e2e/` in CI, including its `raw/` data, and upload it as
`playwright-coverage` (gate) and `playwright-coverage-stories` (stories). Each
suite's PR comment carries its own figure. The `playwright-coverage` job in
`pr-gate.yml` merges whichever of the two ran into a "Playwright Coverage"
comment and the `playwright-coverage-merged` artifact
([`coverage.md`](coverage.md), "The merged report").

**After the worker count changed** (lever 6): the gate suite (`npm run e2e`,
62 tests) and the story suite (`npm run test:stories`, 51 run, 15 `fixme`)
at `E2E_WORKERS` 6, 9 and 12, three runs each, interleaved (6, 9, 12, 6, 9,
12, ...), on the lever 3 harness (video off, coverage still always on). Each
run took the lock first and was timed from holding it; every run is a cold
start, since the server count changes between runs. Two other sessions ran
Vitest and Playwright on the same 12 cores throughout, so the load average at
the start of a run was 11 to 24 and the figures sit well above the earlier
tables; the spread inside one count is as large as the gap between counts, so
read the medians with that in mind. Free memory never fell below 14.6 GB. Wall
times and sums of test durations are from the JSON reporter, which carries
the same figures as the HTML report's embedded JSON.

| Suite, workers | Wall time, median (runs 1, 2, 3) | Sum of test durations, median (runs) | Load at start, runs 1-3 | Failures               |
| -------------- | -------------------------------- | ------------------------------------ | ----------------------- | ---------------------- |
| Gate, 6        | 41.5 s (50.3, 41.5, 38.8)        | 107 s (107, 113, 104)                | 11.1, 15.3, 24.2        | none                   |
| Gate, 9        | 43.1 s (43.1, 43.5, 40.9)        | 141 s (151, 141, 130)                | 15.6, 17.0, 17.0        | none                   |
| Gate, 12       | 50.3 s (46.7, 59.3, 50.3)        | 229 s (176, 337, 229)                | 11.3, 19.4, 15.8        | none                   |
| Stories, 6     | 58.0 s (58.0, 67.1, 47.2)        | 201 s (201, 301, 179)                | 16.0, 13.7, 20.2        | none                   |
| Stories, 9     | 49.8 s (58.0, 49.8, 46.3)        | 263 s (322, 263, 221)                | 14.3, 14.8, 15.7        | none                   |
| Stories, 12    | 64.7 s (64.7, 63.9, 86.4)        | 344 s (344, 332, 665)                | 11.5, 23.0, 19.2        | run 3: 2 failed, below |

Lock waits before the runs ranged from 0 to 202 s and are not in the times.

What it shows. Summed test time rises with the worker count (gate 107 s,
141 s, 229 s), so each test gets slower as slots are added: the cores, or the
browser server sharing them, are the limit, not the number of servers or free
memory. The gate suite gained nothing from 9 (43 s against 41.5 s) and lost
9 s at 12. The story suite was 8 s faster at 9 by median, but its 6 and 9
ranges overlap (47 to 67 s against 46 to 58 s) under this load, so that is
not a difference worth a default. At 12 workers, run 3 of the story suite
timed out two `07-admin.spec.ts` story-18 tests at the 30 s limit (the
compendium entry and the category flows), with a summed test time of 665 s and
the host load at 19; nothing else failed in any run. Memory was not the limit
and nothing swapped; the cores and the browser server were. The default stays
at 6. Whether 9 would win on a quiet machine this series does not settle. It
changes only the local default: CI sets `E2E_WORKERS` itself.

Merged staging, default 6: `npm run e2e` on the merged branch took 41.3 s wall
from holding the lock, with a load average of 6.7 at the start, and passed
all 64 tests (staging had grown since the 62 above). It ran with coverage off,
since the merged harness has coverage behind `E2E_COVERAGE=1`, so it is not
comparable with the 6, 9 and 12 table, which ran with coverage on under load.
