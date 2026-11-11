import { labelOf } from '@/lib/options';
import type { WorkspaceRole } from '@/modules/coven';

// How the three coven roles are shown, and what each may do in the words the role picker shows beside it
// (DESIGN.md §5, the roles table). A statement of the role, never a rank.
export const WORKSPACE_ROLE_LABELS: readonly { value: WorkspaceRole; label: string }[] = [
  { value: 'owner', label: 'Steward' },
  { value: 'member', label: 'Practitioner' },
  { value: 'viewer', label: 'Observer' },
];

export const workspaceRoleLabel = (role: WorkspaceRole): string =>
  labelOf(WORKSPACE_ROLE_LABELS, role);

export const workspaceRoleRank = (role: WorkspaceRole): number =>
  WORKSPACE_ROLE_LABELS.findIndex(({ value }) => value === role);

export const WORKSPACE_ROLE_ACCESS: Record<WorkspaceRole, string> = {
  owner:
    'Everything a practitioner can do, plus renaming the coven, inviting, pausing and removing people, changing roles, and deleting the coven.',
  member: 'Reads and writes the ingredients and the grimoire, and sees who else is in the coven.',
  viewer: 'Reads only. An observer writes nothing.',
};
