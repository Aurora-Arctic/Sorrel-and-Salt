import type { WorkspaceRole } from '@/modules/coven';

// A coven role as an admin reads it, written like UserList/roles.ts.

/** Each role and its label, most to least powerful: the order a table lists them in. */
export const WORKSPACE_ROLE_LABELS: readonly { value: WorkspaceRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

/** A role's label: "Owner" for `owner`. */
export const workspaceRoleLabel = (role: WorkspaceRole): string =>
  WORKSPACE_ROLE_LABELS.find(({ value }) => value === role)?.label ?? role;

/** A role's place in the table's order: owners first. */
export const workspaceRoleRank = (role: WorkspaceRole): number =>
  WORKSPACE_ROLE_LABELS.findIndex(({ value }) => value === role);
