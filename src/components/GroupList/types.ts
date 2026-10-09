import type { Route } from 'next';
import type { GroupKind } from '../GroupForm/types';

/** One group as the list shows it, and the address that opens it to edit. */
export interface GroupListEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** A category group's chip pair, which its name is drawn in; a form group has none. */
  colorDark?: string;
  colorLight?: string;
  editHref: Route;
}

export interface GroupListProps {
  kind: GroupKind;
  groups: readonly GroupListEntry[];
  previousHref?: Route;
  nextHref?: Route;
  /** Where this page stands among them all, for the pager; none says nothing of it. */
  position?: { page: number; pages: number };
}

/** Where the list stands: the cursor of the page a modal opens over. */
export interface GroupsPlace {
  after?: string;
  before?: string;
}

/** Which modal the address opens: the empty one, or a group's by slug. */
export type GroupsDialog = 'new' | { edit: string };
