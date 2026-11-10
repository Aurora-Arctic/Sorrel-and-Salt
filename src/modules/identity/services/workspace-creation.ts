import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import { NO_SUCH_USER, adminDeclaration, liveUser } from './admin-changes';
import { assertAdminChangesOpen } from './admin-role-pause';
import { ROLE_NOUNS } from './user-role';
import type { UserRow } from '../types';

// Each change is declared `via: 'admin'` and the trigger on `users` records it in the privilege ledger (claude-docs/auth/admin-users.md, "Approving workspace creation").

const REFUSAL = 'Only a site keeper may change who can create a coven';

/** The ledger row is the trigger's, carrying `note` (blank as none). */
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
      if (!written) throw new NotFound(NO_SUCH_USER);
      return written;
    },
    adminDeclaration(note),
  );
}

/**
 * @throws {Forbidden} not a keeper; keeper changes are paused and the caller is not the primary keeper; or the user may already create one.
 * @throws {NotFound} no live user has this id.
 */
export async function grantWorkspaceCreation(
  session: Session,
  userId: string,
  note?: string,
): Promise<UserRow> {
  await assertAdminChangesOpen(session, REFUSAL);
  const user = await liveUser(userId);
  if (user.canCreateWorkspace) throw new Forbidden(`${user.name} may already create a coven`);
  return setFlag(session, userId, true, note);
}

/**
 * The workspaces they created stay theirs.
 *
 * @throws {Forbidden} not a keeper; keeper changes are paused and the caller is not the primary keeper; the user cannot create one already; or the user is a keeper or curator, whom the users CHECK holds to the flag.
 * @throws {NotFound} no live user has this id.
 */
export async function revokeWorkspaceCreation(
  session: Session,
  userId: string,
  note?: string,
): Promise<UserRow> {
  await assertAdminChangesOpen(session, REFUSAL);
  const user = await liveUser(userId);
  if (!user.canCreateWorkspace) {
    throw new Forbidden(`${user.name} cannot create a coven, so there is nothing to revoke`);
  }
  if (user.role !== 'user') {
    const role = ROLE_NOUNS[user.role];
    throw new Forbidden(
      `${user.name} is ${role}, and every ${user.role} may create a coven. Make them a user first.`,
    );
  }
  return setFlag(session, userId, false, note);
}
