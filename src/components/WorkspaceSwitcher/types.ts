export interface SwitcherWorkspace {
  slug: string;
  name: string;
  canReadMembers: boolean;
  canInvite: boolean;
  /** The pause a steward set on the viewer's seat there, or null: its row is marked with when the pause ends. `until` null is open-ended. */
  paused: { until: Date | null } | null;
}

export interface WorkspaceSwitcherProps {
  workspaces: readonly SwitcherWorkspace[];
  canCreate?: boolean;
}
