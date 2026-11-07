import 'server-only';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import { assertMembership } from './membership';

// A steward deletes a workspace. Only the workspace row is soft-deleted: members lose access because `findWorkspaceRole`
// stops finding a role in it, while their membership rows stay, so a workspace restored by hand comes back with its members.

/**
 * @throws {Forbidden} the caller is not a steward of the workspace, it is the demo coven, or it is already deleted.
 */
export async function deleteWorkspace(session: Session, workspaceId: string): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { workspace: ['delete'] });
  const workspace = await findOneById(workspaces, workspaceId);
  if (workspace?.demo) throw new Forbidden("The demo coven can't be deleted.");
  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteWorkspace(membership);
    // Two stewards deleting at once: the second finds it already gone.
    if (!row) throw new Forbidden();
  });
}
