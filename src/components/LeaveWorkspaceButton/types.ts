import type { WorkspaceRole } from '@/modules/coven';

/** A member the only steward could hand the coven to. */
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
   * Given only to the coven's sole steward, whom the last-steward guard would stop: the members
   * they could make a steward, empty when they are the only member. Its presence, even empty,
   * turns the confirmation into the guided exit; absent, Leave is the plain confirmation.
   */
  successors?: readonly Successor[];
  /** Draw Leave Coven quiet (`btn--quiet`), where leaving is a page's secondary action; its confirm stays red. */
  quiet?: boolean;
}

export interface OwnerExitProps extends Pick<LeaveWorkspaceButtonProps, 'workspaceId' | 'name'> {
  successors: readonly Successor[];
}

/** What the only steward chooses happens to the coven as they leave. */
export type WayOut = 'hand' | 'delete';
