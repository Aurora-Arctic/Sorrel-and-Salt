import 'server-only';
import { cache } from 'react';
import type { GroupListKind } from '@/components/GroupList/types';
import { MAX_PAGE_SIZE, resolvePage } from '@/lib/pagination';
import type { PageEntry, PageRequest } from '@/lib/types';
import {
  listCategoryGroups,
  listDeityTraditions,
  listIngredientFormGroups,
} from '@/modules/vocabulary';
import type { ValueGroupRow } from './types';

// Each grouped kind's groups on one read, shared by the value page and the group page so the
// request reads them once. A file of its own, not `value-kinds.ts`, so the group page does not
// reach every value reader to get three lists.

const allGroups = <T extends ValueGroupRow>(list: (page: PageRequest) => Promise<PageEntry<T>[]>) =>
  cache(async (): Promise<ValueGroupRow[]> => {
    // One page of the maximum holds every group, as groups are few.
    const page = await resolvePage({ first: MAX_PAGE_SIZE }, list);
    return page.edges.map(({ node }) => ({
      id: node.id,
      slug: node.slug,
      name: node.name,
      colorDark: node.colorDark,
      colorLight: node.colorLight,
      icon: node.icon,
    }));
  });

export const GROUP_READERS: Record<GroupListKind['holds'], () => Promise<ValueGroupRow[]>> = {
  category: allGroups(listCategoryGroups),
  form: allGroups(listIngredientFormGroups),
  deity: allGroups(listDeityTraditions),
};
