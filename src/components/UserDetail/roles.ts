import { labelOf } from '@/lib/options';
import type { WorkspaceRole } from '@/modules/coven';

export const WORKSPACE_ROLE_LABELS: readonly { value: WorkspaceRole; label: string }[] = [
  { value: 'owner', label: 'Steward' },
  { value: 'member', label: 'Practitioner' },
  { value: 'viewer', label: 'Observer' },
];

export const workspaceRoleLabel = (role: WorkspaceRole): string =>
  labelOf(WORKSPACE_ROLE_LABELS, role);

export const workspaceRoleRank = (role: WorkspaceRole): number =>
  WORKSPACE_ROLE_LABELS.findIndex(({ value }) => value === role);
