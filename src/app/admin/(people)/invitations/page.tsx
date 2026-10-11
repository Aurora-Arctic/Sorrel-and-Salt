import type { Metadata } from 'next';
import AdminInvitations from '../../../../components/AdminInvitations';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../../../lib/primary-admin';
import { requireAdminSession } from '../../../../lib/request-session';
import { adminRoleChangePauseState, listPendingAdminInvitations } from '@/modules/identity';

export const metadata: Metadata = {
  title: 'Admin Invitations — Admin — Sorrel & Salt',
};

// The pending admin invitations (MB.70), Invite Admin, and Revoke on each:
// the People page's Invitations tab, a tab of its own since MB.115 rather
// than a section beneath the user list. The page and GraphQL end at the same
// identity services (CLAUDE.md rule 1), which are the guard
// (claude-docs/auth/admin-users.md, "Inviting an admin").
export default async function AdminInvitationsPage() {
  const session = await requireAdminSession();
  const [adminChanges, pending] = await Promise.all([
    // Whether admin changes are paused, which locks Invite and Revoke for
    // every admin but the primary one (MB.63).
    adminRoleChangePauseState(session),
    // Newest first.
    listPendingAdminInvitations(session),
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
      locked={
        adminChanges.paused && !adminChanges.canToggle ? ADMIN_CHANGES_PAUSED_REFUSAL : undefined
      }
    />
  );
}
