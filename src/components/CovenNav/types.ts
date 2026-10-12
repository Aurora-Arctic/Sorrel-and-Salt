import type { WorkspaceRole } from '@/modules/coven';

export interface CovenNavProps {
  slug: string;
  /** The caller's role in this coven, which decides the sections they are shown. */
  covenRole: WorkspaceRole;
}
