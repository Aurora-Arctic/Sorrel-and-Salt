import { graphql } from '../../gql';

export const LeaveWorkspaceDocument = graphql(`
  mutation LeaveWorkspace($workspaceId: ID!) {
    leaveWorkspace(workspaceId: $workspaceId)
  }
`);
