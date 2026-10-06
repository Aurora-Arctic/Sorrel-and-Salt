import { users } from '../../modules/identity/schema/users';
import { applyAudit } from '../audit';
import { BOOTSTRAP_SESSION } from './bootstrap-admin';
import { beginSeedTransaction } from './idempotent';
import type { SeedDatabase, SeedUser } from './types';

// The `minimal` scenario: one system user, one user, empty compendium. Writes go
// through the handle `seed()` was given, not `withAudit` — an identity
// bootstrap (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md).

/** `…0002`, continuing the bootstrap's `…0001`. */
export const MINIMAL_USER_ID = '00000000-0000-0000-0000-000000000002';

const USER: SeedUser = {
  id: MINIMAL_USER_ID,
  name: 'Seed User',
  email: 'user@seed.sorrelandsalt.com',
  role: 'user',
};

export async function seedMinimal(db: SeedDatabase): Promise<void> {
  await beginSeedTransaction(db, async (tx) => {
    // Idempotent by fixed id, not by truncating: a re-run is a no-op.
    await tx
      .insert(users)
      .values(applyAudit('insert', USER, BOOTSTRAP_SESSION))
      .onConflictDoNothing({ target: users.id });
  });
}
