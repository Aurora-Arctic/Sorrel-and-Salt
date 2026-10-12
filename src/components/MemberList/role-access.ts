import type { WorkspaceRole } from '@/modules/coven';

// What each coven role may do, in the words the role picker shows beside it
// (DESIGN.md §5, the roles table). A statement of the role, never a rank.
export const WORKSPACE_ROLE_ACCESS: Record<WorkspaceRole, string> = {
  owner:
    'Everything a member can do, plus inviting and removing people, changing roles, renaming the coven and deleting it.',
  member: 'Reads and writes the ingredients and the grimoire, and sees who else is in the coven.',
  viewer: 'Reads only. A viewer writes nothing.',
};
