import type { GroupKind } from '../GroupForm/types';
import type { GroupListKind } from './types';

// What tells one group vocabulary from another: its address, name and what it calls its rows. The list,
// links, form, page and nav's tabs all read it, so a new kind is an entry here.
export const KINDS: Record<GroupKind, GroupListKind> = {
  category: {
    path: '/admin/category-groups',
    title: 'Category Groups',
    label: 'Category Group',
    noun: 'group',
    plural: 'groups',
    add: 'Add Group',
    holds: 'category',
  },
  form: {
    path: '/admin/form-groups',
    title: 'Form Groups',
    label: 'Form Group',
    noun: 'group',
    plural: 'groups',
    add: 'Add Group',
    holds: 'form',
  },
  tradition: {
    path: '/admin/deity-traditions',
    title: 'Deity Traditions',
    label: 'Tradition',
    noun: 'tradition',
    plural: 'traditions',
    add: 'Add Tradition',
    holds: 'deity',
  },
};
