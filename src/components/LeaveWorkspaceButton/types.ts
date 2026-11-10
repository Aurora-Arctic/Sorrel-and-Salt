import type { WorkspaceRole } from '@/modules/coven';

export interface Successor {
  userId: string;
  name: string;
  role: WorkspaceRole;
}

export interface LeaveWorkspaceButtonProps {
  workspaceId: string;
  name: string;
  /**
   * Given only to the coven's sole steward, whom the last-steward guard would stop: the members
   * they could make a steward, empty when they are the only member. Its presence, even empty,
   * turns the confirmation into the guided exit; absent, Leave is the plain confirmation.
   */
  successors?: readonly Successor[];
  quiet?: boolean;
}

export interface OwnerExitProps extends Pick<LeaveWorkspaceButtonProps, 'workspaceId' | 'name'> {
  successors: readonly Successor[];
}

export type WayOut = 'hand' | 'delete';
