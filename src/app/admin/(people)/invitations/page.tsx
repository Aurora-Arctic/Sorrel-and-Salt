import type { Metadata } from 'next';
import AdminInvitations from '../../../../components/AdminInvitations';
import { requireAdminSession } from '../../../../lib/request-session';
import { listPendingAdminInvitations } from '@/modules/identity';
import { invitationsLock } from './lock';
import type { AdminInvitationsPageProps } from './types';

export const metadata: Metadata = {
  title: 'Admin Invitations — Admin — Sorrel & Salt',
};

// The pending admin invitations (MB.70) with Revoke on each, and the invite
// form `?invite` opens over them: the People page's Invitations tab, a tab of
// its own since MB.115 rather than a section beneath the user list. Invite
// Admin is the tab's action, beside the heading (`../@action/invitations`).
// The page and GraphQL end at the same identity services (CLAUDE.md rule 1),
// which are the guard (claude-docs/auth/admin-users.md, "Inviting an admin").
export default async function AdminInvitationsPage({ searchParams }: AdminInvitationsPageProps) {
  const session = await requireAdminSession();
  const [locked, pending, params] = await Promise.all([
    // Whether admin changes are paused, which locks Invite and Revoke for
    // every admin but the primary one (MB.63).
    invitationsLock(session),
    // Newest first.
    listPendingAdminInvitations(session),
    searchParams,
  ]);
  // What the list shows of each: no token or hash leaves the page.
  const invitations = pending.map(({ id, email, note, expiresAt }) => ({
    id,
    email,
    note,
    expiresAt,
  }));

  return (
    <AdminInvitations
      invitations={invitations}
      locked={locked}
      // By presence: `?invite` is written bare. Never while locked.
      inviting={!locked && params.invite !== undefined}
    />
  );
}
