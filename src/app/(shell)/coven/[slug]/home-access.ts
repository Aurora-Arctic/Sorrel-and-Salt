import type { WorkspaceRole } from '@/modules/coven';
import { covenAccessOf } from '@/lib/coven-access';
import type { CovenHomeAccess } from '@/components/CovenHome/types';

/** The four flags the coven home page draws, read once for both the layout's skeleton and the page, so the skeleton never offers a button the page drops. */
export function homeAccessOf(role: WorkspaceRole): CovenHomeAccess {
  const access = covenAccessOf(role);
  return {
    canDelete: access.canDeleteCoven,
    canReadMembers: access.canReadMembers,
    canInvite: access.canInvite,
    canRename: access.canUpdateCoven,
  };
}
