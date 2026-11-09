import 'server-only';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { users } from '../../identity/schema/users';
import { workspaces } from '../schema/workspaces';
import type { WorkspaceRow } from '../types';
import { CovenNameInput, withFreeCovenSlug } from './coven-slug';

// The right is `users.can_create_workspace` alone (every keeper holds it), so `role` is never read
// (claude-docs/auth/admin-users.md, "Approving workspace creation").

/**
 * The flag is read from the row, not the session, since accepting an invitation sets it mid-session. Making one does not spend it.
 *
 * @throws {Forbidden} the user cannot create a workspace, or is gone.
 * @throws {ValidationError} the name is blank or longer than 80 characters.
 */
export async function createWorkspace(
  session: Session,
  input: { name: string },
): Promise<WorkspaceRow> {
  const user = await findOneById(users, session.userId);
  if (!user?.canCreateWorkspace) throw new Forbidden('Creating a coven needs an invitation');

  const { name } = parseInput(CovenNameInput, input);

  return withFreeCovenSlug(name, undefined, (slug) =>
    withAudit(session, async (write) => {
      const [workspace] = await write.insert(workspaces, { name, slug });
      await write.insertWorkspaceSlug(workspace.id, slug);
      await write.insertMembership(workspace.id, session.userId, 'owner');
      return workspace;
    }),
  );
}
