import type { Route } from 'next';
import type { PagerHrefs } from '../../app/admin/types';
import type { ModalHeading } from '../Modal/types';
import type { GroupColors, PagePosition } from '../../lib/types';
import type { GroupedValueKind } from '../GroupedValueForm/types';

/** A grouped kind's group as the list names it: its column, its filter, and its address parameter. */
export interface GroupedValueListGroup {
  /** The group column's heading and the filter's label: "Group". */
  label: string;
  /** More than one group, title case, for the filter's empty choice: "All Groups". */
  plural: string;
  /** The address parameter the filter names a group by: `group`. */
  param: string;
}

/** How a kind's page is addressed, what it is titled, and what it calls its rows and its groups. */
export interface GroupedValueListKind {
  path: Route;
  /** The table's name, what a screen reader lists it as: "Zodiac Signs". */
  title: string;
  /** One row in title case, as a button says it: "Add Zodiac Sign". */
  label: string;
  /** One row, lower-case, as a sentence says it: "category". */
  noun: string;
  /** More than one, lower-case: "categories". */
  plural: string;
  /** The group, for a grouped kind; a flat kind (a planet, a zodiac sign) has none. */
  group?: GroupedValueListGroup;
}

/** One value as the list shows it: its group by name and colours, and the address that opens it to edit. */
export interface GroupedValueListEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** The group's name; `''` for a flat kind, which shows no group column. */
  groupName: string;
  /** The group's chip pair, which its name is drawn in; none draws it plain. */
  groupColors?: GroupColors;
  editHref: Route;
  /** The head of its edit modal, which a press shows at once while the form loads (M9.18). */
  editHeading: ModalHeading;
}

export interface GroupedValueListProps extends Partial<PagerHrefs> {
  kind: GroupedValueKind;
  /** This page's rows, in the service's order. */
  values: readonly GroupedValueListEntry[];
  /** The filter the page shows, which the form starts from and compares against. */
  filter: GroupedValueListFilter;
  /** Every live group of the kind, alphabetical (MB.35): the group filter's choices; none for a flat kind. */
  groups?: readonly GroupedValueGroupOption[];
  /** Where this page stands among them all, for the pager. */
  position?: PagePosition;
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
  /** A group's slug, written under the kind's group `param`. */
  group?: string;
  after?: string;
  before?: string;
}

/** What the filter form starts from: the kind, the page's filter, and the groups it offers. */
export interface GroupedValueListFilterProps {
  kind: GroupedValueKind;
  filter: GroupedValueListFilter;
  groups: readonly GroupedValueGroupOption[];
}
