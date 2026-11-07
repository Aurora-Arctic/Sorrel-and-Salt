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

## Decided

**A server per slot, declared up front**, the owner's choice.

The shape it took is [`testing/e2e.md`](../testing/e2e.md)'s; what follows is
why each part has the form it does.

- **`tests/e2e/slots.ts` holds the count and the ports**, and the count
  defaults to what a `workers` left unset would have given, so the switch
  from `--workers` changes nothing for a run that never set one.
- **The slot is `parallelIndex`**, read by a worker-scoped auto fixture, so a
  worker past the last server fails every test it runs — one that opens no
  page included — rather than reaching for a server nothing started.
- **Retries stay on one slot**, because the worker that replaces a failed one
  keeps its `parallelIndex`, and the reseed, the session and the pages all
  read it.
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
