import 'server-only';
import {
  findReceivedInvitationCount,
  findReceivedInvitationCovens,
  findReceivedInvitationInviters,
  findReceivedInvitationPage,
} from '../../../db/repository';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import type { ReceivedInvitation } from '../types';

// The coven invitations addressed to the signed-in account. No permission to assert: the session is the scope and the repository
// matches its verified address in SQL. The site tier is never listed (claude-docs/design-decisions/m10.32-accept-from-the-landing.md).

/**
 * One page of the coven invitations still pending for the session's account, newest first, with each coven's and sender's name.
 * Three statements however long the page; a row whose coven was deleted between the reads is left out.
 */
export async function listReceivedInvitations(
  session: Session,
  page: PageRequest,
): Promise<PageEntry<ReceivedInvitation>[]> {
  const entries = await findReceivedInvitationPage(session, page);
  if (entries.length === 0) return [];

  const [covens, inviters] = await Promise.all([
    findReceivedInvitationCovens(session, [
      ...new Set(entries.flatMap(({ node }) => (node.workspaceId ? [node.workspaceId] : []))),
    ]),
    findReceivedInvitationInviters(session, [
      ...new Set(entries.map(({ node }) => node.createdBy)),
    ]),
  ]);
  const covenById = new Map(covens.map((coven) => [coven.id, coven]));
  const inviterById = new Map(inviters.map((inviter) => [inviter.id, inviter]));

  return entries.flatMap(({ cursor, node }) => {
    const coven = node.workspaceId ? covenById.get(node.workspaceId) : undefined;
    // The CHECK on `invitations` ties a role to a workspace, so a row with one has both.
    if (!coven || !node.role) return [];
    return [
      {
        cursor,
        node: {
          id: node.id,
          covenName: coven.name,
          covenSlug: coven.slug,
          role: node.role,
          inviterName: inviterById.get(node.createdBy)?.name ?? null,
          expiresAt: node.expiresAt,
          note: node.note,
        },
      },
    ];
  });
}

/** How many invitations `listReceivedInvitations` pages, and how many come before `start`: the account page's "Page X of Y". */
export function countReceivedInvitations(
  session: Session,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findReceivedInvitationCount(session, start);
}
