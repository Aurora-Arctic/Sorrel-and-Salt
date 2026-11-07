import 'server-only';
import { cache } from 'react';
import { byCovenName, membershipsOf, rolePermits, type WorkspaceRole } from '@/modules/coven';
import { countReceivedInvitations, getMe } from '@/modules/identity';
import { getMySupportCounts } from '@/modules/support';
import { getSession, getShellSession, requireSignedIn } from './request-session';
import type { Session } from './session';
import { curates } from './site-roles';
import type { ShellContext } from './types';

// Reads the user row, not the session, as accepting an invitation sets `canCreateWorkspace` mid-session. It asks only that someone is signed in, as the shell also draws an unverified account's email page.

/** Keyed by the session, which `getSession` hands out once per request. */
const ownMemberships = cache(async (session: Session) => {
  const [memberships] = await membershipsOf(session, [session.userId]);
  // A viewer asking for their own id is never refused, so a Forbidden here
  // is a bug in the service, not a state to draw.
  if (!memberships || memberships instanceof Error) throw new Error('Own memberships refused');
  return memberships;
});

async function viewerFor(
  session: Session,
  accessPause?: { until: Date | null },
): Promise<ShellContext> {
  // A paused viewer reaches support and nothing else, so the shell reads no coven, curation or invitation for them, and
  // keeps the count of their own requests waiting on them.
  if (accessPause) {
    const me = await getMe(session);
    const support = me.emailVerified ? await getMySupportCounts(session) : { waitingOnMe: 0 };
    return {
      viewer: {
        id: session.userId,
        name: me.name,
        canCurate: false,
        canCreate: false,
        verified: me.emailVerified,
        pendingInvitations: 0,
        assignedSupport: 0,
        waitingSupport: support.waitingOnMe,
        accessPause,
      },
      workspaces: [],
    };
  }
  const [me, memberships] = await Promise.all([getMe(session), ownMemberships(session)]);
  // Only a verified address has invitations it may read, so an unverified
  // account costs no count; one statement otherwise, on every shell page.
  const pendingInvitations = me.emailVerified
    ? (await countReceivedInvitations(session, undefined)).totalCount
    : 0;
  const support = me.emailVerified
    ? await getMySupportCounts(session)
    : { assignedOpen: 0, waitingOnMe: 0 };
  return {
    viewer: {
      id: session.userId,
      name: me.name,
      canCurate: curates(session.role),
      canCreate: me.canCreateWorkspace,
      verified: me.emailVerified,
      pendingInvitations,
      assignedSupport: support.assignedOpen,
      waitingSupport: support.waitingOnMe,
    },
    // Alphabetical with the demo coven last: the service's order is the database's, which looks random.
    workspaces: [...memberships]
      .sort((a, b) => byCovenName(a.workspace, b.workspace))
      .map(({ role, pause, workspace: { id, slug, name } }) => ({
        id,
        slug,
        name,
        // A paused seat reaches only the paused page, so its role offers nothing: every service refuses it too.
        canReadMembers: !pause && rolePermits(role, { member: ['read'] }),
        // The statement the invite service asserts: the switcher keeps a viewer on the invitations page only where it opens.
        canInvite: !pause && rolePermits(role, { member: ['invite'] }),
        // The statement createWorkspaceIngredient asserts, so the button never offers a coven the save would refuse.
        canWrite: !pause && rolePermits(role, { ingredient: ['create'], inventory: ['update'] }),
        paused: pause ? { until: pause.until } : null,
      })),
  };
}

export const viewerOf = cache(async (): Promise<ShellContext> => {
  const session = await requireSignedIn();
  return viewerFor(session, (await getShellSession())?.accessPause);
});

/** For the public frame and nothing else. */
export const viewerIfSignedIn = cache(async (): Promise<ShellContext | null> => {
  const shell = await getShellSession();
  return shell ? viewerFor(shell.session, shell.accessPause) : null;
});

/** For the public entry page's cupboard choices, each of which a different statement permits. The shell carries a coven's permissions as flags rather than its role, and this shares its read. */
export const covenRolesIfSignedIn = cache(
  async (): Promise<ReadonlyMap<string, WorkspaceRole> | null> => {
    const session = await getSession();
    if (!session) return null;
    const memberships = await ownMemberships(session);
    return new Map(memberships.map(({ role, workspace }) => [workspace.id, role]));
  },
);
