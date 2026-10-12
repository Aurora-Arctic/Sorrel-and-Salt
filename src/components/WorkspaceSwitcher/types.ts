/** One workspace the viewer belongs to, as the switcher needs it. */
export interface SwitcherWorkspace {
  slug: string;
  name: string;
}

export interface WorkspaceSwitcherProps {
  /** Every workspace the viewer is a member of, in the order to list them. */
  workspaces: readonly SwitcherWorkspace[];
}
