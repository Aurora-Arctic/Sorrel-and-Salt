import { eq, isNull, or } from 'drizzle-orm';
import { beginSeedTransaction, insertMissingBy, insertStamped } from './idempotent';
import { DEMO_WORKSPACE_ID, BOOTSTRAP_USER_ID } from '../bootstrap';
import { slugify } from '../../lib/slugify';
import { users } from '../../modules/identity/schema/users';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import type { SeedDatabase, SeedRunOptions, SeedTransaction } from './types';

// The demo coven: the one workspace flagged `demo`, with an owner seat for the system user and every admin and a viewer seat for
// everyone else. Reference data, seeded on every environment after the compendium (claude-docs/db/demo-coven-seed.md). Additive:
// a seat that exists, soft-deleted or not, is left as it is, so a person who left stays out.

export const DEMO_COVEN_NAME = 'Sorrel & Salt Demo';

/** The coven and its seats in a transaction of its own. Writes go through the handle the caller gives, not `withAudit`. */
export async function seedDemoCoven(db: SeedDatabase, options: SeedRunOptions = {}): Promise<void> {
  await beginSeedTransaction(db, seedDemoCovenSeats, options);
}

/**
 * The same seed inside the caller's transaction. Assumes the actor is published and the bootstrap user exists. Refuses, rather
 * than take another slug, when a coven that is not the demo coven holds the demo coven's slug; `freeSlug` is a service's and a
 * seed cannot import one.
 */
export async function seedDemoCovenSeats(tx: SeedTransaction): Promise<void> {
  const workspaceId = await ensureWorkspace(tx);
  if (workspaceId === null) return;

  const people = await tx
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(isNull(users.deletedAt));
  const seats = people.map(({ id, role }) => ({
    workspaceId,
    userId: id,
    role: id === BOOTSTRAP_USER_ID || role === 'admin' ? ('owner' as const) : ('viewer' as const),
  }));

  // Keyed on the pair and scoped to this coven, so another coven's seat for the same person is not met.
  await insertMissingBy(tx, workspaceMembers, seats, {
    columns: ['workspaceId', 'userId'],
    where: eq(workspaceMembers.workspaceId, workspaceId),
    toRow: (seat) => ({ ...seat, invitedBy: null }),
  });
}

/** The live demo coven's id, inserting the row when there is none; null when the fixed id is taken by a deleted row. */
async function ensureWorkspace(tx: SeedTransaction): Promise<string | null> {
  const [live] = await tx
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.demo, true));
  if (live) return live.id;

  const slug = slugify(DEMO_COVEN_NAME);
  const [holder] = await tx
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(or(eq(workspaces.slug, slug), eq(workspaces.id, DEMO_WORKSPACE_ID)));
  if (holder?.id === DEMO_WORKSPACE_ID) return null;
  if (holder) {
    throw new Error(
      `The demo coven needs the slug "${slug}", but the coven "${holder.name}" holds it. Rename one of the two and seed again.`,
    );
  }

  await insertStamped(tx, workspaces, [
    { id: DEMO_WORKSPACE_ID, name: DEMO_COVEN_NAME, slug, demo: true },
  ]);
  return DEMO_WORKSPACE_ID;
}
