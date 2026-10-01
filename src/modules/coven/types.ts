import type { workspaceMembers, workspaces } from './schema/workspaces';

/** `'viewer' | 'member' | 'owner'`, read off the column rather than restated. */
export type WorkspaceRole = (typeof workspaceMembers.$inferSelect)['role'];

export type WorkspaceRow = typeof workspaces.$inferSelect;

/** One membership, carrying the workspace it is of. */
export type MembershipWithWorkspace = typeof workspaceMembers.$inferSelect & {
  workspace: WorkspaceRow;
};
