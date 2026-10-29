import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { assertMembership } from './membership';

// An owner deletes a workspace. Only the workspace row is soft-deleted: members lose access because `findWorkspaceRole`
// stops finding a role in it, while their membership rows stay, so a workspace restored by hand comes back with its members.

/**
 * Deletes the workspace. The caller needs `workspace: delete`, which only
 * owners hold. Every member, other owners included, is refused from then on.
 *
 * @throws {Forbidden} the caller is not an owner of the workspace, or it is
 * already deleted.
 */
export async function deleteWorkspace(session: Session, workspaceId: string): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { workspace: ['delete'] });
  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteWorkspace(membership);
    // Two owners deleting at once: the second finds it already gone.
    if (!row) throw new Forbidden();
  });
}
