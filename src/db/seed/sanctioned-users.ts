import { eq } from 'drizzle-orm';
import { userAccessPauses } from '../../modules/identity/schema/user-access-pauses';
import { insertStamped } from './idempotent';
import { FIXTURE_USERS, insertMissingFixtureUsers } from './standard';
import type { FixtureUser, SeedTransaction } from './types';

// Two accounts for the `demo` scenario that a keeper has held back, so the Users table's Support Time-Out and Site Access
// Paused columns and the user modal have a standing one to show: H, whose site access is paused with no end date, and I, who
// is timed out of support with no end date (the time-out itself is the support seed's). Not fixtures A–G, whom stories
// and specs sign in as.

const DAY = 24 * 60 * 60 * 1000;

export const SANCTIONED_USERS = {
  H: {
    id: '00000000-0000-0000-0000-00000000000a',
    name: 'Fixture H',
    email: 'h@seed.sorrelandsalt.com',
    role: 'user',
    canCreateWorkspace: false,
  },
  I: {
    id: '00000000-0000-0000-0000-00000000000b',
    name: 'Fixture I',
    email: 'i@seed.sorrelandsalt.com',
    role: 'user',
    canCreateWorkspace: false,
  },
} satisfies Record<'H' | 'I', FixtureUser>;

/** H's pause, in the block `…0006-…`: open-ended, set by the keeper E six days before the first run. */
const ACCESS_PAUSE = {
  id: '00000000-0000-0000-0006-000000000001',
  userId: SANCTIONED_USERS.H.id,
  until: null,
  note: 'Shared their sign-in with people outside the beta.',
  daysAgo: 6,
};

/**
 * Writes H and I, verified and holding nothing, and H's pause, each only when missing by its fixed id. The pause is stamped by
 * E and then dated in the past, since the stamp is "now". Assumes the actor is published and the fixture keeper exists.
 */
export async function seedSanctionedUsers(tx: SeedTransaction): Promise<void> {
  await insertMissingFixtureUsers(tx, Object.values(SANCTIONED_USERS));

  const present = await tx
    .select({ id: userAccessPauses.id })
    .from(userAccessPauses)
    .where(eq(userAccessPauses.id, ACCESS_PAUSE.id));
  if (present.length > 0) return;
  const { daysAgo, ...pause } = ACCESS_PAUSE;
  await insertStamped(tx, userAccessPauses, [pause], { userId: FIXTURE_USERS.E.id });
  await tx
    .update(userAccessPauses)
    .set({ createdAt: new Date(Date.now() - daysAgo * DAY) })
    .where(eq(userAccessPauses.id, pause.id));
}
