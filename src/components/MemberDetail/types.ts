import type { MemberListEntry } from '../MemberList/types';

export interface MemberDetailProps {
  workspaceId: string;
  member: MemberListEntry;
  currentUserId: string;
  canChangeRoles?: boolean;
  /** Whether the viewer may pause a member's access (`member: pause`); off by default. Never offered on a steward. */
  canPause?: boolean;
  canRemove?: boolean;
  /** Called once the member is removed: the modal closes, since the row is gone. */
  onRemoved?: () => void;
}

export interface CovenAccessPanelProps {
  workspaceId: string;
  userId: string;
  name: string;
  standing: { until: Date | null } | null;
}
