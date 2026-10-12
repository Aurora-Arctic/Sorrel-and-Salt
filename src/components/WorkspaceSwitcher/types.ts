/** One workspace the viewer belongs to, as the switcher needs it. */
export interface SwitcherWorkspace {
  slug: string;
  name: string;
  /** The viewer's role there may read its members; false sends a switch from a people page to the index. */
  canReadMembers: boolean;
}

export interface WorkspaceSwitcherProps {
  /** Every workspace the viewer is a member of, in the order to list them. */
  workspaces: readonly SwitcherWorkspace[];
  /**
   * The viewer holds `canCreateWorkspace`, read from the row: the list ends
   * with a Create Coven choice going to the create page (M9.16). Hiding it
   * is presentation; the creation service is still the gate.
   */
  canCreate?: boolean;
}
