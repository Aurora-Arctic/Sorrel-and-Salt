import 'server-only';
import { findOneById } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { WorkspaceRow } from '../types';
import { assertMembership } from './membership';

/**
 * @throws {Forbidden} bare, alike for an id no live workspace holds and one the caller is not a member of.
 */
export async function workspaceById(session: Session, workspaceId: string): Promise<WorkspaceRow> {
  await assertMembership(session, workspaceId, { workspace: ['read'] });
  const workspace = await findOneById(workspaces, workspaceId);
  if (!workspace) throw new Forbidden();
  return workspace;
}
