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

// The coven invitations addressed to the signed-in account, for the account
// page's Invitations section and the shell's count. No permission
// to assert: the session is the scope, and the repository matches its
// verified address in SQL, so there is no workspace id to be handed. The
// site tier is never listed; an admin invitation is accepted by its mailed
// link alone (claude-docs/design-decisions/m10.32-accept-from-the-landing.md).

/**
 * One page of the coven invitations still pending for the session's account,
 * newest first, each with its coven's name and slug and its sender's name. The
 * page is one read, the covens and senders another two over its ids, run
 * together: three statements however long the page. A row whose coven was
 * deleted between the reads is left out, as the page would have left it out a
 * moment later.
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

/**
 * How many invitations `listReceivedInvitations` pages, and how many come
 * before `start`, a page's first row, none on an empty page: the account page's
 * "Page X of Y".
 */
export function countReceivedInvitations(
  session: Session,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findReceivedInvitationCount(session, start);
}
