import type { WorkspaceRole } from '@/modules/coven';
import type { CovenHomeAccess } from '../CovenHome/types';

/** What the coven layout knows of the coven it is mounted for: enough to draw its home page's words before the page arrives. */
export interface CovenFacts {
  slug: string;
  name: string;
  demo: boolean;
  role: WorkspaceRole;
  access: CovenHomeAccess;
}
