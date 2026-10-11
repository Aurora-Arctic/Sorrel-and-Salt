import type { GroupKind } from '../GroupForm/types';
import type { GroupListKind } from './types';

// What tells one group list from another: what it is called and what it
// calls its rows. Its address is `href.ts`'s, its readers `group-page.tsx`'s.
export const KINDS: Record<GroupKind, GroupListKind> = {
  category: { title: 'Category Groups', noun: 'group', plural: 'groups', add: 'Add Group' },
  form: { title: 'Form Groups', noun: 'group', plural: 'groups', add: 'Add Group' },
  tradition: {
    title: 'Deity Traditions',
    noun: 'tradition',
    plural: 'traditions',
    add: 'Add Tradition',
  },
};
