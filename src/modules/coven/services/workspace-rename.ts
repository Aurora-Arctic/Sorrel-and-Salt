import 'server-only';
import { z } from 'zod';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { parseInput, requiredText } from '../../../lib/validation';
import { workspaces } from '../schema/workspaces';
import { COVEN_NAME_LIMIT } from '../validation/workspace-name';
import type { WorkspaceRow } from '../types';
import { freeCovenSlug } from './coven-slug';
import { assertMembership } from './membership';

// A steward renames a coven. Its address follows the name, and the previous address stays on `workspace_slugs` as its one old
// address so links to it still arrive (claude-docs/db/identity-model.md, "Coven addresses").

const RenameWorkspaceInput = z.object({
  name: requiredText('Give the coven a name').max(COVEN_NAME_LIMIT, {
    error: `Keep the name to ${COVEN_NAME_LIMIT} characters`,
  }),
});

/** Each retry of a slug race sees the winner and takes the next number. */
const SLUG_ATTEMPTS = 5;

/**
 * @throws {Forbidden} the caller is not a steward of the coven, it is the demo coven, or it is gone.
 * @throws {ValidationError} the name is blank or longer than 80 characters.
 */
export async function renameWorkspace(
  session: Session,
  workspaceId: string,
  input: { name: string },
): Promise<WorkspaceRow> {
  const membership = await assertMembership(session, workspaceId, { workspace: ['update'] });
  const workspace = await findOneById(workspaces, workspaceId);
  if (workspace?.demo) throw new Forbidden("The demo coven can't be renamed.");

  const { name } = parseInput(RenameWorkspaceInput, input);

  for (let attempt = 1; ; attempt++) {
    const slug = await freeCovenSlug(name, workspaceId);
    try {
      return await withAudit(session, async (write) => {
        const [row] = await write.updateWorkspaceName(membership, { name, slug });
        // Deleted between the check and the write.
        if (!row) throw new Forbidden();
        return row;
      });
    } catch (error) {
      const index = violatedUniqueIndex(error);
      const raced = index === 'workspaces_slug_unique' || index === 'workspace_slugs_slug_unique';
      if (!raced || attempt >= SLUG_ATTEMPTS) throw error;
    }
  }
}
