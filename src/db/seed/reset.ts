import { sql } from 'drizzle-orm';
import type { SeedDatabase } from './index';

// M1.24 — the drop half of `npm run db:reset`.
//
// `db:reset` was `db:migrate && db:seed` from M1.3 onward, which resets
// nothing: drizzle-kit skips every migration its journal records as applied,
// so a database wedged half-way through one stays wedged, and the seed lands
// on whatever survived. The reset a developer actually wants is "put it back
// to empty and build it again", and that needs a drop.
//
// It lives beside the seed rather than in a script of its own for the reason
// scripts/db-seed.ts gives: reaching the database from a script means
// importing the client, and that exemption set is four files pinned by
// tests/guards/lint-db-client-boundary.test.ts. A fifth is a decision, and
// "the reset needed somewhere to live" is not one worth making. Here it takes
// the handle it is given, exactly as `seed(db, …)` does.

/**
 * Everything this database's schema is, removed — application tables, enum
 * types, functions, triggers and drizzle-kit's migration journal — leaving an
 * empty `public` schema for the migrations to land in again.
 *
 * Two schemas, and both matter:
 *
 *   - **`public`** holds the tables, the enums, `set_updated_at()` and the
 *     `pg_trgm` extension. `CASCADE` is what makes this work from a broken
 *     state: it does not care which of those exist or how they reference each
 *     other. Migration `0000_enable-extensions` puts pg_trgm back, which is
 *     why the reset is drop *then* migrate and never a drop on its own.
 *   - **`drizzle`** holds `__drizzle_migrations`. Leave it and `db:migrate`
 *     reads every migration as already applied and does nothing — the schema
 *     would stay empty and the seed would fail on tables that are gone.
 *
 * `IF EXISTS` on both, so a database already missing one (the state a reset
 * interrupted half-way leaves) is a no-op rather than an error.
 */
export async function dropSchema(db: SeedDatabase): Promise<void> {
  // One transaction, for two reasons beyond atomicity. Postgres runs DDL
  // transactionally, so a drop that fails half-way leaves the database as it
  // was rather than in a second broken state the reset would then have to
  // escape; and `SET LOCAL` only reaches the statements that follow it on the
  // *same* connection, which a pooled `db.execute` does not promise.
  await db.transaction(async (tx) => {
    // `DROP ... CASCADE` emits one NOTICE per dependent object — around thirty
    // by Wave 4, each rendered by postgres-js as a multi-line object that
    // reads like a stack trace. Suppressing them at the server is what makes
    // `npm run db:reset` look like it worked. A constant, not a value from
    // anywhere, so `SET LOCAL` is safe here in a way it is not for the audit
    // GUC (CLAUDE.md rule 3).
    await tx.execute(sql`set local client_min_messages = warning`);

    await tx.execute(sql`drop schema if exists drizzle cascade`);
    await tx.execute(sql`drop schema if exists public cascade`);
    await tx.execute(sql`create schema public`);
  });
}
