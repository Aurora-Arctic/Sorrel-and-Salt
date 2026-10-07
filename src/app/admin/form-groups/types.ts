import type { Route } from 'next';
import type { EditedGroup, GroupChoice } from '../../../components/GroupForm/types';

export interface AdminFormGroupsPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<GroupsSearchParams>;
}

/** The page's address: at most one cursor, and the modal open over it — `new` by presence, or `edit` by slug. */
export interface GroupsSearchParams {
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

export interface FormGroupDialogProps {
  title: string;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  group?: EditedGroup;
  groups: readonly GroupChoice[];
  /** How many live forms the edited group holds. */
  memberCount?: number;
}
