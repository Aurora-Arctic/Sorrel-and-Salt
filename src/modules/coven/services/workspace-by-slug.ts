import 'server-only';
import { findOneBySlug, findWorkspaceHoldingSlug, findWorkspaceSeat } from '../../../db/repository';
import { CovenMoved, Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { CovenMembership, PausedCoven } from '../types';
import { assertMembership } from './membership';

/**
 * @throws {Forbidden} bare, alike for an unknown slug, a deleted coven and a non-member, so the answer does not say which miss it was.
 * @throws {CovenMoved} the slug is an old address of a coven the caller belongs to: only a member learns where it went.
 */
export async function membershipBySlug(session: Session, slug: string): Promise<CovenMembership> {
  const workspace = await findOneBySlug(workspaces, slug);
  if (!workspace) {
    const held = await findWorkspaceHoldingSlug(slug);
    if (!held) throw new Forbidden();
    await assertMembership(session, held.workspace.id, {
      workspace: ['read'],
    });
    throw new CovenMoved(held.workspace.slug);
  }
  const membership = await assertMembership(session, workspace.id, { workspace: ['read'] });
  return { workspace, membership };
}

/** Whether a live coven other than `exceptWorkspaceId` holds the address, as its current one or an old one. */
export async function slugHeldByAnotherCoven(
  slug: string,
  exceptWorkspaceId?: string,
): Promise<boolean> {
  const held = await findWorkspaceHoldingSlug(slug);
  if (held) return held.workspace.id !== exceptWorkspaceId;
  const current = await findOneBySlug(workspaces, slug);
  return Boolean(current && current.id !== exceptWorkspaceId);
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
