import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  countCategories,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categories';
import type { CategoryGroupRow, CategoryRow } from '../types';

// The category vocabulary as a chip reads it (M8.11): each category with its
// group, whose two stored colours are what the chip wears (MB.36). Public
// reference data, so no scope on either type or on the list, and no `audit`:
// who curated a vocabulary row is the admin pages' business, not a chip's.
// The writes are the site admin's (M5.6), scoped here and refused again by
// the service, which is the real gate.

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

export const CategoryRef = builder.objectRef<CategoryRow>('Category').implement({
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

builder.queryField('categories', (t) =>
  t.pagedConnection({
    type: CategoryRef,
    description: 'The live categories by name, each under a live group.',
    resolve: (_query, _args, page) => listCategories(page),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_query, _args, start) => countCategories(start),
  }),
);

/** A category as the admin writes one, whole: no slug, which follows the name. */
const CategoryInput = builder.inputType('CategoryInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: true }),
    groupId: t.id({ required: true }),
  }),
});

builder.mutationField('createCategory', (t) =>
  t.field({
    type: CategoryRef,
    args: { input: t.arg({ type: CategoryInput, required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { input }, { session }) => {
      if (!session) throw new Forbidden();
      return createCategory(session, input);
    },
  }),
);

builder.mutationField('updateCategory', (t) =>
  t.field({
    type: CategoryRef,
    description: 'Replaces the category; the slug follows the name.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: CategoryInput, required: true }),
    },
    authScopes: { admin: true },
    resolve: async (_root, { id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateCategory(session, id, input);
      // An earlier root field of this request may have read it on an ingredient.
      loaders.categoriesByIngredient.clearAll();
      return row;
    },
  }),
);

builder.mutationField('deleteCategory', (t) =>
  t.id({
    description:
      'A soft delete, refused while a live compendium entry is filed under it; a coven keeps its links.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: async (_root, { id }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      await deleteCategory(session, id);
      loaders.categoriesByIngredient.clearAll();
      return id;
    },
  }),
);
