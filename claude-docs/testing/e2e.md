## E2E — Playwright

`playwright.config.ts` (repo root) runs specs under `tests/e2e/` against a
**production build**, not `next dev`: its one `webServer` entry runs
`scripts/e2e-servers.ts --playwright`, which builds once and then starts every
server together, the first on **8001** (`PORT` env override; `start` defaults to
8000, `next dev`'s port, which an e2e run keeps clear of). The entry is ready
when the script prints `e2e servers ready`. The script attaches to a server it
finds already answering, and skips the build when the first slot's does, except
whenever `CI` is set, so a CI run always builds and starts its own servers.

**A spec proves what only a real server and browser can** (rule 9 of
[`layer-ownership.md`](layer-ownership.md), "What a test may assert"):
navigation and redirects, server render and status codes, cookies, mail,
the data cache, the production build's config, a layout a browser measures,
and one axe scan per page state. It never re-runs a flow a component or
service test proves wholesale (a second filter or CRUD flow on a page
template another spec already drives, which compendium entries hold a
value, a dialog's states), and every admin route keeps its 403 test and one
flow with its scan, even where a lower layer proves that flow too. It asserts
state as Vitest does: a `status`, `alert`, `tooltip`, row or description is
present, or carries the data the action used, and never a page title, a
heading on a plain load or a sentence. A level-1 heading stays where it
identifies the destination a navigation reached, or the 403 page.

**Two suites share this harness.** The story suite, `tests/e2e/stories/`, is
one browser flow per v1 story, run by `npm run test:stories` on
`playwright.stories.config.ts` and in the PR gate's `stories` job. The gate
suite, `tests/e2e/*.spec.ts`, is `npm run e2e`, and the root config ignores
`stories/`. A test names its story with Playwright's tag option,
`test('…', { tag: '@story-6' }, …)`, or an array for several; the tag alone
decides which story a test counts for, and the checklist reads it
([`acceptance.md`](acceptance.md)). Tag a test only when its own steps are the
story's flow; visiting a story's page is not walking it.
`npx playwright test --grep @story-6` runs one story. A gate spec that a story
flow proves is deleted, not kept beside it. The story suite shares the gate
suite's ports (8001 and up) and its lock, `/tmp/sorrel-e2e.lock`, so the two
never run at once on one machine.

**`assertNoAccessibilityViolations(page)` waits for a non-empty title and for
transitions to finish, and for nothing else** (`tests/e2e/axe.ts`): it scans
whatever the page holds at that instant. The title wait is there because a
soft navigation (a filter, a router refresh) removes the `<title>` for a
moment (about 4 ms on a quiet machine, 150 to 360 ms with the CPU throttled
20 to 40 times) while the new rows are already in the page. The swap can also
land between that wait and axe's read, so a scan that reports `document-title`
waits for a title again and scans once more; a page that never has a title
still fails, at the wait. So the last web-first assertion before each scan
must wait for the state being scanned (a dialog visible, a Save enabled, a
status shown, a URL reached), never a negative such as `toHaveCount(0)` on
something that was never there, which passes before the page has rendered
anything. A removal of what was there (a dialog closing, a table emptied by a
filter) does wait.

**One spec per page template also checks the phone width and both themes.**
`assertNoSidewaysScroll(page)` (`tests/e2e/axe.ts`) sets the window to 375px,
the narrowest width a section signs off at, and fails if the page is wider
than the window. A Playwright page is in the light theme unless a spec says
otherwise, while the site's own default is dark, so a spec that scans once has
scanned the light theme only: the template's spec calls
`page.emulateMedia({ colorScheme })` before each of two scans. It is one per
template, not per page, because the frame decides the width and the surfaces
text sits on; the rest of the scans stay single, which keeps the run short.
The template specs are the Welcome test in `smoke.spec.ts`, the 403 test in
`admin.spec.ts`, the account page and unverified email page in
`account.spec.ts`, story 1's sign-in test, `sign-in-configured-providers.spec.ts`
and the privilege ledger's story in `stories/08-email-and-admin.spec.ts`.

### Slots: a server and a database each

**Each worker slot has a server and a database of its own**, as each Vitest
pool slot has a database. A database each, because each spec file reseeds by
dropping its database `WITH (FORCE)`, which would cut a sharing worker's
connections mid-test (that drop may also end an autovacuum worker, which the
test role can do only through the image's `pg_signal_backend` grant,
[`ci/database-image.md`](../ci/database-image.md)). A server each, because the
code under test runs in `next start`, which built its client at boot, so a
database swapped in the Playwright worker would never reach the page
([`ci.md`, "Each Playwright worker slot gets a server, not just a database"](../design-decisions/ci.md#each-playwright-worker-slot-gets-a-server-not-just-a-database)
holds the argument and the two alternatives turned down).

- **The slot is Playwright's `parallelIndex`**: `TEST_PARALLEL_INDEX` inside
  the worker, which `tests/e2e/slots.ts`'s `currentSlot()` reads, throwing
  outside a Playwright worker. It is unique among running workers, and the
  worker that replaces one after a failed test keeps it. The reseed,
  `signInAs()` and `baseURL` each read it, so a retried test's database,
  session and pages agree on one slot.
- **The worker count is `E2E_WORKERS`, not `--workers`**, because the servers
  are declared up front, one per slot. `playwright.config.ts` sets `workers`
  to `E2E_SLOTS`: `E2E_WORKERS` if set, otherwise half the CPUs floored at one
  (6 on 12 cores; 9 and 12 did not beat it, see "Where a run's time goes").
  Anything but a whole number from 1 to `MAX_SLOTS` (99) throws, naming the
  variable. A `--workers` above the count would put a worker on a slot with
  no server, so the worker-scoped auto fixture `slot` in
  `tests/e2e/fixtures.ts` fails every test such a worker runs, naming the
  limit and saying to raise `E2E_WORKERS`.
- **CI sets `E2E_WORKERS: 4`** in `.github/workflows/playwright.yml` on its
  four-vCPU runner. A test spends most of its time waiting on the browser and
  the server, so four workers finish sooner than two even sharing four cores
  with the servers.
- **Slot `n` serves on `8001 + n`, from `sorrel_e2e_<n>`.** The startup script
  builds once with slot 0's environment, then runs `npm run start` for every
  slot at once, each with its own port and `DATABASE_URL`, and waits for every
  port. It starts them together because Playwright starts separate `webServer`
  entries one after another and waits for each. `tests/e2e/fixtures.ts` overrides
  `baseURL` with the slot's server for any project that sets none; there is no
  top-level `use.baseURL`. A further slot costs about half a second and
  180 MB.
- **`E2E_PORT_BASE` moves the whole port block** (a whole number from 1024 to
  65435, or `tests/e2e/slots.ts` throws). It sets the first slot's port
  (default 8001); the configured-providers server sits at base + 99 and the
  cache server at base + 100. It exists because Playwright reuses whatever
  already answers on a slot's port when not on CI: another session's dev
  server on 8001 was silently used as slot 0.

#### Keeping the servers warm

`npm run e2e:servers` builds `.next-e2e` and starts every server a run needs,
from the same definitions as the configs (`tests/e2e/servers.ts`), prints one
line per server and waits; stop it with Ctrl-C. While it is up, `npm run e2e`
and `npm run test:stories` attach to the servers (`reuseExistingServer`, on
whenever `CI` is unset), which skips the build and the boots. Nothing watches
the code, so after a change stop it and start it again, which rebuilds; a run
against servers left over from older code tests that older code. The servers
are shared by every checkout on the machine, because the ports are fixed: a
run from another worktree attaches to them and tests this checkout's build, so
stop them before switching.

### The two extra servers

**The configured-providers server** exists because the sign-in page reads
OAuth credentials per request and its two provider states cannot share a
process. Every slot's server runs with each provider variable set to `''`
(blank rather than absent, because Next never lets `.env.local` override a
variable already set, so a developer's real credentials cannot leak into it).
Started by the same script with the slots', it runs `npm run start` on **8100** with
placeholder credentials for all four providers, against
`sorrel_e2e_providers`, which no spec reseeds. 8100 sits above every slot's
port and the 99-slot cap keeps it there, so no slot can reach or attach to it.
The story config starts neither special server.
Two projects split the specs: `chromium` (everything except
`tests/e2e/sign-in-configured-providers.spec.ts`, against its slot's server)
and `chromium-configured-providers` (that spec alone, against 8100 through its
own `baseURL`). Both run with `reducedMotion: 'reduce'`, set once in the
shared `use`, so an axe scan never samples a colour mid-transition. Only
`chromium` collects JS coverage (`tests/e2e/fixtures.ts`), since the second
project runs the same bundle. Placeholder ids are useless to a real
authorization endpoint, so nothing may click a provider button against 8100;
the spec aborts and fails on any request to `/api/auth/sign-in/`.

**The compendium-cache server** is `npm run start` on **8101** against
`sorrel_e2e_cache`, which no spec reseeds, and the one server whose data cache
holds. Every other sets `NEXT_DATA_CACHE=off`, because its database is
reseeded under it and a cache would not follow. A third project,
`chromium-compendium-cache`, runs `tests/e2e/compendium-cache.spec.ts` alone
against it, and `chromium` ignores that spec
([`db/compendium-cache.md`](../db/compendium-cache.md), "In tests").

### Databases and reseeding

- **`tests/e2e/database.ts`** has the same two-tier shape as the Vitest
  harness, through `tests/support/seeded-database.ts`. `seedE2eTemplate()`
  builds `sorrel_e2e_template` (`sorrel_template` cloned, migrated and
  `standard`-seeded, about 1 s) and `cloneE2eDatabases()` clones every slot's
  `sorrel_e2e_<slot>`, `sorrel_e2e_providers` and `sorrel_e2e_cache` from it,
  tens of milliseconds each. `e2eDatabaseUrl(database)` swaps `DATABASE_URL`'s
  pathname to that database, by default the calling worker's slot's; the
  config passes each server its own as `webServer.env.DATABASE_URL`.
  `recreateE2eDatabase()` re-clones the calling worker's slot database alone,
  then sends its server ten session lookups at once, repeated until all
  answer 200: the drop kills the server's pooled connections and the server
  reads each socket's close only some milliseconds later, and a test's first
  request in that gap writes to a dead socket and gets a 500
  (`CONNECTION_CLOSED`, `EPIPE` or `57P01`). The lookups find the dead
  connections first, and the pool replaces them.
- **`globalSetup: './tests/e2e/global-setup.ts'`** calls `seedE2eTemplate()`
  and then `cloneE2eDatabases()`, once per run. It runs _after_ the servers
  have started, since Playwright sets up the `webServer` entries first, and
  still finishes before any test. So nothing may query a database at server
  boot or on the readiness poll's `GET /`, which on a first run would find none
  ([`ci.md`, "Each Playwright worker slot gets a server, not just a database"](../design-decisions/ci.md#each-playwright-worker-slot-gets-a-server-not-just-a-database),
  "Setup runs after the servers"). `dropE2eTemplate()` removes the template
  again: `global-teardown.ts` drops it after the last spec; the slot and providers databases are left for inspection.
- **No Neon connection anywhere.** `e2eDatabaseUrl()` and `adminUrl()` only
  rewrite the pathname of the ambient `DATABASE_URL`, which points at the local
  `postgres` Docker service exactly as Vitest's does.

#### Reseeding between spec files

Reseeding is each spec file's own `test.beforeAll` calling
`recreateE2eDatabase()` (see `tests/e2e/smoke.spec.ts`), never `src/db/seed`
directly: a clone of the seeded template _is_ the reseed. Playwright runs no
implicit hook for it.

**A file's tests spread across the workers, and `beforeAll` runs on each
worker that comes to the file.** `playwright.config.ts` sets
`fullyParallel: true`, so a worker picking up its share of a file's tests
first reclones its own slot database and builds the file's setup rows there,
and runs that share in file order. That is why a file's setup belongs in
`beforeAll`, never in its first test, which only one worker would run; a test
is independent when it signs in its own user and reads only seed rows, rows its
file's `beforeAll` wrote, or rows it writes itself.

**Serial mode, `test.describe.configure({ mode: 'serial' })`, is the choice
for a file whose tests chain**, each reading what the one before it wrote (a
mailed link one test sends and the next follows, a cache one test warms and the
next reads), and a comment beside the line says which chain. It can sit inside
one `test.describe` block, pinning that block alone. The lint rule
`sorrel/e2e-chained-tests-serial` (`lint/source-sweeps.js`, on for
`tests/e2e/**/*.spec.ts`) holds the rule: it fails a test outside a serial
scope that assigns a variable declared outside it, the one shape every chained
file has, while an assignment in a hook stays legal.

- **Mail is read back from Mailpit.** `tests/e2e/mailpit.ts`'s
  `latestMessageTo(address)` searches Mailpit's REST API at `MAILPIT_URL` for
  the newest message to that address and returns its sender, recipients,
  subject, text and HTML, polling up to ten seconds because the app sends in
  the background of the request that caused it. An optional third argument
  narrows the search to one subject, for a flow that mails one address twice.
  The address goes in quoted: unquoted, Mailpit's query language splits it at a
  `+`. A spec that follows a mailed link gives its recipient a fresh address,
  so a retry or a parallel worker cannot read another's message. A spec asserts
  the recipient and the link, never the subject or body: the wording is the
  email's own test's. Compose and `playwright.yml` both run Mailpit; outside
  them the helper throws on the unset URL rather than reporting that no mail
  arrived.

### Signing in without a provider

#### A signed-in browser without a provider

No spec can finish a real OAuth round trip, so `tests/e2e/session.ts`'s
`signInAs(page, email, providers, role, { emailVerified })` writes what a
Discord sign-in would leave into the calling worker's slot database: a user
stamped as its own creator, holding the site role given (`user` unless the
spec asks for `curator` or `admin`; any role but `user` also holds
`canCreateWorkspace`, which the CHECK demands), verified unless the spec passes
`emailVerified: false` (for a keeper approving an unverified account), one
`accounts` row per provider named, and a session. It then hands the browser the
session cookie Better Auth would have set: the token, a dot, and its base64
HMAC-SHA256 under `BETTER_AUTH_SECRET`, percent-encoded as better-call's
`signCookieValue` does it. The runner and the served build share that secret:
`playwright.yml` and compose set it at job level, and a local run sets it on
the command line, or the helper throws ([`../commands.md`](../commands.md) has
the command). Give each call a fresh address: the email index is unique.
`signInAgainAs(page, userId)` gives the browser a new session for a user
already made.

**The cookie name is plain.** Every e2e server is started with
`E2E_PLAIN_SESSION_COOKIE=true` (`tests/e2e/servers.ts`), which
`src/lib/auth.ts` reads through `plainSessionCookie()`
(`src/lib/e2e-session-cookie.ts`) as `advanced.useSecureCookies: false`. A
production build forces an https base URL, which makes the `__Secure-` prefix
automatic, and no browser sends a `Secure` cookie to the plain-http origin an
e2e browser reaches the server on (such as `devcontainer:<port>`). So the
cookie is `better-auth.session_token`, put in the context's jar with the host
alone (a cookie ignores the port, so any slot's server gets it), which every
engine sends and a followed redirect keeps. The flag does nothing wherever
`VERCEL_ENV` is set (preview and development included), so no deploy can lose
the prefix. Under it `baseURL()` in `src/lib/auth.ts` also gives an e2e server
`http://localhost:<PORT>`, the one plain-http host a browser lets use a
passkey. A `next start` left running from an earlier run keeps its old names
and base URL, so stop it first.

#### A password sign-in in the browser

A password sign-up or sign-in is a real browser post to Better Auth, so two
things about the e2e servers make it work.

- **The breached-password check never reaches the real service.** Every e2e
  server starts with `NODE_OPTIONS=--import tests/e2e/pwned-range-preload.mjs`
  (an absolute path, set in `tests/e2e/servers.ts`). The preload wraps the
  server's `fetch` for `https://api.pwnedpasswords.com/range/` alone and answers
  from `tests/e2e/pwned-range.mjs`: `BREACHED_PASSWORD` is on its list, and
  every other password is not. Every other request passes through. The check
  names the service's URL itself (`src/lib/breached-password.ts`), so the fetch
  is wrapped rather than an address switched by an environment variable in
  production code.
- **The browser's origin is trusted.** A production build trusts only the
  deployed hosts, so Better Auth refuses a post from `localhost:<port>` or
  `devcontainer:<port>` as "Invalid origin". Under the same
  `E2E_PLAIN_SESSION_COOKIE` flag, `e2eTrustedOrigins()`
  (`src/lib/e2e-session-cookie.ts`) adds those two origins for the server's own
  `PORT` as `trustedOrigins`. It gives none wherever `VERCEL_ENV` is set, or
  without the flag; `tests/lib/e2e-session-cookie.test.ts` pins both.
- **A mailed reset link redirects to the production host.** Better Auth builds
  the redirect from its `baseURL`, which falls back to the production host for
  an origin it does not know. Story 71 therefore follows the link with
  `maxRedirects: 0`, reads the `Location` header, and opens its path and query
  on the slot's own server.

The flow, story 70, is `tests/e2e/stories/16-password.spec.ts`
([`auth/passwords.md`](../auth/passwords.md)).

#### Passkeys

A browser offers WebAuthn only in a secure context, and the one plain-http
host that counts as one is `localhost`. Every other spec reaches its slot
server at `devcontainer:<port>` when the browser is remote, where
`PublicKeyCredential` is undefined. So the passkey stories
(`73-passkeys.spec.ts` and `74-passkeys-on-the-account-page.spec.ts`, sharing
`passkeys-setup.ts`) reach their slot server at `localhost` in two ways:

- **The browser.** Each spec connects to the browser server with
  `exposeNetwork: '<loopback>'`, which routes the remote browser's `localhost`
  back to the runner, and overrides the `baseURL` fixture with
  `serverUrl(slotPort(slot))`.
- **The server.** The passkey plugin takes its relying party (rpID) and
  expected origin from the base URL, so `baseURL()` gives an e2e server the
  fixed `http://localhost:<PORT>` under `plainSessionCookie()` (above).

The passkey itself is held by Chromium's virtual authenticator, added through a
CDP session (`WebAuthn.enable`, then `WebAuthn.addVirtualAuthenticator` with a
resident-key, user-verifying internal authenticator that answers every
prompt). The spec writes a `passkeys` row by SQL and gives the authenticator
the matching private key with `WebAuthn.addCredential`, rpID `localhost`, so
the sign-in is the browser's own ceremony against the server's own
verification. CDP is Chromium's alone, so these stories do not run in the
audit's WebKit and Firefox projects. Story 74 signs in that way, then clears
the authenticator's credentials (`WebAuthn.clearCredentials`) before Add a
Passkey: a registration lists the account's existing keys as excluded, and an
authenticator holding one of them refuses to make another.

### Build, cache and environment

- **`next.config.ts`'s `distDir`** reads `NEXT_DIST_DIR`, defaulting to
  `.next`. `webServer.env` sets it to `.next-e2e` so a concurrent `next dev` on
  8000 never shares, and cannot corrupt, the production build e2e serves.
- **CI restores `.next-e2e/cache` before the build**: `playwright.yml`'s
  `actions/cache/restore` step, keyed `nextjs-e2e` on the lockfile and the
  source hashes, falling back to the newest entry for the same lockfile. The
  build runs inside `npm run e2e`, in the `webServer` entry's startup script, so the
  restore has to come before that step; Turbopack's persistent cache under it
  is what a warm build reuses. The e2e image is Debian's, whose GNU `tar`
  `actions/cache` needs. It carries no `zstd`, so the cache is gzip: the
  compression is part of a cache entry's version, so adding `zstd` would miss
  every entry saved without it.
- **The cache a pull request restores is saved on `staging`.** GitHub lets a
  run restore caches saved on its own branch, on `main`, or on a pull request's
  base branch, and a pull request's own run saves under its merge ref, which
  only that pull request's later runs can read (GitHub Docs, "Dependency
  caching reference", "Restrictions for accessing a cache").
  `.github/workflows/e2e-cache.yml` fills the gap: on a push to `staging` that
  touches what the build compiles or runs under, it calls `playwright.yml` with
  `build-only: true`, which adds `--grep-invert . --pass-with-no-tests` to
  `npm run e2e`. Every test title matches `.`, so no spec runs, but Playwright
  starts its `webServer` entry before it loads a spec, so the startup script still runs
  `npm run build`, and an `actions/cache/save` step after it saves
  `/app/.next-e2e/cache` under the restore step's key. Because it is the same
  workflow, the warm build has the pull request's image, path, build directory
  and environment, and the same key. The proof is a pull request's run logging
  `Cache restored from key`. The cost is in
  [`ci/runner-budget.md`](../ci/runner-budget.md).
- **A pull request's run restores and never saves.** Restore and save are two
  steps, `actions/cache/restore` and `actions/cache/save`, because a single
  `actions/cache` saves at the end of any job whose exact key missed, which on
  a pull request is nearly every push (150–240 MB, uploaded after the tests, on
  the gate's critical path). The save step runs only under `build-only`, only
  when the build succeeded (it has no `always()`), and only when the restore
  was not an exact hit.
- **`next.config.ts`'s `experimental.isrFlushToDisk`** is off when
  `NEXT_ISR_FLUSH_TO_DISK` is `'false'`, which every e2e server sets, so each
  server keeps whatever data cache it has (the compendium read's
  `unstable_cache`, CLAUDE.md rule 6) in its own memory. The servers share one
  `.next-e2e` build, and a cache flushed to disk there would hand one slot's
  compendium to another. It also stops runtime ISR writes and the image
  optimiser's disk cache, and it is off on Vercel anyway
  ([`ci.md`, "Each Playwright worker slot gets a server, not just a database"](../design-decisions/ci.md#each-playwright-worker-slot-gets-a-server-not-just-a-database),
  "The data cache is per server too").
- **`next.config.ts`'s `cacheMaxMemorySize`** is 0 when `NEXT_DATA_CACHE` is
  `'off'`, which every e2e server but the compendium-cache server sets, so with
  nothing flushed to disk either, their data cache holds nothing and every
  `unstable_cache` read reaches the slot's database
  ([`db/compendium-cache.md`](../db/compendium-cache.md), "In tests").
- **The browser may be remote.** `PLAYWRIGHT_WS_ENDPOINT` is set by the
  `devcontainer` compose service alone. When it is present,
  `playwright.config.ts` passes it as `connectOptions.wsEndpoint`, and every
  `baseURL` becomes `http://devcontainer:<port>` (the slot's server's port,
  8100 for the configured-providers project or 8101 for the compendium-cache
  one; `tests/e2e/slots.ts`'s `browserUrl`), since a remote browser cannot
  resolve the runner's `localhost`. `devcontainer.json` forwards 8001 alone, for
  opening slot 0's server from the host. `webServer.url`'s readiness poll
  deliberately stays on `localhost`, because that poll runs in the runner's own
  process wherever the browser lives. Why the browser moves at all, why the
  variable must not be set more broadly, and the full setup:
  [`debugging.md`](debugging.md).

`npm run e2e` (`playwright test`) runs the suite; `E2E_WORKERS=<n> npm run e2e`
runs it on `n` workers, and so `n` slot servers. Browser binaries
(`npx playwright install chromium`) are a one-time local step. CI does not use
`build-image.yml`'s shared `testing` image for this: that image is
Alpine/musl-based and excludes Playwright's browser and system deps
(`Docker/Dockerfile.node`'s header comment; Playwright's Chromium has no
official musl support). `.github/workflows/playwright.yml` runs in a dedicated
image, `Docker/Dockerfile.e2e`, published by `build-e2e-image.yml`
([`ci/reusable-checks.md`](../ci/reusable-checks.md)).
`Docker/docker-compose.yaml`'s opt-in `e2e` service (`make docker-e2e`) builds
that same image for local use.

**The e2e image is Debian with Chromium alone.** It is built on
`node:26.6.0-bookworm-slim`, the same Node as `Dockerfile.node`. After
`npm ci`, the lockfile's own `@playwright/test` runs
`playwright install --with-deps --only-shell chromium`, so the browser always
matches the package. `--only-shell` takes the headless shell alone, which is
what a headless run launches; the `headed` stage adds the full Chromium for
`playwright-server`'s display. The browsers sit in `/ms-playwright`
(`PLAYWRIGHT_BROWSERS_PATH`) rather than under `$HOME`, because a GitHub
container job sets `HOME` to a directory the image never saw.

### The audit runs the suite in WebKit, Firefox and as a phone, on demand

CI and `npm run e2e` stay Chromium alone, and the "phone" checks there are a
375px window. The other two engines and a real phone profile are an occasional
local audit and never a CI gate, so an engine-specific bug is found before a
sign-off rather than during it, at the cost of one image pull and no CI minutes.

- **`playwright-audit`**, a compose service on the `audit` profile
  (`make playwright-audit-up` / `playwright-audit-down` from the host), runs
  `playwright run-server` on Microsoft's `mcr.microsoft.com/playwright` image,
  which carries all three engines, at the tag the lockfile holds for
  `@playwright/test`, kept in step by hand since a runner and a server on
  different versions refuse each other at connect. It is not
  `Docker/Dockerfile.e2e`, and that image, `playwright.yml` and CI's time are
  untouched. `make docker-down` and `docker-rebuild` pass the `audit` profile,
  so the service is not left behind ([`docker.md`](../docker.md)).
- **`PLAYWRIGHT_AUDIT_WS_ENDPOINT`** (`ws://playwright-audit:4444/`) is set by
  the `devcontainer` compose service alone, beside `PLAYWRIGHT_WS_ENDPOINT`, and
  read only under `E2E_AUDIT=1` (`tests/e2e/slots.ts`'s `auditWsEndpoint`), by
  the rule in [`debugging.md`](debugging.md): never baked into an npm script,
  never read unconditionally.
- **Three projects, `webkit`, `firefox` and `phone`**, exist in
  `playwright.config.ts` only under `E2E_AUDIT=1`, which without the endpoint
  throws naming the variable. The shared `use` names the Chromium server, so
  each carries its own `connectOptions`; each `testIgnore`s the
  configured-providers and compendium-cache specs, which run on their own ports
  under their own Chromium projects; and none names a `baseURL`, so
  `tests/e2e/fixtures.ts` gives each worker its own slot's server and
  `browserUrl` names `devcontainer` for either remote server. The phone is
  Playwright's `iPhone 15` device, touch and the mobile viewport included, the
  oldest in its list whose iOS is on or above the browser floor's iOS Safari
  17.4. Only `chromium` collects coverage.
- **The story suite runs there too**: `playwright.stories.config.ts` adds the
  same three projects under the same flag (built by `auditProjects` in
  `playwright.config.ts`, with no `testIgnore`), and `npm run test:stories:audit`
  runs them. The story reporter counts a story passing only when its test
  passed in every project that ran.
- **`npm run e2e:audit`** sets `E2E_AUDIT=1` and runs the three projects under
  `flock /tmp/sorrel-e2e.lock`. It needs what `npm run e2e` needs from the
  devcontainer: `BETTER_AUTH_SECRET` on the command line, and the ports free. A
  failure it finds becomes its own task, never a fix in the PR that ran it. The
  specs that walk focus by pressing Tab until an element is reached (story 1's
  in `stories/01-accounts.spec.ts`, `coven.spec.ts`, `shell.spec.ts`) are the
  likeliest WebKit failures. Known engine differences: WebKit reads a cancelled
  transition as a failure in `settleTransitions`, `mouse.wheel` does not exist
  in mobile WebKit (the modal-scroll spec skips on the phone profile), and the
  admin nav count depends on window width.

### Locks

**Every e2e run from the devcontainer serialises on
`flock /tmp/sorrel-e2e.lock`.** Two runs collide on `sorrel_e2e_template`,
which global setup drops and rebuilds, and on the slot databases, which it
recreates on every run, even when their ports differ, and a
second session's run may be invisible to `ps`. So a run from a session is
`flock /tmp/sorrel-e2e.lock env BETTER_AUTH_SECRET=local-dev-not-a-real-secret npx playwright test …`;
`npm run e2e:audit` takes the lock itself, and the path is fixed so that every
session takes the same one. Vitest serialises on `/tmp/sorrel-vitest.lock`, for
the same reason: its `db` project shares one Postgres. `npm run test` and
`npm run test:coverage` take that lock themselves, the same way `e2e:audit`,
`test:stories` and `test:stories:audit` take theirs, all through
`scripts/with-lock.sh`. That wrapper skips the lock when a parent process
already holds it, so wrapping one of them in `flock` by mistake runs instead of
deadlocking. A direct `npx vitest run …` takes no lock and still needs the
wrapper: `scripts/with-lock.sh /tmp/sorrel-vitest.lock npx vitest run …`.

### Where a run's time goes

The gate suite (`npm run e2e`, about 60 tests on 6 workers) takes about 27 s
with the servers already up and about 34 s when the run starts them, on a quiet
12-core machine. Its wall time is the time of its longest serial file, plus
about 9 s of startup and teardown (the template seed, eight database clones,
Playwright's own start and the coverage report). The story suite
(`npm run test:stories`) takes about 41 s on 6 workers. Both are measured with
the lock held, three runs, the median.

- **Cold or warm.** A cold run builds and starts the eight servers (about 10 s
  over the cached `.next-e2e`; a first run in a fresh checkout takes about
  80 s). A warm run attaches to servers left up by `npm run e2e:servers`
  ("Keeping the servers warm", above) and saves about 17 s of 45 on a loaded
  machine.
- **Serial files.** A serial file pins one worker for its whole length. Tests in
  a file are independent, with their setup in `beforeAll`, so the files spread
  over every worker; the `e2e-chained-tests-serial` lint rule enforces it.
- **Video is off** for every run. It cost 7% to 17% of summed test time, and a
  failing test still leaves its trace and screenshot under
  `.reports/test-results/`.
- **JS coverage is collected only under `E2E_COVERAGE=1`**, which
  `playwright.yml` sets. It cost about a quarter of summed test time.
  `.reports/coverage-e2e/` is written only under it.
- **Workers.** The default is 6. At 9 the gate suite gained nothing and at 12 it
  lost about 9 s, because summed test time rises with the worker count: the
  cores and the browser server that shares them are the limit, not memory. At
  12 workers two admin stories timed out at the 30 s limit. The setting changes
  only the local default; CI sets `E2E_WORKERS` itself.

CI's side of this is [`ci/runner-budget.md`](../ci/runner-budget.md), "Where a
gate run's time goes". The levers, in order, are in
[`ci.md`, "Faster Playwright runs on the same CPU and RAM"](../design-decisions/ci.md#faster-playwright-runs-on-the-same-cpu-and-ram).

**Measuring it again.** Take the lock first and time the run inside it, so
another session's run waits rather than inflating the figure; then read the
per-file sums off the HTML report's embedded JSON with `fflate`, already in
`node_modules` as a dependency of the Vitest UI. Three runs, the median, and
say whether the servers were already up.

```sh
cd /app  # or the worktree
(
  flock 9
  time env BETTER_AUTH_SECRET=local-dev-not-a-real-secret npx playwright test
) 9>/tmp/sorrel-e2e.lock

node -e '
const fs = require("fs"); const { unzipSync, strFromU8 } = require("fflate");
const html = fs.readFileSync(".reports/playwright-report/index.html", "utf8");
const b64 = html.match(/id="playwrightReportBase64"[^>]*>data:application\/zip;base64,([^<]+)</)[1];
const rep = JSON.parse(strFromU8(unzipSync(Buffer.from(b64, "base64"))["report.json"]));
console.log("wall ms", rep.duration, "tests", rep.stats.total);
for (const f of rep.files.map((f) => [f.fileName, f.tests.length, f.tests.reduce((a, t) => a + t.duration, 0)]).sort((a, b) => b[2] - a[2])) console.log(f.join("\t"));'
```

The story suite writes no HTML report locally, so read its per-file sums from
the list reporter's `(2.6s)` suffixes instead. Run it with `PW_REPORTER=list`,
because under Claude Code (`CLAUDECODE`) the story config prints dots. CI's
figures for it are the runner budget's `stories` row.

**Each suite's coverage, and the two merged.** Both suites write
`.reports/coverage-e2e/` in CI, including its `raw/` data, and upload it as
`playwright-coverage` (gate) and `playwright-coverage-stories` (stories). Each
suite's section of the Playwright comment carries its own figure. The
`playwright-coverage` job in `pr-gate.yml` merges whichever of the two ran
into that comment's Coverage section and the `playwright-coverage-merged` artifact
([`coverage.md`](coverage.md), "The merged report").
