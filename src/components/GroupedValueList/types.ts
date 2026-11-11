import type { Route } from 'next';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { UpdatedStamp } from '../DataTable/types';
import type { ModalHeading } from '../Modal/types';
import type { GroupColors, ListKind, PagePosition, PagerHrefs } from '../../lib/types';
import type { GroupedValueKind } from '../GroupedValueForm/types';

interface GroupedValueListGroup {
  label: string;
  plural: string;
  param: string;
}

export interface GroupedValueListKind extends ListKind<Route> {
  group?: GroupedValueListGroup;
}

export interface GroupedValueListEntry extends UpdatedStamp {
  id: string;
  name: string;
  slug: string;
  description: string;
  otherNames?: readonly string[];
  groupName: string;
  groupColors?: GroupColors;
  groupIcon?: FormGroupIcon | null;
  editHref: Route;
  editHeading: ModalHeading;
}

export interface GroupedValueListProps extends Partial<PagerHrefs<Route>> {
  kind: GroupedValueKind;
  values: readonly GroupedValueListEntry[];
  filter: GroupedValueListFilter;
  groups?: readonly GroupedValueGroupOption[];
  position?: PagePosition;
}

export interface GroupedValueListFilter {
  query: string;
  group: string;
}

export interface GroupedValueGroupOption {
  slug: string;
  name: string;
}

export interface GroupedValuesPlace {
  query?: string;
  group?: string;
  after?: string;
  before?: string;
}

export interface GroupedValueListFilterProps {
  kind: GroupedValueKind;
  filter: GroupedValueListFilter;
  groups: readonly GroupedValueGroupOption[];
}
