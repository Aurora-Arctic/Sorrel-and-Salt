export interface DeleteWorkspaceButtonProps {
  workspaceId: string;
  name: string;
  inModal?: boolean;
  /**
   * Pressed by the coven's only steward: the question leaves out "other stewards
   * included", since there are none.
   */
  onlyOwner?: boolean;
}
