import { builder } from '../../../graphql/builder';
import { definedArgs } from '../../../graphql/context-helpers';
import {
  countCategories,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categories';
import type { CategoryRow } from '../types';
import { CategoryGroupRef } from './category-groups';
import { curatedVocabularyWrites } from './curated';

// The category vocabulary as a chip reads it (M8.11): each category with its
// group, whose two stored colours are what the chip wears (MB.36). Public
// reference data, so no scope on either type or on the list, and no `audit`:
// who curated a vocabulary row is the admin pages' business, not a chip's.
// The writes are the site admin's (M5.6).

export const CategoryRef = curatedVocabularyWrites({
  ref: builder.objectRef<CategoryRow>('Category'),
  parent: {
    field: 'group',
    key: 'groupId',
    type: CategoryGroupRef,
    loader: (loaders) => loaders.categoryGroupsById,
  },
  services: { create: createCategory, update: updateCategory, delete: deleteCategory },
  // An earlier root field of this request may have read it on an ingredient.
  clears: ['categoriesByIngredient'],
  descriptions: {
    update: 'Replaces the category; the slug follows the name.',
    delete:
      'A soft delete, refused while a live compendium entry is filed under it; a coven keeps its links.',
  },
});

builder.queryField('categories', (t) =>
  t.pagedConnection({
    type: CategoryRef,
    description:
      'The live categories by name, each under a live group: those whose name holds `query`, case-insensitively, and those filed under `groupId`, when given.',
    args: {
      query: t.arg.string({ required: false }),
      groupId: t.arg.id({ required: false }),
    },
    resolve: (_query, { query, groupId }, page) =>
      listCategories(definedArgs({ query, groupId }), page),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_query, { query, groupId }, start) =>
      countCategories(definedArgs({ query, groupId }), start),
  }),
);
