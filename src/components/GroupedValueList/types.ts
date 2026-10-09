import type { Route } from 'next';
import type { GroupColors } from '../../lib/types';
import type { GroupedValueKind } from '../GroupedValueForm/types';

/** How a kind's page is addressed and what it calls its rows and its groups. */
export interface GroupedValueListKind {
  path: Route;
  /** One row, lower-case, as a sentence says it: "category". */
  noun: string;
  /** More than one, lower-case: "categories". */
  plural: string;
  /** The group column's heading and the filter's label: "Group". */
  groupLabel: string;
  /** More than one group, lower-case, for the filter's first option: "All groups". */
  groupPlural: string;
  /** The address parameter the filter names a group by: `group`. */
  groupParam: string;
}

/** One value as the list shows it: its group by name and colours, and the address that opens it to edit. */
export interface GroupedValueListEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  groupName: string;
  /** The group's chip pair, which its name is drawn in; none draws it plain. */
  groupColors?: GroupColors;
  editHref: Route;
}

export interface GroupedValueListProps {
  kind: GroupedValueKind;
  /** This page's rows, in the service's order. */
  values: readonly GroupedValueListEntry[];
  /** The filter the page shows, which the form starts from and compares against. */
  filter: GroupedValueListFilter;
  /** Every live group of the kind, alphabetical (MB.35): the group filter's choices. */
  groups: readonly GroupedValueGroupOption[];
  previousHref?: Route;
  nextHref?: Route;
  /** Where this page stands among them all, for the pager. */
  position?: { page: number; pages: number };
}

/** The list's filter as asked: the name query, and a group by slug, each blank for none. */
export interface GroupedValueListFilter {
  query: string;
  group: string;
}

/** A group the list can be narrowed to, named in the address by its slug. */
export interface GroupedValueGroupOption {
  slug: string;
  name: string;
}

/** Where the list stands: its filter, and the cursor of the page a modal opens over. */
export interface GroupedValuesPlace {
  query?: string;
  /** A group's slug, written under the kind's `groupParam`. */
  group?: string;
  after?: string;
  before?: string;
}

/** Which modal the address opens: the empty one, or a value's by slug. */
export type GroupedValuesDialog = 'new' | { edit: string };

/** What the filter form starts from: the kind, the page's filter, and the groups it offers. */
export type GroupedValueListFilterProps = Pick<GroupedValueListProps, 'kind' | 'filter' | 'groups'>;
