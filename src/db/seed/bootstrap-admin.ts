import { users } from '../../modules/identity/schema/users';
import { applyAudit } from '../audit';
import { SIGNED_OUT_SENDER_ID } from '../../lib/support-sender';
import { SYSTEM_ACTOR_ID } from '../../lib/system-actor';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { AuditSession } from '../types';
import type { SeedTransaction, SeedUser } from './types';

// Every seeded row needs a creator, so the bootstrap user precedes any seed. One of rule 3's identity bootstraps, stamping itself. A system user,
// not an admin: no OAuth account and unverified (the dev site keeps one unverified user to test that path), so no sign-in reaches it. Keeps its old
// file and export names, as deploy.yml lists the file.

export const BOOTSTRAP_ADMIN: SeedUser = {
  id: BOOTSTRAP_USER_ID,
  name: 'Seed System User',
  email: 'admin@seed.sorrelandsalt.com',
  role: 'user',
};

/**
 * The account a signed-out support request is written as. Seeded on every environment with no seat and no way in: no OAuth account,
 * no password and `canCreateWorkspace` false.
 */
export const SIGNED_OUT_SENDER: SeedUser = {
  id: SIGNED_OUT_SENDER_ID,
  name: 'Support, signed out',
  email: 'signed-out@seed.sorrelandsalt.com',
  role: 'user',
};

/**
 * The actor of a scheduled job's writes. Seeded on every environment with no seat and no way in: no OAuth account, no password and
 * `canCreateWorkspace` false.
 */
export const SYSTEM_ACTOR: SeedUser = {
  id: SYSTEM_ACTOR_ID,
  name: 'System',
  email: 'system@seed.sorrelandsalt.com',
  role: 'user',
};

/** The bootstrap user acts for every seed, including its own insert. */
export const BOOTSTRAP_SESSION: AuditSession = { userId: BOOTSTRAP_USER_ID };

/**
 * A seeded user, created by the bootstrap user — the bootstrap user itself
 * included. Idempotent by fixed id: a re-run adds nothing and overwrites
 * nothing.
 */
export async function insertSeedUser(tx: SeedTransaction, user: SeedUser): Promise<void> {
  await tx
    .insert(users)
    .values(applyAudit('insert', user, BOOTSTRAP_SESSION))
    .onConflictDoNothing({ target: users.id });
}

export async function insertBootstrapAdmin(tx: SeedTransaction): Promise<void> {
  await insertSeedUser(tx, BOOTSTRAP_ADMIN);
  await insertSeedUser(tx, SIGNED_OUT_SENDER);
  await insertSeedUser(tx, SYSTEM_ACTOR);
}
