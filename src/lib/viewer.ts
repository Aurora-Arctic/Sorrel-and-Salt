import 'server-only';
import { cache } from 'react';
import { membershipsOf, rolePermits } from '@/modules/coven';
import { countReceivedInvitations, getMe } from '@/modules/identity';
import { requireSignedIn } from './request-session';
import type { ShellViewer, ShellWorkspace } from './types';

// What the application shell draws and the coven layout's switcher lists: the
// viewer, their covens, and how many coven invitations wait for them. Cached
// per request, so the shell layout and the coven layout beneath it share one
// set of lookups. It reads the user row, not the session, since accepting an
// invitation sets `canCreateWorkspace` mid-session. It asks only that someone
// is signed in: the shell layout draws it round an unverified account's email
// page too, and the page beneath is what sends that account to the email page
// (MB.256).

export const viewerOf = cache(
  async (): Promise<{ viewer: ShellViewer; workspaces: ShellWorkspace[] }> => {
    const session = await requireSignedIn();
    const [me, [memberships]] = await Promise.all([
      getMe(session),
      membershipsOf(session, [session.userId]),
    ]);
    // Only a verified address has invitations it may read, so an unverified
    // account costs no count; one statement otherwise, on every shell page.
    const pendingInvitations = me.emailVerified
      ? (await countReceivedInvitations(session, undefined)).totalCount
      : 0;
    // A viewer asking for their own id is never refused, so a Forbidden here
    // is a bug in the service, not a state to draw.
    if (!memberships || memberships instanceof Error) throw new Error('Own memberships refused');
    return {
      viewer: {
        name: me.name,
        isAdmin: session.role === 'admin',
        canCreate: me.canCreateWorkspace,
        verified: me.emailVerified,
        pendingInvitations,
      },
      // Alphabetical: the service's order is the database's, which looks random.
      workspaces: memberships
        .map(({ role, workspace: { slug, name } }) => ({
          slug,
          name,
          canReadMembers: rolePermits(role, { member: ['read'] }),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
);
