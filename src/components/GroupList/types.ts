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
  /**
   * The name search the page shows, `''` for none; absent, the list draws no
   * filter row at all, as a kind without a search (`group-page.tsx`).
   */
  filter?: GroupListFilter;
}

/** The list's filter as asked: a fragment of the name, blank for none. */
export interface GroupListFilter {
  query: string;
}

/** What the filter form starts from: the kind, and the search the page shows. */
export interface GroupListFilterProps {
  kind: GroupKind;
  filter: GroupListFilter;
}

/** Where the list stands: its name search, and the cursor of the page a modal opens over. */
export interface GroupsPlace {
  query?: string;
  after?: string;
  before?: string;
}

/** How a group list is named and what it calls its rows (`kinds.ts`). */
export interface GroupListKind {
  /** Its page's address. */
  path: Route;
  /**
   * The table's name, what a screen reader lists it as: the full name its
   * tab's short label, "Groups" or "Traditions", stands for (MB.115).
   */
  title: string;
  /** One group in title case, as a modal's title says it: "Category Group", "Tradition". */
  label: string;
  /** One row, lower-case, as a sentence says it: "tradition". */
  noun: string;
  /** More than one, lower-case: "traditions". */
  plural: string;
  /** The page header's Add, named as that button is (`group-page.tsx`): "Add Tradition". */
  add: string;
  /** The curated value kind its groups hold, whose nouns and groups' readers are that kind's. */
  holds: 'category' | 'form' | 'deity';
}
