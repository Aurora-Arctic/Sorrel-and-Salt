import 'server-only';
import { findOneById } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { WorkspaceRow } from '../types';
import { assertMembership } from './membership';

/**
 * The workspace this id names, for a caller who sits in it: how the browser
 * reaches a coven's own fields, its member list among them, by the id a page
 * gave it. Asks for `workspace: read`, which every role holds; each field
 * below asks for its own permission.
 *
 * @throws {Forbidden} bare, alike for an id no live workspace holds and for one
 * the caller is not a member of, as `membershipBySlug` does.
 */
export async function workspaceById(session: Session, workspaceId: string): Promise<WorkspaceRow> {
  await assertMembership(session, workspaceId, { workspace: ['read'] });
  const workspace = await findOneById(workspaces, workspaceId);
  if (!workspace) throw new Forbidden();
  return workspace;
}
