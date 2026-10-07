import { users } from '../../modules/identity/schema/users';
import { applyAudit } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { AuditSession } from '../types';
import type { SeedTransaction, SeedUser } from './types';

// Every seeded row needs a creator, so the bootstrap user is a precondition of
// any seed, not a detail of `minimal` — the category seed runs alone in
// production. One of CLAUDE.md rule 3's two identity bootstraps, stamping itself.
// The seed's system user, not an admin (MB.58): it has no OAuth account and is
// unverified, so no sign-in can reach it, and as an admin it would only be a
// revocable row on /admin/users. The file and its exports keep their old
// names: deploy.yml lists the file among the seed's paths.

export const BOOTSTRAP_ADMIN: SeedUser = {
  id: BOOTSTRAP_USER_ID,
  name: 'Seed System User',
  email: 'admin@seed.sorrelandsalt.com',
  role: 'user',
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
