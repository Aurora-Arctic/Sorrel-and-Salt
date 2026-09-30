# MB.112 — Each Playwright worker slot gets a server, not just a database

**Status:** decided · **Date:** 2026-09-30

MB.112 was minted during M5.4, which held the e2e suite to one worker: every
server read one `sorrel_e2e`, and a spec file's reseed drops its database
`WITH (FORCE)`, so a reseed on a second worker cut the first's connections
mid-test, and two files starting together raced the same `CREATE DATABASE`.
Vitest has no such problem, because each pool slot clones a database of its
own. The owner asked the obvious question: can each Playwright worker just
swap `DATABASE_URL` in its setup, as Vitest does?

## Why a database each is not enough

Because the code under test runs somewhere else. In Vitest it runs in the
worker's own process: `tests/support/db-setup.ts` sets `DATABASE_URL` before
anything imports `src/db/connection.ts`, which builds its client at import,
so everything a test calls reads the worker's database. In Playwright the
worker runs only the spec and drives the browser; the app runs in
`next start`, which built its client from `DATABASE_URL` once, at boot.
Swapping the variable in the worker moves only what runs there —
`recreateE2eDatabase()` and `signInAs()` — so the worker would seed and sign
in to its own database while the page it opened read the server's. A
database per worker needs something on the server's side to match it.

## The options

### A server per slot, declared up front

`webServer` is an array, and Playwright starts its entries one after another
before any worker exists. Slot 0's entry builds and serves on 8001; each
further slot's runs `npm run start` over that build on `8001 + slot`,
against `sorrel_e2e_<slot>`. Measured in the devcontainer: one more
`next start` over the built `.next-e2e` answers in about 0.5 s and holds
about 180 MB resident, and since the entries start in turn, each slot adds
about half a second to startup.

The cost is that the worker count has to be known when the config loads, so
it becomes a config value — `E2E_WORKERS` — rather than `--workers`, and a
worker past it has to fail rather than find no server.

### A server each worker starts for itself

A worker-scoped fixture could start `next start` on `8001 + parallelIndex`
and stop it when the worker ends, with no count fixed in advance. But
Playwright replaces a worker after every failed test, and worker fixtures
die with it, so every failed test reboots a server. A worker
that crashes rather than exits can leave its server running on the port the
slot's next worker needs. And the harness would take over what `webServer`
does now: polling for readiness, carrying the server's output, and
`reuseExistingServer` for a local run against servers already up.

### One server, choosing its database per request

The browser could send its slot in a header and the one server pick the
database from it. That puts a database switch controlled by the request into
`src/db/connection.ts`, which would have to read Next's request headers:
test-only behaviour in the module every query passes through. And it does
not keep the slots apart where the app caches: M8.6's compendium read sits
under `unstable_cache`, keyed by nothing request-specific, so one process
would serve one slot's cached compendium to every slot.

## Decided

**A server per slot, declared up front**, the owner's choice.

- **`tests/e2e/slots.ts` holds the count and the ports.** `E2E_SLOTS` is
  `E2E_WORKERS`, or else half the CPUs floored at one — Playwright's own
  default, which a `workers` left unset would have given, and two on CI's
  four-vCPU runner. Anything but a whole number from 1 to `MAX_SLOTS` (99)
  throws, naming the variable.
- **The slot is `parallelIndex`.** `currentSlot()` reads
  `TEST_PARALLEL_INDEX`, and throws outside a Playwright worker or past the
  last server, naming the limit and saying to raise `E2E_WORKERS` rather
  than pass `--workers`. A worker-scoped auto fixture reads it, so every
  test on a worker without a server fails, including one that opens no page.
- **Retries stay on one slot.** The reseed, `signInAs()` and the `baseURL`
  fixture each read the same `TEST_PARALLEL_INDEX`, and the worker that
  replaces a failed one keeps its `parallelIndex`, so a retried test's
  database, session and pages always agree.
- **The configured-providers server takes 8100 and `sorrel_e2e_providers`**,
  which no spec reseeds. A fixed port above every slot's, with the 99-slot
  cap keeping the slots below it, means no slot reaches it — or, under a
  local `reuseExistingServer`, silently attaches to it, which a port counted
  on from the last slot would do whenever `E2E_WORKERS` rose between runs.
- **`devcontainer.json` still forwards 8001 alone.** The other ports are
  reached inside the compose network, which is where the remote browser runs.

## The data cache is per server too

Several servers over one build share the build directory, and one thing in
it is written at runtime. Next flushes its data cache — `unstable_cache`, the
compendium's — to `.next-e2e/cache/fetch-cache` and reads it back on a
memory miss, while `revalidateTag` reaches only its own process. Shared on
disk, one slot's server would serve another slot's cached compendium.
`next.config.ts` sets `experimental.isrFlushToDisk` from
`NEXT_ISR_FLUSH_TO_DISK`, which every e2e server sets to `'false'`, so each
keeps its data cache in its own memory. The flag also gates runtime ISR
writes and the image optimiser's disk cache; pages prerendered at build are
still read from disk. On Vercel it is off whatever the config says — Next's
build passes `false` under `hasNextSupport`, and a server in minimal mode
never flushes — so turning it off here moves e2e towards production rather
than away from it.

## Setup runs after the servers

This repo's comments and `testing.md` said `globalSetup` ran before
`webServer` started. In Playwright 1.63 it does not: the runner's
`createGlobalSetupTasks` orders plugin setup — the `webServer` entries —
ahead of the global setups, and a throwaway config logged its server about
100 ms before its `globalSetup` ran. So `global-setup.ts` clones the slot
databases after the servers have booted, and before any test. That is enough
only because postgres.js connects on its first query, and the readiness
poll's `GET /`, carrying no session cookie, reads no database.

## What this rules out

- **`--workers` above `E2E_WORKERS`.** It fails, by design, rather than
  putting a worker on a port and a database nothing started.
- **A query at server boot, or in the readiness poll's path.** On a first
  run the slot databases do not exist until setup, which runs after the
  servers; such a query would need the databases cloned some other way first.
- **Request-controlled database selection in `src/db/connection.ts`.**
