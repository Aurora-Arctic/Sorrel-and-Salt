import type { Route } from 'next';
import type { GroupKind } from '../GroupForm/types';
import type { GroupListKind } from './types';

// What tells one group vocabulary from another, in one place: its address,
// what it is called and what it calls its rows. The list, its links, the
// form, the page and the nav's tabs all read it (MB.115), so a new kind is an
// entry here. Its readers are `group-page.tsx`'s, the form's requests are
// `GroupForm`'s.
export const KINDS: Record<GroupKind, GroupListKind> = {
  category: {
    path: '/admin/category-groups' as Route,
    title: 'Category Groups',
    label: 'Category Group',
    noun: 'group',
    plural: 'groups',
    add: 'Add Group',
    holds: 'category',
  },
  form: {
    path: '/admin/form-groups' as Route,
    title: 'Form Groups',
    label: 'Form Group',
    noun: 'group',
    plural: 'groups',
    add: 'Add Group',
    holds: 'form',
  },
  tradition: {
    path: '/admin/deity-traditions' as Route,
    title: 'Deity Traditions',
    label: 'Tradition',
    noun: 'tradition',
    plural: 'traditions',
    add: 'Add Tradition',
    holds: 'deity',
  },
};
