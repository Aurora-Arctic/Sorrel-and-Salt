import type { ADMIN_PAGES } from '../../components/AdminNav/sections';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type {
  EditedGroupedValue,
  GroupedValueGroupChoice,
  GroupedValueKind,
} from '../../components/GroupedValueForm/types';
import type { EditedGroup, GroupChoice, GroupKind } from '../../components/GroupForm/types';
import type { ModalHeading } from '../../components/Modal/types';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type { GroupFilter } from '@/modules/vocabulary';

export interface AdminLayoutProps {
  children: ReactNode;
}

/** A tabbed page's layout (MB.115): the open tab's content, and its action from the `@action` slot. */
export interface TabbedLayoutProps extends AdminLayoutProps {
  action: ReactNode;
}

/**
 * A list page's address as Next hands it over (MB.115, `list-page.ts`): any
 * parameter may come once, several times, or not at all. Each page's own
 * filter parameters sit beside these.
 */
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

/** One cursor, for the page before or the page after. */
export type PagerCursor = { after: string } | { before: string };

/** The pager's two ends; an end with no page is left out. */
export interface PagerHrefs {
  previousHref: Route | undefined;
  nextHref: Route | undefined;
}

export interface MissingNoticeProps {
  /** The row the page lists, singular and lower case: "category", "compendium entry". */
  noun: string;
}

/**
 * A curated value page's address (`value-page.tsx`): the list's place, and
 * a grouped kind's group by slug, under `group` or, for the deities,
 * `tradition`.
 */
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
}

/** A group as the value page reads it: the filter's slug, the form's id, and a category group's chip pair. */
export interface ValueGroupRow {
  id: string;
  slug: string;
  name: string;
  colorDark?: string;
  colorLight?: string;
}

/** The filter a value page reads its list and count under: blank is `undefined`. */
export interface ValueFilter {
  query?: string;
  groupId?: string;
}

/**
 * One kind's readers, from `@/modules/vocabulary` (`value-kinds.ts`), each
 * mapped onto the value page's own names, so the page reads every kind alike.
 */
export interface ValueKindSource {
  list: (filter: ValueFilter, page: PageRequest) => Promise<PageEntry<ValueRow>[]>;
  count: (filter: ValueFilter, start: Cursor | undefined) => Promise<PageCount>;
  getBySlug: (slug: string) => Promise<ValueRow>;
  /** Every live group, alphabetical, on one page of the maximum; a flat kind has none. */
  readGroups?: () => Promise<ValueGroupRow[]>;
}

export interface ValueDialogProps {
  kind: GroupedValueKind;
  /** "Add Category", or the edited value's eyebrow and name, and a deity's tradition (MB.115). */
  heading: ModalHeading;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  value?: EditedGroupedValue;
  groups: readonly GroupedValueGroupChoice[];
}

/**
 * A group page's address (`group-page.tsx`): the list's place, its `query`
 * read only by a kind that searches (`GroupKindPage.search`).
 */
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
}

/** One group vocabulary's page: its copy and its readers, from `@/modules/vocabulary`. */
export interface GroupKindPage {
  /** One group, lower-case, as the missing notice says it: "group". */
  noun: string;
  /** The Add link's label: "Add Group". */
  add: string;
  /** The add modal's title, "Add Category Group"; the edit modal's eyebrow, "Edit Category Group". */
  addTitle: string;
  editEyebrow: string;
  /**
   * Whether the list takes a name search (MB.115): the traditions' alone. A
   * kind without one reads no `query` from its address, so its readers are
   * handed no filter and need take none.
   */
  search: boolean;
  list: (page: PageRequest, filter?: GroupFilter) => Promise<PageEntry<GroupRow>[]>;
  count: (start: Cursor | undefined, filter?: GroupFilter) => Promise<PageCount>;
  getBySlug: (slug: string) => Promise<GroupRow>;
  /** How many live rows the group holds, which its delete must move. */
  countMembers: (groupId: string) => Promise<number>;
}

export interface GroupDialogProps {
  kind: GroupKind;
  /** "Add Category Group", or the edited group's eyebrow and name (MB.115). */
  heading: ModalHeading;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  group?: EditedGroup;
  groups: readonly GroupChoice[];
  /** How many live rows the edited group holds. */
  memberCount?: number;
}

/** The admin pages that are tabbed pages, by their key in `ADMIN_PAGES`: every one but the single-tab compendium. */
export type TabbedPageKey = Exclude<keyof typeof ADMIN_PAGES, 'compendium'>;
