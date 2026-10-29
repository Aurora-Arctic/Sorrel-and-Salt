import 'server-only';
import { cache } from 'react';
import { byCovenName, membershipsOf, rolePermits, type WorkspaceRole } from '@/modules/coven';
import { countReceivedInvitations, getMe } from '@/modules/identity';
import { getSession, requireSignedIn } from './request-session';
import type { Session } from './session';
import { curates } from './site-roles';
import type { ShellContext } from './types';

// What the shell draws and the coven layout's switcher lists: the viewer, their covens and how many invitations wait. Cached per request so both layouts share
// one set of lookups. Reads the user row, not the session, as accepting an invitation sets `canCreateWorkspace` mid-session. It asks only that someone is signed in,
// as the shell also draws an unverified account's email page.

/**
 * The viewer's own memberships, read once per request whoever asks: the shell, and the public
 * entry page's roles below. Keyed by the session, which `getSession` hands out once per request.
 */
const ownMemberships = cache(async (session: Session) => {
  const [memberships] = await membershipsOf(session, [session.userId]);
  // A viewer asking for their own id is never refused, so a Forbidden here
  // is a bug in the service, not a state to draw.
  if (!memberships || memberships instanceof Error) throw new Error('Own memberships refused');
  return memberships;
});

async function viewerFor(session: Session): Promise<ShellContext> {
  const [me, memberships] = await Promise.all([getMe(session), ownMemberships(session)]);
  // Only a verified address has invitations it may read, so an unverified
  // account costs no count; one statement otherwise, on every shell page.
  const pendingInvitations = me.emailVerified
    ? (await countReceivedInvitations(session, undefined)).totalCount
    : 0;
  return {
    viewer: {
      name: me.name,
      canCurate: curates(session.role),
      canCreate: me.canCreateWorkspace,
      verified: me.emailVerified,
      pendingInvitations,
    },
    // Alphabetical: the service's order is the database's, which looks random.
    workspaces: memberships
      .map(({ role, workspace: { id, slug, name } }) => ({
        id,
        slug,
        name,
        canReadMembers: rolePermits(role, { member: ['read'] }),
        // The statement the invite service asserts: the switcher keeps a viewer on the invitations page only where it opens.
        canInvite: rolePermits(role, { member: ['invite'] }),
        // The statement createWorkspaceIngredient asserts, so the button never offers a coven the save would refuse.
        canWrite: rolePermits(role, { ingredient: ['create'], inventory: ['update'] }),
      }))
      .sort(byCovenName),
  };
}

export const viewerOf = cache(async (): Promise<ShellContext> =>
  viewerFor(await requireSignedIn()),
);

/**
 * `viewerOf()` for a page a signed-out visitor may open: `null` instead of
 * the redirect to sign in. For the public frame and nothing else.
 */
export const viewerIfSignedIn = cache(async (): Promise<ShellContext | null> => {
  const session = await getSession();
  return session ? viewerFor(session) : null;
});

/**
 * The signed-in viewer's role in each of their covens, by coven id, or `null` signed out: for
 * the public entry page's cupboard choices, each of which a different statement permits.
 * The shell carries a coven's permissions as flags rather than its role, and this shares its read.
 */
export const covenRolesIfSignedIn = cache(
  async (): Promise<ReadonlyMap<string, WorkspaceRole> | null> => {
    const session = await getSession();
    if (!session) return null;
    const memberships = await ownMemberships(session);
    return new Map(memberships.map(({ role, workspace }) => [workspace.id, role]));
  },
);
