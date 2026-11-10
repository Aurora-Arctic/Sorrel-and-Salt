import 'server-only';
import { cache } from 'react';
import { answerOf } from '@/lib/errors';
import { isRowId } from '@/lib/validation';
import type { Session } from '@/lib/session';
import { membershipsOf } from '@/modules/coven';
import {
  isPrimaryAdmin,
  listedOnUserList,
  listUserAccessPauses,
  providersOf,
  usersForAdmin,
} from '@/modules/identity';
import type { AccessPauseEntry } from '@/components/UserDetail/types';
import { readTimeoutsOf } from '../../support/reads';
import { userHeading } from './user-heading';
import type { OpenedUser } from './types';

const PAUSES_SHOWN = 25;

/**
 * A user's pauses, newest first, with who set and lifted each named; none for the primary keeper, whose access no one
 * pauses, for the admin's own account, and for anyone but a keeper, so the modal draws no Site Access section.
 */
async function readPausesOf(
  session: Session,
  userId: string,
  primaryAdmin: boolean,
): Promise<AccessPauseEntry[] | undefined> {
  if (session.role !== 'admin' || primaryAdmin || userId === session.userId) return undefined;
  const page = await listUserAccessPauses(session, userId, {
    limit: PAUSES_SHOWN,
    inverted: false,
  });
  const rows = page.map(({ node }) => node);
  const ids = [...new Set(rows.flatMap((row) => [row.createdBy, row.liftedBy]))].filter(
    (id): id is string => id !== null,
  );
  const named = new Map(
    (ids.length > 0 ? await usersForAdmin(session, ids) : []).flatMap((user) =>
      user && !(user instanceof Error)
        ? [[user.id, { id: user.id, name: user.name }] as const]
        : [],
    ),
  );
  return rows.map((row) => ({
    id: row.id,
    until: row.until,
    note: row.note,
    createdAt: row.createdAt,
    liftedAt: row.liftedAt,
    setBy: (row.createdBy && named.get(row.createdBy)) || null,
    liftedBy: (row.liftedBy && named.get(row.liftedBy)) || null,
  }));
}

/**
 * The user `?user=` names, with their covens; none when the list does not show them (not live, or
 * the seed's bootstrap user). Read through the services GraphQL ends at (rule 1;
 * claude-docs/design-decisions/auth.md, "A site keeper sees which covens a user belongs to"). Cached, so a second render in the request reads once.
 */
export const readOpenedUser = cache(async (session: Session, raw: string) => {
  if (!isRowId(raw) || !listedOnUserList(raw)) return undefined;
  const id = raw;
  const [[found], [memberships], [providers], timeouts] = await Promise.all([
    usersForAdmin(session, [id]),
    membershipsOf(session, [id]),
    providersOf(session, [id]),
    readTimeoutsOf(session, id),
  ]);
  // A keeper's batch answers every slot; a refusal here is the guard's bug.
  if (found instanceof Error) throw found;
  if (!found) return undefined;
  const heldMemberships = answerOf(memberships);
  const linkedProviders = answerOf(providers);
  const pauses = await readPausesOf(session, id, isPrimaryAdmin(found));
  return {
    heading: userHeading(found),
    user: {
      id: found.id,
      name: found.name,
      email: found.email,
      emailVerified: found.emailVerified,
      role: found.role,
      primaryAdmin: isPrimaryAdmin(found),
      canCreateWorkspace: found.canCreateWorkspace,
      providers: linkedProviders,
      createdAt: found.createdAt,
      agreedTermsVersion: found.agreedTermsVersion,
      agreedDisclaimerVersion: found.agreedDisclaimerVersion,
      agreedEthicsVersion: found.agreedEthicsVersion,
    },
    memberships: heldMemberships.map((row) => ({
      workspaceId: row.workspaceId,
      name: row.workspace.name,
      slug: row.workspace.slug,
      role: row.role,
      joinedAt: row.joinedAt,
    })),
    timeouts,
    pauses,
  } satisfies OpenedUser;
});
