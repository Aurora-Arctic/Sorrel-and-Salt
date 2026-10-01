import type { Session } from '@/lib/session';
import type { WorkspacePermission } from '@/modules/coven';

/** What a page or layout asks `assertMembership` for. */
export interface Ask {
  session: Session;
  workspaceId: string;
  permission: WorkspacePermission;
}
