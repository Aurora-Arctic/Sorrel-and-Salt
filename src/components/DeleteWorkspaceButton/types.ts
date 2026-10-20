export interface DeleteWorkspaceButtonProps {
  /** The workspace's id, which the deletion names. */
  workspaceId: string;
  /** The workspace's name, which the confirmation repeats back. */
  name: string;
  /** Asks over the dialog it sits in rather than opening a second modal (M6.16's guided exit). */
  inModal?: boolean;
  /**
   * Inside a modal, where the dialog says a refusal (the owner's exit, at its
   * top); `undefined` clears it. Without it, a notice beside the button.
   */
  onFailure?: (message: string | undefined) => void;
  /**
   * Pressed by the coven's only owner (M6.16): the question leaves out "other
   * owners included", since there are none.
   */
  onlyOwner?: boolean;
}
