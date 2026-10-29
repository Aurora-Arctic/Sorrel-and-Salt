import { graphql } from '../../gql';

// Shared by the plain Leave and the owner's guided exit: one operation each, so codegen
// finds the leave once.
export const LeaveWorkspaceDocument = graphql(`
  mutation LeaveWorkspace($workspaceId: ID!) {
    leaveWorkspace(workspaceId: $workspaceId)
  }
`);
