import InviteDialog from '../../../../../components/InviteDialog';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutParams } from '../types';

// Invite, at the end of the Members heading line on both tabs, for an owner only: the `@action`
// slot's page for each tab renders this one component. Decided by the permission
// (`member: invite`); the service refuses anyone else again.
export default async function InviteAction({ params }: CovenLayoutParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  return rolePermits(membership.role, { member: ['invite'] }) ? (
    <InviteDialog workspaceId={workspace.id} />
  ) : null;
}
