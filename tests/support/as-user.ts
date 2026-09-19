import type { Session } from '@/lib/session';
import type { users } from '@/db/schema/users';
import { FIXTURE_USERS } from '@/db/seed/standard';

// M1.26 — act as a fixture user in one line.
//
// The letters are bindings re-exported from the seed rather than redeclared:
// `standard` is what inserts these rows, and a second copy of the ids here
// would drift from the database without a single test failing. The helper does
// not touch the database — whether a user exists is
// `src/db/seed/standard.test.ts`'s claim, made against real rows.

/**
 * The cast, bound to its letters: **A** owner of W · **B** member of W ·
 * **C** viewer in W · **D** member of unrelated X · **E** site admin in no
 * workspace. The workspace roles are rows in `workspace_members` that the
 * `standard` scenario seeds; only the site role travels on a session.
 */
export const { A, B, C, D, E } = FIXTURE_USERS;

/**
 * Any user row satisfies this, not only a fixture one — a test that creates a
 * user mid-run acts as them the same way.
 */
type SessionUser = Pick<typeof users.$inferSelect, 'id' | 'role'>;

/**
 * The session a service would have received had this user signed in.
 *
 * ```ts
 * await expect(spells.create(asUser(C), { workspaceId: W.id, title: 'x' })).rejects.toThrow(
 *   Forbidden,
 * );
 * ```
 */
export function asUser(user: SessionUser): Session {
  // A fresh object per call: a shared one could be mutated by the service
  // under test and carry that mutation into the next assertion.
  return { userId: user.id, role: user.role };
}
