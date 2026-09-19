import { sql } from 'drizzle-orm';
import type { SeedDatabase } from './index';
// `schema/users` before `audit`, and load-bearing: the two import each other,
// and entered via audit.ts `users` builds its table while `auditColumns` is
// still undefined, so every insert silently drops `created_by`. Every seed
// module orders its imports this way (claude-docs/db.md, "The seed module").
import { users } from '../schema/users';
import { applyAudit } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';

// The `minimal` scenario: one admin, one user, empty compendium. Writes go
// through the handle `seed()` was given, not `withAudit` — an identity
// bootstrap; see above.

/** `…0002`, continuing the bootstrap's `…0001`. */
export const MINIMAL_USER_ID = '00000000-0000-0000-0000-000000000002';

// Typed against the insert model, so a column renamed in users.ts fails here.
type SeedUser = Pick<typeof users.$inferInsert, 'id' | 'name' | 'email' | 'role'>;

const USER: SeedUser = {
  id: MINIMAL_USER_ID,
  name: 'Seed User',
  email: 'user@seed.sorrelandsalt.com',
  role: 'user',
};

export async function seedMinimal(db: SeedDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    // Published exactly as withAudit publishes it.
    await tx.execute(sql`select set_config('app.current_user_id', ${BOOTSTRAP_USER_ID}, true)`);

    // Idempotent by fixed id, not by truncating: a re-run is a no-op.
    await insertBootstrapAdmin(tx);

    await tx
      .insert(users)
      .values(applyAudit('insert', USER, BOOTSTRAP_SESSION))
      .onConflictDoNothing({ target: users.id });
  });
}
