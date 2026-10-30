import type { WorkspaceRole } from '@/modules/coven';

/** A member the only owner could hand the coven to. */
export interface Successor {
  userId: string;
  /** The name the picker shows. */
  name: string;
  /** Their role now, which the picker shows beside the name. */
  role: WorkspaceRole;
}

export interface LeaveWorkspaceButtonProps {
  /** The workspace's id, which leaving names. */
  workspaceId: string;
  /** The workspace's name, which the confirmation repeats back. */
  name: string;
  /**
   * Given only to the coven's sole owner, whom the last-owner guard would stop: the members
   * they could make an owner, empty when they are the only member. Its presence, even empty,
   * turns the confirmation into the guided exit; absent, Leave is the plain confirmation.
   */
  successors?: readonly Successor[];
}

export interface OwnerExitProps extends Pick<LeaveWorkspaceButtonProps, 'workspaceId' | 'name'> {
  successors: readonly Successor[];
}

/** What the only owner chooses happens to the coven as they leave. */
export type WayOut = 'hand' | 'delete';
