import 'server-only';
import { cache } from 'react';
import { RowId } from '../../../../../lib/validation';
import type { Session } from '../../../../../lib/session';
import { membershipsOf } from '@/modules/coven';
import { isPrimaryAdmin, listedOnUserList, providersOf, usersForAdmin } from '@/modules/identity';
import { readTimeoutsOf } from '../../support/reads';
import { userHeading } from './user-heading';
import type { OpenedUser } from './types';

/**
 * The user `?user=` names, with their covens; none when the list does not show them (not live, or
 * the seed's bootstrap user). Read through the services GraphQL ends at (rule 1;
 * claude-docs/design-decisions/m9.19-admin-sees-user-covens.md). Cached, so a second render in the request reads once.
 */
export const readOpenedUser = cache(async (session: Session, raw: string) => {
  // A hand-edited address is a missing user, not an error: the list beneath
  // is still the page asked for.
  const parsed = RowId.safeParse(raw);
  if (!parsed.success || !listedOnUserList(parsed.data)) return undefined;
  const id = parsed.data;
  const [[found], [memberships], [providers], timeouts] = await Promise.all([
    usersForAdmin(session, [id]),
    membershipsOf(session, [id]),
    providersOf(session, [id]),
    readTimeoutsOf(session, id),
  ]);
  // An admin's batch answers every slot; a refusal here is the guard's bug.
  if (found instanceof Error) throw found;
  if (!found) return undefined;
  if (!memberships || memberships instanceof Error)
    throw memberships ?? new Error('No memberships read');
  if (!providers || providers instanceof Error) throw providers ?? new Error('No providers read');
  return {
    heading: userHeading(found),
    // Every fact the list's row shows, so the modal holds them all.
    user: {
      id: found.id,
      name: found.name,
      email: found.email,
      emailVerified: found.emailVerified,
      role: found.role,
      primaryAdmin: isPrimaryAdmin(found),
      canCreateWorkspace: found.canCreateWorkspace,
      providers,
      createdAt: found.createdAt,
    },
    memberships: memberships.map((row) => ({
      workspaceId: row.workspaceId,
      name: row.workspace.name,
      slug: row.workspace.slug,
      role: row.role,
      joinedAt: row.joinedAt,
    })),
    timeouts,
  } satisfies OpenedUser;
});
