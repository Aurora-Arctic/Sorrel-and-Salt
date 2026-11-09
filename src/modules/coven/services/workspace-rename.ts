import 'server-only';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { workspaces } from '../schema/workspaces';
import type { WorkspaceRow } from '../types';
import { CovenNameInput, withFreeCovenSlug } from './coven-slug';
import { assertMembership } from './membership';

// A steward renames a coven. Its address follows the name, and the previous address stays on `workspace_slugs` as its one old
// address so links to it still arrive (claude-docs/db/identity-model.md, "Coven addresses").

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

  const { name } = parseInput(CovenNameInput, input);

  return withFreeCovenSlug(name, workspaceId, (slug) =>
    withAudit(session, async (write) => {
      const [row] = await write.updateWorkspaceName(membership, { name, slug });
      // Deleted between the check and the write.
      if (!row) throw new Forbidden();
      return row;
    }),
  );
}
