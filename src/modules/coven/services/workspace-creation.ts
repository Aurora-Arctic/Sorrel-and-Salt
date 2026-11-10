import 'server-only';
import { z } from 'zod';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { limitMessage } from '../../../lib/formats';
import type { Session } from '../../../lib/session';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { parseInput, requiredText } from '../../../lib/validation';
import { users } from '../../identity/schema/users';
import { workspaces } from '../schema/workspaces';
import { COVEN_NAME_LIMIT } from '../validation/workspace-name';
import type { WorkspaceRow } from '../types';
import { freeCovenSlug } from './coven-slug';

// The right is `users.can_create_workspace` alone (every keeper holds it), so `role` is never read
// (claude-docs/auth/admin-users.md, "Approving workspace creation").

const CreateWorkspaceInput = z.object({
  name: requiredText('Give the coven a name').max(COVEN_NAME_LIMIT, {
    error: limitMessage(COVEN_NAME_LIMIT),
  }),
});

/** Each retry of a slug race sees the winner and takes the next number. */
const SLUG_ATTEMPTS = 5;

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

  const { name } = parseInput(CreateWorkspaceInput, input);

  for (let attempt = 1; ; attempt++) {
    const slug = await freeCovenSlug(name);
    try {
      return await withAudit(session, async (write) => {
        const [workspace] = await write.insert(workspaces, { name, slug });
        await write.insertWorkspaceSlug(workspace.id, slug);
        await write.insertMembership(workspace.id, session.userId, 'owner');
        return workspace;
      });
    } catch (error) {
      // Someone took the slug between the read and the write: look again.
      const index = violatedUniqueIndex(error);
      const raced = index === 'workspaces_slug_unique' || index === 'workspace_slugs_slug_unique';
      if (!raced || attempt >= SLUG_ATTEMPTS) throw error;
    }
  }
}
