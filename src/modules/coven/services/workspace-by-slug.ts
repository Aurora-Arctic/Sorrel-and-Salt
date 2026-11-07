import 'server-only';
import { findOneBySlug, findWorkspaceSeat } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { CovenMembership, PausedCoven } from '../types';
import { assertMembership } from './membership';

/**
 * @throws {Forbidden} bare, alike for an unknown slug and a non-member, so the answer does not say which miss it was.
 */
export async function membershipBySlug(session: Session, slug: string): Promise<CovenMembership> {
  const workspace = await findOneBySlug(workspaces, slug);
  if (!workspace) throw new Forbidden();
  const membership = await assertMembership(session, workspace.id, { workspace: ['read'] });
  return { workspace, membership };
}

/**
 * @throws {Forbidden} bare, as `membershipBySlug` throws it: only a member learns the coven is there.
 */
export async function pausedCovenBySlug(
  session: Session,
  slug: string,
): Promise<PausedCoven | null> {
  const workspace = await findOneBySlug(workspaces, slug);
  if (!workspace) throw new Forbidden();
  const seat = await findWorkspaceSeat(session.userId, workspace.id);
  if (!seat) throw new Forbidden();
  return seat.pause ? { id: workspace.id, name: workspace.name, until: seat.pause.until } : null;
}
