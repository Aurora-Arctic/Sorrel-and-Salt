// `schema/users` before `audit`, and load-bearing — see minimal.ts.
import { users } from '../schema/users';
import { applyAudit, type AuditSession } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { SeedTransaction } from './index';

// Every seeded row needs a creator — `created_by`/`updated_by` are NOT NULL
// and point at `users.id` — so the bootstrap admin is a precondition of *any*
// seed, not a detail of `minimal`: the category seed runs on its own, in
// production and staging, and cannot assume `minimal` went first.
//
// It is one of CLAUDE.md rule 3's two identity bootstraps, stamping itself as
// its own creator (src/db/bootstrap.ts).

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
 * Idempotent by fixed id: a seed run against a database that already holds the
 * bootstrap admin adds nothing and overwrites nothing.
 */
export async function insertBootstrapAdmin(tx: SeedTransaction): Promise<void> {
  await tx
    .insert(users)
    .values(applyAudit('insert', BOOTSTRAP_ADMIN, BOOTSTRAP_SESSION))
    .onConflictDoNothing({ target: users.id });
}
