import type { ADMIN_PAGES } from '../../../components/AdminNav/sections';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type {
  EditedGroupedValue,
  GroupedValueGroupChoice,
  GroupedValueKind,
} from '../../../components/GroupedValueForm/types';
import type { EditedGroup, GroupChoice, GroupKind } from '../../../components/GroupForm/types';
import type { ModalHeading } from '../../../components/Modal/types';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import type { GroupFilter } from '@/modules/vocabulary';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface AdminLayoutProps {
  children: ReactNode;
}

export interface TabbedLayoutProps extends AdminLayoutProps {
  action: ReactNode;
}

/** A list page's address as Next hands it over: each parameter may come once, many times or not at all. */
export interface ListSearchParams {
  query?: string | string[];
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

export interface ListPlace {
  query: string;
  /** At most one cursor: `before` is dropped when `after` is given. Unreadable is none. */
  after: string | undefined;
  before: string | undefined;
  editSlug: string | undefined;
  adding: boolean;
}

export interface MissingNoticeProps {
  noun: string;
}

export interface ValueSearchParams extends ListSearchParams {
  group?: string | string[];
  tradition?: string | string[];
}

export interface ValuePageProps {
  kind: GroupedValueKind;
  searchParams: Promise<ValueSearchParams>;
}

export type ValueRouteProps = Pick<ValuePageProps, 'searchParams'>;

export interface ValueRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  groupId?: string;
  otherNames?: readonly string[];
  updatedBy: string;
  updatedAt: Date;
}

export interface ValueGroupRow {
  id: string;
  slug: string;
  name: string;
  colorDark?: string;
  colorLight?: string;
  icon?: FormGroupIcon | null;
}

export interface ValueFilter {
  query?: string;
  groupId?: string;
}

export interface ValueKindSource {
  list: (filter: ValueFilter, page: PageRequest) => Promise<PageEntry<ValueRow>[]>;
  count: (filter: ValueFilter, start: Cursor | undefined) => Promise<PageCount>;
  getBySlug: (slug: string) => Promise<ValueRow>;
  readGroups?: () => Promise<ValueGroupRow[]>;
}

export interface OpenedValue {
  heading: ModalHeading;
  value?: EditedGroupedValue;
}

export interface ValueDialogProps {
  kind: GroupedValueKind;
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedValue;
  groups: readonly GroupedValueGroupChoice[];
}

export type GroupSearchParams = ListSearchParams;

export type GroupRouteProps = Pick<GroupPageProps, 'searchParams'>;

export interface GroupPageProps {
  kind: GroupKind;
  searchParams: Promise<GroupSearchParams>;
}

export interface GroupRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  colorDark?: string;
  colorLight?: string;
  icon?: FormGroupIcon | null;
  updatedBy: string;
  updatedAt: Date;
}

export interface GroupKindPage {
  search: boolean;
  list: (page: PageRequest, filter?: GroupFilter) => Promise<PageEntry<GroupRow>[]>;
  count: (start: Cursor | undefined, filter?: GroupFilter) => Promise<PageCount>;
  getBySlug: (slug: string) => Promise<GroupRow>;
  countMembers: (groupId: string) => Promise<number>;
}

export interface OpenedGroup {
  heading: ModalHeading;
  group?: EditedGroup;
  memberCount?: number;
}

export interface GroupDialogProps {
  kind: GroupKind;
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedGroup;
  groups: readonly GroupChoice[];
}

export type TabbedPageKey = Exclude<keyof typeof ADMIN_PAGES, 'compendium'>;

export interface AddActionProps {
  href: Route;
  /** The head of the modal it opens, "Add Category", shown at once while the form loads. */
  heading: ModalHeading;
  /** True when the dialog draws its form from the address in the browser: a press uses `pushState`. */
  drawnHere?: boolean;
  /** The label, "Add Category": the link's name at every width, and the tip over the plus at a phone's. */
  children: string;
}
