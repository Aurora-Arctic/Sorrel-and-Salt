import 'server-only';
import type { GroupedValueKind } from '../../../components/GroupedValueForm/types';
import {
  countAstrologyValues,
  countCategories,
  countDeities,
  countIngredientFormValues,
  deityOtherNamesOf,
  getAstrologyValueBySlug,
  getCategoryBySlug,
  getDeityBySlug,
  getIngredientFormValueBySlug,
  listAstrologyValues,
  listCategories,
  listDeities,
  listIngredientFormValues,
} from '@/modules/vocabulary';
import { GROUP_READERS } from './group-readers';
import type { ValueKindSource } from './types';

// Each curated value page's readers, from the vocabulary module, mapped onto the page's own names
// so `value-page.tsx` reads every kind alike: the deities' service calls the group `traditionId`,
// and the astrology services take the vocabulary first (`GroupedValueList/kinds.ts` holds the copy).

/** A flat vocabulary, read through the astrology services by its field. */
const flat = (field: 'celestialBodies' | 'zodiacSigns'): ValueKindSource => ({
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
    readGroups: GROUP_READERS.category,
  },
  form: {
    list: (filter, page) => listIngredientFormValues(filter, page),
    count: (filter, start) => countIngredientFormValues(filter, start),
    getBySlug: getIngredientFormValueBySlug,
    readGroups: GROUP_READERS.form,
  },
  // A deity's group is its tradition, by that name in its service.
  deity: {
    // Its other names in one read for the page, so its row can say them.
    list: async ({ query, groupId }, page) => {
      const entries = await listDeities({ query, traditionId: groupId }, page);
      const otherNames = await deityOtherNamesOf(entries.map(({ node }) => node.id));
      return entries.map((entry, i) => ({
        ...entry,
        node: { ...entry.node, groupId: entry.node.traditionId, otherNames: otherNames[i] },
      }));
    },
    count: ({ query, groupId }, start) => countDeities({ query, traditionId: groupId }, start),
    getBySlug: async (slug) => {
      const deity = await getDeityBySlug(slug);
      const [otherNames] = await deityOtherNamesOf([deity.id]);
      return { ...deity, groupId: deity.traditionId, otherNames };
    },
    readGroups: GROUP_READERS.deity,
  },
  celestialBody: flat('celestialBodies'),
  zodiacSign: flat('zodiacSigns'),
};
