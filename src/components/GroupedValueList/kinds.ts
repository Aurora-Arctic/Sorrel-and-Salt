import type { Route } from 'next';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import type { GroupedValueListKind } from './types';

// Each grouped vocabulary's address and nouns, which are all that tell its
// list from another's: a new kind is an entry here (MB.132).
export const KINDS: Record<GroupedValueKind, GroupedValueListKind> = {
  category: {
    path: '/admin/categories' as Route,
    noun: 'category',
    plural: 'categories',
    groupLabel: 'Group',
    groupPlural: 'groups',
    groupParam: 'group',
  },
  form: {
    path: '/admin/forms' as Route,
    noun: 'form',
    plural: 'forms',
    groupLabel: 'Group',
    groupPlural: 'groups',
    groupParam: 'group',
  },
  deity: {
    path: '/admin/deities' as Route,
    noun: 'deity',
    plural: 'deities',
    groupLabel: 'Tradition',
    groupPlural: 'traditions',
    groupParam: 'tradition',
  },
};
