import type { MemberListEntry } from '../MemberList/types';

export interface MemberDetailProps {
  workspaceId: string;
  /** The member the modal is open on, as the members page read their row. */
  member: MemberListEntry;
  /** The signed-in user, who is offered no Remove on their own modal. */
  currentUserId: string;
  /** Whether the viewer may change a member's role (`member: update`); off by default. */
  canChangeRoles?: boolean;
  /** Whether the viewer may pause a member's access (`member: pause`); off by default. Never offered on an owner. */
  canPause?: boolean;
  /** Whether the viewer may remove a member (`member: remove`); off by default. */
  canRemove?: boolean;
  /** Called once the member is removed: the modal closes, since the row is gone. */
  onRemoved?: () => void;
}

/** The member modal's Coven Access, for an owner. */
export interface CovenAccessPanelProps {
  workspaceId: string;
  /** The member the pause is for. */
  userId: string;
  name: string;
  /** The pause that stands on them now, with its end or null for none; null while their access is open. */
  standing: { until: Date | null } | null;
}
