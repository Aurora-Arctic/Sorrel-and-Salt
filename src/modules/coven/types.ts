import type { workspaceMemberPauses } from './schema/workspace-member-pauses';
import type { workspaceMembers, workspaces } from './schema/workspaces';
import type { Membership } from './services/membership';

/** `'viewer' | 'member' | 'owner'`, read off the column rather than restated. */
export type WorkspaceRole = (typeof workspaceMembers.$inferSelect)['role'];

/** A user's seat in one workspace: the role it holds, and the pause standing on it, if any. `until` null is open-ended. */
export type WorkspaceSeat = {
  role: WorkspaceRole;
  pause: { until: Date | null } | null;
};

export type WorkspaceRow = typeof workspaces.$inferSelect;

/** One pause an owner set on a member's access to their coven, standing, run out or lifted. */
export type WorkspaceMemberPauseRow = typeof workspaceMemberPauses.$inferSelect;

/** One membership, carrying the workspace it is of. */
export type MembershipWithWorkspace = typeof workspaceMembers.$inferSelect & {
  workspace: WorkspaceRow;
};

/** The workspace a `/coven/[slug]` address names, with the caller's proof of membership in it. */
export type CovenMembership = {
  workspace: WorkspaceRow;
  membership: Membership;
};

/** The coven a paused member is shut out of, as the paused page names it: its name, and when the pause ends, or null for none. */
export type PausedCoven = { name: string; until: Date | null };

/** A member's address as the owner's Email column reads it. */
export type MemberEmail = {
  userId: string;
  address: string;
};

/** One member of one coven: what `WorkspaceMember.email` is loaded by. */
export type MemberKey = {
  workspaceId: string;
  userId: string;
};
