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

/** A tabbed page's layout: the open tab's content, and its action from the `@action` slot. */
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

/** Where on a list page the address puts the admin, as `readListPlace` reads it. */
export interface ListPlace {
  /** The name filter, trimmed; `''` for none, as a native submit's blank `query=` is. */
  query: string;
  /** At most one cursor: `before` is dropped when `after` is given. Unreadable is none. */
  after: string | undefined;
  before: string | undefined;
  /** The slug `?edit=` names, if any. */
  editSlug: string | undefined;
  /** Whether `?new` is present, by presence alone. */
  adding: boolean;
}

export interface MissingNoticeProps {
  /** The row the page lists, singular and lower case: "category", "compendium entry". */
  noun: string;
}

/** A curated value page's address: the list's place, and a grouped kind's group by slug. */
export interface ValueSearchParams extends ListSearchParams {
  group?: string | string[];
  tradition?: string | string[];
}

export interface ValuePageProps {
  kind: GroupedValueKind;
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<ValueSearchParams>;
}

/** What a value route's `page.tsx` is handed, which it passes on to `ValuePage`. */
export type ValueRouteProps = Pick<ValuePageProps, 'searchParams'>;

/** A curated value as the value page reads it, whatever its service calls the group. */
export interface ValueRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** The group it is filed under; none for a flat kind. */
  groupId?: string;
  /** A deity's other names, alphabetically; none for the other kinds. */
  otherNames?: readonly string[];
  /** Its audit stamps, which the Updated column reads. */
  updatedBy: string;
  updatedAt: Date;
}

/** A group as the value page reads it: the filter's slug, the form's id, and a category group's chip pair. */
export interface ValueGroupRow {
  id: string;
  slug: string;
  name: string;
  colorDark?: string;
  colorLight?: string;
  /** A form group's icon name, `null` for none; absent for the other kinds. */
  icon?: FormGroupIcon | null;
}

/** The filter a value page reads its list and count under: blank is `undefined`. */
export interface ValueFilter {
  query?: string;
  groupId?: string;
}

/** One kind's readers from `@/modules/vocabulary`, mapped onto the value page's own names. */
export interface ValueKindSource {
  list: (filter: ValueFilter, page: PageRequest) => Promise<PageEntry<ValueRow>[]>;
  count: (filter: ValueFilter, start: Cursor | undefined) => Promise<PageCount>;
  getBySlug: (slug: string) => Promise<ValueRow>;
  /** Every live group, alphabetical, on one page of the maximum; a flat kind has none. */
  readGroups?: () => Promise<ValueGroupRow[]>;
}

/** What a value page's address opens: an add, or the value it edits. */
export interface OpenedValue {
  /** "Add Category", or the edited value's eyebrow and name, and a deity's tradition. */
  heading: ModalHeading;
  /** The value edited; none for an add. */
  value?: EditedGroupedValue;
}

export interface ValueDialogProps {
  kind: GroupedValueKind;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedValue;
  groups: readonly GroupedValueGroupChoice[];
}

/** A group page's address: the list's place, and a `query` read only by a kind that searches. */
export type GroupSearchParams = ListSearchParams;

/** What a group route's `page.tsx` is handed, which it passes on to `GroupPage`. */
export type GroupRouteProps = Pick<GroupPageProps, 'searchParams'>;

export interface GroupPageProps {
  kind: GroupKind;
  // A promise in Next 16 — must be awaited before use.
  searchParams: Promise<GroupSearchParams>;
}

/** A group as the group page reads it; a category group carries its chip pair. */
export interface GroupRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  colorDark?: string;
  colorLight?: string;
  /** A form group's icon name, `null` for none; absent for the other kinds. */
  icon?: FormGroupIcon | null;
  /** Its audit stamps, which the Updated column reads. */
  updatedBy: string;
  updatedAt: Date;
}

/** One group vocabulary's page readers, from `@/modules/vocabulary`; its copy is the kind table's (`GroupList/kinds.ts`). */
export interface GroupKindPage {
  /** Whether the list takes a name search (the traditions only); others read no `query`. */
  search: boolean;
  list: (page: PageRequest, filter?: GroupFilter) => Promise<PageEntry<GroupRow>[]>;
  count: (start: Cursor | undefined, filter?: GroupFilter) => Promise<PageCount>;
  getBySlug: (slug: string) => Promise<GroupRow>;
  /** How many live rows the group holds, which its delete must move. */
  countMembers: (groupId: string) => Promise<number>;
}

/** What a group page's address opens: an add, or the group it edits. */
export interface OpenedGroup {
  /** "Add Category Group", or the edited group's eyebrow and name. */
  heading: ModalHeading;
  /** The group edited; none for an add. */
  group?: EditedGroup;
  /** How many live rows the edited group holds. */
  memberCount?: number;
}

export interface GroupDialogProps {
  kind: GroupKind;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedGroup;
  groups: readonly GroupChoice[];
}

/** The admin pages that are tabbed pages, by their key in `ADMIN_PAGES`: every one but the single-tab compendium. */
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
