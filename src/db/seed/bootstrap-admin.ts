// `schema/users` before `audit`, and load-bearing: the two import each other,
// so whichever is entered first sees the other half-initialised. See the same
// note in minimal.ts for what breaks when the order is reversed.
import { users } from '../schema/users';
import { applyAudit, type AuditSession } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { SeedTransaction } from './index';

// M4.3 lifted this out of minimal.ts, where M1.21 first wrote it. Every seeded
// row needs a creator — `created_by` and `updated_by` are NOT NULL and point
// at `users.id` — so the bootstrap admin is a precondition of *any* seed, not
// a detail of the `minimal` scenario. The category seed runs on its own, in
// production and staging as well as in Docker, and cannot assume `minimal`
// went first.
//
// It is one of the two identity bootstraps CLAUDE.md rule 3 allows outside
// `withAudit`: there is no session to hand over, because this row is how the
// acting identity comes to exist. It stamps itself as its own creator, which
// Postgres accepts because foreign keys are checked at statement end rather
// than per row (src/db/bootstrap.ts).

/** The columns a seeded user names, typed against the table's own insert model. */
type SeedUser = Pick<typeof users.$inferInsert, 'id' | 'name' | 'email' | 'role'>;

export const BOOTSTRAP_ADMIN: SeedUser = {
  id: BOOTSTRAP_USER_ID,
  name: 'Bootstrap Admin',
  email: 'admin@seed.sorrelandsalt.com',
  role: 'admin',
};

/** The bootstrap user acts for every seed, including its own insert. */
export const BOOTSTRAP_SESSION: AuditSession = { userId: BOOTSTRAP_USER_ID };

/**
 * Inserts the bootstrap admin if it is not already there. Idempotent by its
 * fixed id rather than by truncating, so a seed pointed at a database that
 * already holds it adds nothing and overwrites nothing.
 */
export async function insertBootstrapAdmin(tx: SeedTransaction): Promise<void> {
  await tx
    .insert(users)
    .values(applyAudit('insert', BOOTSTRAP_ADMIN, BOOTSTRAP_SESSION))
    .onConflictDoNothing({ target: users.id });
}
