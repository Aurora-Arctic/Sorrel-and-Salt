import 'server-only';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import { assertSiteAdmin } from './site-admin';
import type { UserRow } from '../types';

// M5.8's approval route and its undoing: an admin lets someone with no
// invitation create a workspace, or stops them. The invitation route is
// M7.5's, and being made admin sets the flag in its own write (MB.177). Each
// change is declared `via: 'admin'`, and the trigger on `users` records it
// in the privilege ledger, since the user's own stamps go with their next
// update (MB.195): claude-docs/auth/admin-users.md, "Approving workspace creation".

const REFUSAL = 'Only a site admin may change who can create a coven';

/** The live user, or `NotFound`: a soft-deleted one reads as no one. */
async function liveUser(userId: string): Promise<UserRow> {
  const user = await findOneById(users, userId);
  if (!user) throw new NotFound('No such user');
  return user;
}

/**
 * Writes the flag as an admin's act, answering the row. The ledger row is the
 * trigger's, written in the same transaction, carrying `note`, the
 * confirmation's optional reason, a blank one as none.
 */
async function setFlag(
  session: Session,
  userId: string,
  canCreateWorkspace: boolean,
  note: string | undefined,
): Promise<UserRow> {
  return withAudit(
    session,
    async (write) => {
      const [written] = await write.updateById(users, userId, { canCreateWorkspace });
      // Soft-deleted between the read and the write: the update matches no
      // row, so the trigger never fires, and nothing is recorded.
      if (!written) throw new NotFound('No such user');
      return written;
    },
    { via: 'admin', note: note?.trim() || undefined },
  );
}

/**
 * Lets a live user who lacks it create a workspace, stamped as the approving
 * admin and recorded as a `grant` with `note`, the confirmation's optional
 * reason, and answers the row as written.
 *
 * @throws {Forbidden} the session's role is not `admin`, or the user may
 * already create one — a second approval would record a change that never
 * happened.
 * @throws {NotFound} no live user has this id.
 */
export async function grantWorkspaceCreation(
  session: Session,
  userId: string,
  note?: string,
): Promise<UserRow> {
  assertSiteAdmin(session, REFUSAL);
  const user = await liveUser(userId);
  if (user.canCreateWorkspace) throw new Forbidden(`${user.name} may already create a coven`);
  return setFlag(session, userId, true, note);
}

/**
 * Stops a live user creating workspaces, stamped as the admin and recorded as
 * a `revoke` with `note`, and answers the row as written. The workspaces they already
 * created stay theirs: the flag governs creating, not keeping.
 *
 * @throws {Forbidden} the session's role is not `admin`; the user cannot
 * create one already; or the user is an admin, whom the users CHECK holds to
 * the flag (MB.177), so revoking their admin role is the route.
 * @throws {NotFound} no live user has this id.
 */
export async function revokeWorkspaceCreation(
  session: Session,
  userId: string,
  note?: string,
): Promise<UserRow> {
  assertSiteAdmin(session, REFUSAL);
  const user = await liveUser(userId);
  if (!user.canCreateWorkspace) {
    throw new Forbidden(`${user.name} cannot create a coven, so there is nothing to revoke`);
  }
  if (user.role === 'admin') {
    throw new Forbidden(
      `${user.name} is an admin, and every admin may create a coven. Revoke their admin role first.`,
    );
  }
  return setFlag(session, userId, false, note);
}
