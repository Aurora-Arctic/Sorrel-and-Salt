import InviteDialog from '../../../../../components/InviteDialog';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { covenAccessOf } from '@/lib/coven-access';
import type { CovenLayoutParams } from '../types';

export default async function InviteAction({ params }: CovenLayoutParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  return covenAccessOf(membership.role).canInvite ? (
    <InviteDialog workspaceId={workspace.id} />
  ) : null;
}
