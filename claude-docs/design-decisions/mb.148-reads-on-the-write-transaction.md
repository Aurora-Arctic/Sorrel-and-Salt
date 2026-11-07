# MB.148 — Reads on the write transaction

**Decided:** `withAudit` publishes its transaction through an `AsyncLocalStorage`, and `selectFrom` runs on that transaction when one is present and on the bare client otherwise. No finder's signature changes and a service gets no handle to the transaction. The summary is [`db/write-path.md`](../db/write-path.md), "Reads inside a write".

## The cycle being closed

`withAudit` opens a transaction and hands its callback a writer bound to it. A finder called inside the callback went through `selectFrom` on the bare client, which takes a second pool connection. With such a read in flight, an `ALTER TABLE` queued behind the open transaction blocks the read, and the read blocks the commit the `ALTER` waits for. Postgres cannot detect the cycle, because one leg is the application waiting rather than a lock, and nothing here sets a timeout. The same cycle hangs a test's `truncate` behind an unfinished write. Three reads did this, all in `src/modules/ingredients/services/ingredient-rows.ts`: the current rows `replaceFolkNames` and `replaceSubstitutes` diff against, and `refuseUnlinkable`'s link check.

A read on a fresh connection also finds `app.current_user_id` unset. Under the deferred row-level security policies ([`mb.24-rls-role-split.md`](mb.24-rls-role-split.md)) every read inside a write would answer nothing, which is the re-audit of write paths that publishing the setting early (M1.19) was meant to spare.

## Why a context-bound store

The alternative is an explicit reader on the writer. It takes one of two forms, and both cost more than they buy:

- **A parameter on every finder** for a transaction to run on, which grows every finder's signature for three call sites.
- **The finder surface duplicated on `AuditWriter`**, which grows the writer, whose method count `write.test.ts` pins.

The store is held in `src/db/repository/unit-of-work.ts`, which exports a getter and a runner and never the store. Only `write.ts` and `select.ts` import it, and only `withAudit` calls the runner, with `run` and never `enterWith`, so the context ends with the callback. `tests/guards/unit-of-work.test.ts` pins all of that. A service still cannot reach the transaction, so no write can skip `applyAudit`.

## The cheaper fix, not taken

Read the current rows before the transaction opens, as the repository does elsewhere with the unique index arbitrating a race. It loses read-your-own-writes, since a read cannot see the write's earlier statements. It also keeps the diff racy: the rows can change between the read and the write.

## MB.29's line, read correctly

MB.29 retired the read-side `withViewer` wrapper, and DESIGN.md §14's row says reads open no transaction "to carry identity". That means a read carries identity in the `Membership` proof and opens no transaction of its own. It does not mean a read never joins one. CLAUDE.md rule 3 now reads "Reads open no transaction of their own", and §14's row says the same.

## The savepoint for similarity thresholds

A similarity read sets `pg_trgm.similarity_threshold` and `pg_trgm.word_similarity_threshold` with `set_config(…, true)`, so they end with the transaction that set them. Outside a write that is a transaction opened for the read. Inside a write, ending the write's own transaction is not on offer, and leaving the thresholds set would carry them into the write's later statements. So the read runs in a savepoint (`tx.transaction`) on the write's transaction: the thresholds end when the savepoint releases, and a write holding one still rolls back whole when its callback throws. [`db/fuzzy-matching.md`](../db/fuzzy-matching.md) has the thresholds.

## Not changed

Locked reads (`lockIn`) already take the writer's transaction explicitly and are untouched. `existsIn` only builds SQL. `passkeys.ts`, `sign-in-failures.ts` and `provisional-users.ts` keep their exemption to use the bare client, as they write or read outside `withAudit`.
