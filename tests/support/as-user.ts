import type { Session } from '@/lib/session';
import type { users } from '@/db/schema/users';
import { FIXTURE_USERS } from '@/db/seed/standard';

// M1.26 — act as a fixture user in one line.
//
// `asUser(A)` is how DESIGN.md §11's acceptance tests are written and what
// CLAUDE.md's Testing section promises, so the letters are bindings rather
// than string keys. They are re-exported from the seed rather than redeclared:
// `standard` is what actually inserts these rows, and a second copy of the ids
// here would drift from the database without a single test failing — every
// assertion would stay true of a user nobody had seeded.
//
// The helper deliberately does not touch the database. It asserts nothing
// about whether the user exists, because the only way it can name a user that
// does not exist is for the seed to have stopped inserting one — which is
// `src/db/seed/standard.test.ts`'s claim, against real rows, and not worth
// re-proving here at the price of a second migrate-and-seed harness.

/**
 * The cast, bound to its letters: **A** owner of W · **B** member of W ·
 * **C** viewer in W · **D** member of unrelated X · **E** site admin in no
 * workspace. The workspace roles are rows in `workspace_members` that the
 * `standard` scenario seeds; only the site role travels on a session.
 */
export const { A, B, C, D, E } = FIXTURE_USERS;

/**
 * The columns a session is built from, typed against the table's own row model
 * so a rename in `schema/users.ts` fails here rather than at the first denial
 * test. Any user row satisfies it, not only a fixture one — a test that
 * creates a user mid-run acts as them the same way.
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
