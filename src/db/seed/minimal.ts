import { sql } from 'drizzle-orm';
import type { SeedDatabase } from './index';
// `schema/users` before `audit`, and load-bearing: the two import each other,
// so whichever is entered first sees the other half-initialised. Entered via
// audit.ts, `users` builds its table while `auditColumns` is still undefined,
// the spread contributes nothing, and every insert below silently drops its
// created_by and fails NOT NULL. Every other module under src/db/seed/ orders
// its imports the same way and points here.
import { users } from '../schema/users';
import { applyAudit } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';

// The `minimal` scenario (DESIGN.md §"Seed data"): one admin, one user, empty
// compendium. The bare install every other scenario builds on.
//
// The writes go through the handle `seed()` was given rather than through
// `withAudit` — one of CLAUDE.md rule 3's two identity bootstraps
// (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md).

/** The plain user's fixed id — `…0002`, continuing the bootstrap's `…0001`. */
export const MINIMAL_USER_ID = '00000000-0000-0000-0000-000000000002';

// Typed against the table's own insert model, so `role` is the enum and a
// column renamed in users.ts fails here rather than at the first `db:seed`.
type SeedUser = Pick<typeof users.$inferInsert, 'id' | 'name' | 'email' | 'role'>;

const USER: SeedUser = {
  id: MINIMAL_USER_ID,
  name: 'Seed User',
  email: 'user@seed.sorrelandsalt.com',
  role: 'user',
};

export async function seedMinimal(db: SeedDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    // Published exactly as withAudit publishes it: `set_config` with a bind
    // parameter, transaction-local.
    await tx.execute(sql`select set_config('app.current_user_id', ${BOOTSTRAP_USER_ID}, true)`);

    // Idempotent by fixed id rather than by truncating: a re-run is a no-op on
    // conflict, and nothing is dropped — the reset that drops is M1.24's.
    await insertBootstrapAdmin(tx);

    await tx
      .insert(users)
      .values(applyAudit('insert', USER, BOOTSTRAP_SESSION))
      .onConflictDoNothing({ target: users.id });
  });
}
