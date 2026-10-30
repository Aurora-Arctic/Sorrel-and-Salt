import type { Session } from '@/lib/session';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { SessionUser } from './types';

// The letters are bindings re-exported from the seed, not redeclared: a second
// copy of the ids would drift from the database without a test failing.
// Nothing here touches the database.

/**
 * The cast: **A** owner of W · **B** member of W · **C** viewer in W · **D** member of unrelated X ·
 * **E** site admin · **F** site curator. Only the site role travels on a session; the workspace
 * roles are `workspace_members` rows.
 */
export const { A, B, C, D, E, F } = FIXTURE_USERS;

/**
 * The session a service would have received had this user signed in, as in
 * `spells.create(asUser(C), { workspaceId: W.id, title: 'x' })`.
 */
export function asUser(user: SessionUser): Session {
  // A fresh object per call, so a mutating service cannot leak into the next assertion.
  return { userId: user.id, role: user.role };
}
