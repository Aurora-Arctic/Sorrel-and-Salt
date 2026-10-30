import 'server-only';
import { findOneBySlug } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { workspaces } from '../schema/workspaces';
import type { CovenMembership } from '../types';
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
