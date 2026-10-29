export interface DeleteWorkspaceButtonProps {
  /** The workspace's id, which the deletion names. */
  workspaceId: string;
  /** The workspace's name, which the confirmation repeats back. */
  name: string;
  /** Asks over the dialog it sits in rather than opening a second modal (the guided exit). */
  inModal?: boolean;
  /**
   * Pressed by the coven's only owner: the question leaves out "other owners
   * included", since there are none.
   */
  onlyOwner?: boolean;
}
