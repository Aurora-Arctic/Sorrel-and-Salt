export interface SwitcherWorkspace {
  slug: string;
  name: string;
  /** The viewer's role there may read its members; false sends a switch from a people page to
   * the index. */
  canReadMembers: boolean;
  /** Only a steward may invite; false sends a switch from invitations to the members page. */
  canInvite: boolean;
  /** The pause a steward set on the viewer's seat there, or null: its row is marked with when the pause ends. `until` null is open-ended. */
  paused: { until: Date | null } | null;
}

export interface WorkspaceSwitcherProps {
  workspaces: readonly SwitcherWorkspace[];
  /** The viewer holds `canCreateWorkspace`: the list ends with Create Coven. Presentation
   * only; the service gates. */
  canCreate?: boolean;
}
