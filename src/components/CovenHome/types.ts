import type { ReactNode } from 'react';
import type { WorkspaceRole } from '@/modules/coven';

/** The three statements the page branches on. */
export interface CovenHomeAccess {
  canDelete: boolean;
  canReadMembers: boolean;
  canInvite: boolean;
  canRename: boolean;
}

export interface CovenHomeProps {
  slug: string;
  role: WorkspaceRole;
  /** What the role may do here, read from the access statements by the caller (a skeleton, in the browser, cannot read them). */
  access: CovenHomeAccess;
  /** The coven's name. Left out only by a skeleton that does not know it: the title and the lede are bars. */
  name?: string;
  demo?: boolean;
  /** Draws the page's words as plain hidden text, for a skeleton: no links, no ids, no buttons. */
  pending?: boolean;
  /** The Leave Coven button; a skeleton draws a button-shaped label instead. */
  leave?: ReactNode;
  /** The rename form, drawn only where the role may rename and the coven is not the demo. */
  rename?: ReactNode;
  /** The Delete Coven button, drawn only for a steward. */
  remove?: ReactNode;
}
