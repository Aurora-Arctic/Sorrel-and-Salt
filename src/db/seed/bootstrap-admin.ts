// `schema/users` before `audit`, and load-bearing — see minimal.ts.
import { users } from '../schema/users';
import { applyAudit, type AuditSession } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { SeedTransaction } from './index';

// Every seeded row needs a creator, so the bootstrap admin is a precondition of
// any seed, not a detail of `minimal` — the category seed runs alone in
// production. One of CLAUDE.md rule 3's two identity bootstraps, stamping itself.

type SeedUser = Pick<typeof users.$inferInsert, 'id' | 'name' | 'email' | 'role'>;

export const BOOTSTRAP_ADMIN: SeedUser = {
  id: BOOTSTRAP_USER_ID,
  name: 'Bootstrap Admin',
  email: 'admin@seed.sorrelandsalt.com',
  role: 'admin',
};

/** The bootstrap user acts for every seed, including its own insert. */
export const BOOTSTRAP_SESSION: AuditSession = { userId: BOOTSTRAP_USER_ID };

/** Idempotent by fixed id: a re-run adds nothing and overwrites nothing. */
export async function insertBootstrapAdmin(tx: SeedTransaction): Promise<void> {
  await tx
    .insert(users)
    .values(applyAudit('insert', BOOTSTRAP_ADMIN, BOOTSTRAP_SESSION))
    .onConflictDoNothing({ target: users.id });
}
