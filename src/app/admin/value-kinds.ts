import 'server-only';
import { cache } from 'react';
import type { GroupedValueKind } from '../../components/GroupedValueForm/types';
import { MAX_PAGE_SIZE, resolvePage } from '../../lib/pagination';
import type { PageEntry, PageRequest } from '../../lib/types';
import {
  countAstrologyValues,
  countCategories,
  countDeities,
  countIngredientFormValues,
  getAstrologyValueBySlug,
  getCategoryBySlug,
  getDeityBySlug,
  getIngredientFormValueBySlug,
  listAstrologyValues,
  listCategories,
  listCategoryGroups,
  listDeities,
  listDeityTraditions,
  listIngredientFormGroups,
  listIngredientFormValues,
} from '@/modules/vocabulary';
import type { ValueGroupRow, ValueKindSource, ValueRow } from './types';

// Each curated value page's readers, from the vocabulary module: what tells
// `/admin/categories` from `/admin/planets` once the copy is the list's
// (`GroupedValueList/kinds.ts`). Written once (MB.115) after five pages had
// each carried the same reads under their own names. Every reader is mapped
// onto the page's own names here, so `value-page.tsx` reads every kind alike:
// the deities' service calls the group `traditionId`, and the astrology
// services take the vocabulary first.

/** One page's rows, each mapped onto the page's names. */
const mapped = async <T>(
  entries: Promise<PageEntry<T>[]>,
  toRow: (node: T) => ValueRow,
): Promise<PageEntry<ValueRow>[]> =>
  (await entries).map((entry) => ({ ...entry, node: toRow(entry.node) }));

/**
 * Every group of a kind on one page of the maximum: eight category groups,
 * six form groups and thirty-five traditions are seeded, and an admin adds
 * one rarely (MB.35). The modal picks one by id, the filter by slug, and the
 * list names each, a category's in its chip. Cached, so the request reads
 * them once.
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
    }));
  });

/** A flat vocabulary, read through the astrology services by its field. */
const flat = (field: 'planets' | 'zodiacSigns'): ValueKindSource => ({
  // Only a query: a flat vocabulary has no group to filter by.
  list: ({ query }, page) => listAstrologyValues(field, { query }, page),
  count: ({ query }, start) => countAstrologyValues(field, { query }, start),
  getBySlug: (slug) => getAstrologyValueBySlug(field, slug),
});

export const VALUE_KINDS: Record<GroupedValueKind, ValueKindSource> = {
  category: {
    list: (filter, page) => listCategories(filter, page),
    count: (filter, start) => countCategories(filter, start),
    getBySlug: getCategoryBySlug,
    readGroups: allGroups(listCategoryGroups),
  },
  form: {
    list: (filter, page) => listIngredientFormValues(filter, page),
    count: (filter, start) => countIngredientFormValues(filter, start),
    getBySlug: getIngredientFormValueBySlug,
    readGroups: allGroups(listIngredientFormGroups),
  },
  // A deity's group is its tradition, by that name in its service.
  deity: {
    list: ({ query, groupId }, page) =>
      mapped(listDeities({ query, traditionId: groupId }, page), (deity) => ({
        ...deity,
        groupId: deity.traditionId,
      })),
    count: ({ query, groupId }, start) => countDeities({ query, traditionId: groupId }, start),
    getBySlug: async (slug) => {
      const deity = await getDeityBySlug(slug);
      return { ...deity, groupId: deity.traditionId };
    },
    readGroups: allGroups(listDeityTraditions),
  },
  planet: flat('planets'),
  zodiacSign: flat('zodiacSigns'),
};
