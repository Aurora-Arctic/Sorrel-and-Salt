import 'server-only';
import { z } from 'zod';
import { findOneById, findOneBySlug, withAudit } from '../../../db/repository';
import { isReservedCovenSlug } from '../../../lib/coven-path';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { parseInput, requiredText } from '../../../lib/validation';
import { users } from '../../identity/schema/users';
import { workspaces } from '../schema/workspaces';
import type { WorkspaceRow } from '../types';

// The right is `users.can_create_workspace` alone (every keeper holds it), so `role` is never read
// (claude-docs/auth/admin-users.md, "Approving workspace creation").

const NAME_LIMIT = 80;

const CreateWorkspaceInput = z.object({
  name: requiredText('Give the coven a name').max(NAME_LIMIT, {
    error: `Keep the name to ${NAME_LIMIT} characters`,
  }),
});

const FALLBACK_SLUG = 'coven';

/** Each retry of a slug race sees the winner and takes the next number. */
const SLUG_ATTEMPTS = 5;

/**
 * A segment the router already answers (`new`) counts as taken. Free as of this read; the unique index decides a race.
 */
async function freeSlug(name: string): Promise<string> {
  const base = slugify(name) || FALLBACK_SLUG;
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (isReservedCovenSlug(candidate)) continue;
    if (!(await findOneBySlug(workspaces, candidate))) return candidate;
  }
}

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
    const slug = await freeSlug(name);
    try {
      return await withAudit(session, async (write) => {
        const [workspace] = await write.insert(workspaces, { name, slug });
        await write.insertMembership(workspace.id, session.userId, 'owner');
        return workspace;
      });
    } catch (error) {
      // Someone took the slug between the read and the write: look again.
      if (violatedUniqueIndex(error) !== 'workspaces_slug_unique' || attempt >= SLUG_ATTEMPTS) {
        throw error;
      }
    }
  }
}
