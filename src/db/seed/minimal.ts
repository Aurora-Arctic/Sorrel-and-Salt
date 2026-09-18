import { sql } from 'drizzle-orm';
import type { SeedDatabase } from './index';
// `schema/users` before `audit`, and load-bearing: the two import each other
// (audit.ts's FK thunk points at users.id, users.ts spreads auditColumns), so
// whichever is entered first sees the other half-initialised. Entered via
// audit.ts, users.ts builds its table while `auditColumns` is still undefined
// and the spread contributes nothing — an insert then carries no created_by
// and fails NOT NULL. Every db test in src/db/ orders these the same way.
import { users } from '../schema/users';
import { applyAudit, type AuditSession } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';

// M1.21 — the `minimal` scenario (DESIGN.md §"Seed data"): one admin, one
// user, empty compendium. The bare install every other scenario builds on.
//
// The writes here go through the handle `seed()` was given, not through
// `withAudit` — the one write path in the application that does not, and
// deliberately so (claude-docs/design-decisions/m1.21-seed-writes-through-
// its-handle.md). The seed is an identity bootstrap with no session to hand
// over, the same shape as src/lib/auth.ts's sign-up hook; and the handle is
// the point of the `seed(db, …)` signature, since Docker, Vitest and
// Playwright each hand it their own. What `withAudit` guarantees is kept
// rather than re-argued: one transaction, the acting user published as
// `app.current_user_id` in the same parameterised form, and every stamp
// produced by the shared `applyAudit` so the seed cannot drift from the
// repository's idea of an audit column.

/**
 * The plain user's fixed id, so a test can name it the way it names
 * `BOOTSTRAP_USER_ID`. `…0002` beside the bootstrap's `…0001`: M1.22's five
 * fixture users take their own ids in the same series.
 */
export const MINIMAL_USER_ID = '00000000-0000-0000-0000-000000000002';

// The bootstrap user acts for the whole seed, including its own insert —
// `applyAudit` stamps `createdBy`/`updatedBy` from this, and with `id` set to
// the same value the row is one self-satisfying statement (src/db/bootstrap.ts).
const bootstrap: AuditSession = { userId: BOOTSTRAP_USER_ID };

// The columns a seeded user names — typed against the table's own insert
// model so `role` is the enum, not `string`, and so a column renamed in
// users.ts fails here at compile time rather than at the first `db:seed`.
type SeedUser = Pick<typeof users.$inferInsert, 'id' | 'name' | 'email' | 'role'>;

const ADMIN: SeedUser = {
  id: BOOTSTRAP_USER_ID,
  name: 'Bootstrap Admin',
  email: 'admin@seed.sorrelandsalt.com',
  role: 'admin',
};

const USER: SeedUser = {
  id: MINIMAL_USER_ID,
  name: 'Seed User',
  email: 'user@seed.sorrelandsalt.com',
  role: 'user',
};

export async function seedMinimal(db: SeedDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    // Published exactly as withAudit publishes it (M1.19): `set_config` with
    // a bind parameter, transaction-local, so the v2 history trigger records
    // seeded rows as the bootstrap user's rather than nobody's.
    await tx.execute(sql`select set_config('app.current_user_id', ${BOOTSTRAP_USER_ID}, true)`);

    // Idempotent by fixed id rather than by truncating first: both rows carry
    // an id that never changes, so a re-run is a no-op on conflict and a seed
    // pointed at a database that already holds them adds nothing. Nothing is
    // dropped — the Docker-level reset that does drop is M1.24's.
    await tx
      .insert(users)
      .values(applyAudit('insert', ADMIN, bootstrap))
      .onConflictDoNothing({ target: users.id });

    await tx
      .insert(users)
      .values(applyAudit('insert', USER, bootstrap))
      .onConflictDoNothing({ target: users.id });
  });
}
