import InviteDialog from '../../../../../components/InviteDialog';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutParams } from '../types';

export default async function InviteAction({ params }: CovenLayoutParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  return rolePermits(membership.role, { member: ['invite'] }) ? (
    <InviteDialog workspaceId={workspace.id} />
  ) : null;
}
