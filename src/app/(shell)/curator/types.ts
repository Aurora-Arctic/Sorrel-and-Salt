import type { Route } from 'next';
import type { ListSearchParams } from '../_admin/types';
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

export interface ValueSearchParams extends ListSearchParams {
  group?: string | string[];
  tradition?: string | string[];
}

export interface ValuePageProps {
  kind: GroupedValueKind;
  searchParams: Promise<ValueSearchParams>;
}

export type ValueRouteProps = Pick<ValuePageProps, 'searchParams'>;

/** What a curated vocabulary's rows, values and groups alike, share. */
interface CuratedRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface ValueRow extends CuratedRow {
  groupId?: string;
  otherNames?: readonly string[];
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

/** A curated vocabulary's dialog: its kind, where Close goes, what the address opens and the groups to choose from. */
interface EntityDialogProps<Kind, Opened, Choice> {
  kind: Kind;
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: Opened;
  groups: readonly Choice[];
}

export type ValueDialogProps = EntityDialogProps<
  GroupedValueKind,
  OpenedValue,
  GroupedValueGroupChoice
>;

export type GroupSearchParams = ListSearchParams;

export type GroupRouteProps = Pick<GroupPageProps, 'searchParams'>;

export interface GroupPageProps {
  kind: GroupKind;
  searchParams: Promise<GroupSearchParams>;
}

export interface GroupRow extends CuratedRow {
  colorDark?: string;
  colorLight?: string;
  icon?: FormGroupIcon | null;
}

/** A group as a value's choices and filter need it. */
export type ValueGroupRow = Pick<
  GroupRow,
  'id' | 'slug' | 'name' | 'colorDark' | 'colorLight' | 'icon'
>;

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

export type GroupDialogProps = EntityDialogProps<GroupKind, OpenedGroup, GroupChoice>;
