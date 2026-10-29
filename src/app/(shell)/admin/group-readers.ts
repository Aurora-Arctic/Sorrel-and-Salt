import 'server-only';
import { cache } from 'react';
import type { GroupListKind } from '../../../components/GroupList/types';
import { MAX_PAGE_SIZE, resolvePage } from '../../../lib/pagination';
import type { PageEntry, PageRequest } from '../../../lib/types';
import {
  listCategoryGroups,
  listDeityTraditions,
  listIngredientFormGroups,
} from '@/modules/vocabulary';
import type { ValueGroupRow } from './types';

// Each grouped kind's groups on one read, shared by the value page and the group page so the
// request reads them once. A file of its own, not `value-kinds.ts`, so the group page does not
// reach every value reader to get three lists.

/**
 * Every group of a kind on one page of the maximum, as groups are few. The modal picks by id, the
 * filter by slug. Cached, so the request reads them once.
 */
const allGroups = <T extends ValueGroupRow>(list: (page: PageRequest) => Promise<PageEntry<T>[]>) =>
  cache(async (): Promise<ValueGroupRow[]> => {
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

/** The groups of each kind that has some, by the value kind they hold. */
export const GROUP_READERS: Record<GroupListKind['holds'], () => Promise<ValueGroupRow[]>> = {
  category: allGroups(listCategoryGroups),
  form: allGroups(listIngredientFormGroups),
  // A deity's group is its tradition.
  deity: allGroups(listDeityTraditions),
};
