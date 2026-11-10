import type { OriginNotifier } from '../../lib/types';
import type { workspaceMemberPauses } from './schema/workspace-member-pauses';
import type { workspaceMembers, workspaces } from './schema/workspaces';
import type { Membership } from './services/membership';

export type WorkspaceRole = (typeof workspaceMembers.$inferSelect)['role'];

/** `until` null is open-ended. */
export type WorkspaceSeat = {
  role: WorkspaceRole;
  pause: { until: Date | null } | null;
};

export type WorkspaceRow = typeof workspaces.$inferSelect;

export type WorkspaceMemberPauseRow = typeof workspaceMemberPauses.$inferSelect;

export type MembershipWithWorkspace = typeof workspaceMembers.$inferSelect & {
  workspace: WorkspaceRow;
};

export type MembershipOfUser = MembershipWithWorkspace & Pick<WorkspaceSeat, 'pause'>;

export type CovenMembership = {
  workspace: WorkspaceRow;
  membership: Membership;
};

export type PausedCoven = { id: string; name: string; until: Date | null };

export type MemberEmail = {
  userId: string;
  address: string;
};

export type MemberKey = {
  workspaceId: string;
  userId: string;
};

export type MemberPauseNotifier = OriginNotifier;

/** Carries nothing of the member's. */
export type MemberPauseMail = {
  kind: 'member-pause';
  pauseId: string;
  origin: string;
};
