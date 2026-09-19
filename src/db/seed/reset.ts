import { sql } from 'drizzle-orm';
import type { SeedDatabase } from './index';

// The drop half of `db:reset`: drizzle-kit skips every migration its journal
// records as applied, so migrate-then-seed resets nothing. Beside the seed so
// the client exemption set stays at four, taking the handle it is given.

/**
 * Drops `public` (tables, enums, `set_updated_at()`, pg_trgm — migration 0000
 * puts the extension back, so a drop is always followed by migrate) and
 * `drizzle` (the migration journal — left in place, `db:migrate` would treat
 * every migration as applied and do nothing). `IF EXISTS` on both, so an
 * interrupted reset is a no-op rather than an error.
 */
export async function dropSchema(db: SeedDatabase): Promise<void> {
  // One transaction: DDL is transactional, so a half-failed drop leaves the
  // database as it was; and `SET LOCAL` reaches only the statements on the
  // same connection.
  await db.transaction(async (tx) => {
    // Silences the one NOTICE per dependent object that CASCADE emits. A
    // constant, so `SET LOCAL` is safe here as it is not for the audit GUC.
    await tx.execute(sql`set local client_min_messages = warning`);

    await tx.execute(sql`drop schema if exists drizzle cascade`);
    await tx.execute(sql`drop schema if exists public cascade`);
    await tx.execute(sql`create schema public`);
  });
}
