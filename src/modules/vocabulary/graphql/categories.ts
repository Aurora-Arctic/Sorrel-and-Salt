import { builder } from '../../../graphql/builder';
import type { categories } from '../schema/categories';
import type { CategoryGroupRow } from '../types';

// The category vocabulary as a chip reads it (M8.11): each category with its
// group, whose two stored colours are what the chip wears (MB.36). Public
// reference data, so no scope on either type, and no `audit`: who curated a
// vocabulary row is the admin pages' business, not a chip's.

export const CategoryGroupRef = builder.objectRef<CategoryGroupRow>('CategoryGroup').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    description: t.exposeString('description'),
    colorDark: t.exposeString('colorDark'),
    colorLight: t.exposeString('colorLight'),
  }),
});

export const CategoryRef = builder.objectRef<typeof categories.$inferSelect>('Category').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    description: t.exposeString('description'),
    group: t.field({
      type: CategoryGroupRef,
      resolve: (category, _args, { loaders }) => loaders.categoryGroupsById.load(category.groupId),
    }),
  }),
});
