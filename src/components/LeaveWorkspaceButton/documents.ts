import { graphql } from '@/lib/graphql-document';

// Shared by the plain Leave and the steward's guided exit: one operation each, so codegen
// finds the leave once.
export const LeaveWorkspaceDocument = graphql(`
  mutation LeaveWorkspace($workspaceId: ID!) {
    leaveWorkspace(workspaceId: $workspaceId)
  }
`);
