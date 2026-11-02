import 'server-only';
import { findOneBySlug, findWorkspaceSeat } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { CovenMembership, PausedCoven } from '../types';
import { assertMembership } from './membership';

/**
 * The workspace a `/coven/[slug]` address names, and the caller's proof of
 * membership in it. The slug is the only input: a workspace is named
 * by the address alone, never by session state.
 *
 * Asks for `workspace: read`, which every role holds, so any member is
 * admitted; a page that does more asks `assertMembership` for that itself.
 *
 * @throws {Forbidden} bare, alike for a slug no live workspace holds and for
 * one the caller is not a member of — a slug is a guess at someone's private
 * data, so the answer must not say which miss it was.
 */
export async function membershipBySlug(session: Session, slug: string): Promise<CovenMembership> {
  const workspace = await findOneBySlug(workspaces, slug);
  if (!workspace) throw new Forbidden();
  const membership = await assertMembership(session, workspace.id, { workspace: ['read'] });
  return { workspace, membership };
}

/**
 * The coven a `/coven/[slug]` address names and the pause standing on the caller's seat in it, for the paused page; `null` when
 * the caller holds a seat that no pause stands on, so the page can send them back in.
 *
 * @throws {Forbidden} bare, as `membershipBySlug` throws it, for a slug no live workspace holds and for one the caller holds no
 * seat in: only a member learns the coven is there.
 */
export async function pausedCovenBySlug(
  session: Session,
  slug: string,
): Promise<PausedCoven | null> {
  const workspace = await findOneBySlug(workspaces, slug);
  if (!workspace) throw new Forbidden();
  const seat = await findWorkspaceSeat(session.userId, workspace.id);
  if (!seat) throw new Forbidden();
  return seat.pause ? { name: workspace.name, until: seat.pause.until } : null;
}
