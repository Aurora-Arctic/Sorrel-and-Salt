import type { Route } from 'next';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { ModalHeading } from '../Modal/types';
import type { GroupColors, PagePosition, PagerHrefs } from '../../lib/types';
import type { UpdatedStamp } from '../DataTable/types';
import type { GroupKind } from '../GroupForm/types';

export interface GroupListEntry extends Partial<GroupColors>, UpdatedStamp {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: FormGroupIcon | null;
  editHref: Route;
  editHeading: ModalHeading;
}

export interface GroupListProps extends Partial<PagerHrefs<Route>> {
  kind: GroupKind;
  groups: readonly GroupListEntry[];
  position?: PagePosition;
  /**
   * The name search the page shows, `''` for none; absent, the list draws no
   * filter row at all, as a kind without a search (`group-page.tsx`).
   */
  filter?: GroupListFilter;
}

export interface GroupListFilter {
  query: string;
}

export interface GroupListFilterProps {
  kind: GroupKind;
  filter: GroupListFilter;
}

export interface GroupsPlace {
  query?: string;
  after?: string;
  before?: string;
}

export interface GroupListKind {
  path: Route;
  title: string;
  label: string;
  noun: string;
  plural: string;
  add: string;
  holds: 'category' | 'form' | 'deity';
}
