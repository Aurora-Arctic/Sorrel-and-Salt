import { builder } from '../../../graphql/builder';
import {
  createCategoryGroup,
  deleteCategoryGroup,
  updateCategoryGroup,
} from '../services/category-groups';
import type { CategoryGroupRow } from '../types';
import { curatedVocabularyWrites } from './curated';

// A category's group, whose two stored colours are what a category chip
// wears (MB.36), and M5.6b's writes. Each colour is held to 4.5:1 against its
// own theme's harder surface, the refusal pathed to the column; a delete
// moves the group's categories to `moveTo` first.

export const CategoryGroupRef = curatedVocabularyWrites({
  ref: builder.objectRef<CategoryGroupRow>('CategoryGroup'),
  fields: (t) => ({
    colorDark: t.exposeString('colorDark'),
    colorLight: t.exposeString('colorLight'),
  }),
  input: (t) => ({
    colorDark: t.string({ required: true }),
    colorLight: t.string({ required: true }),
  }),
  services: {
    create: createCategoryGroup,
    update: updateCategoryGroup,
    delete: deleteCategoryGroup,
  },
  // A category read earlier carries the group it was moved off.
  moveTo: ['categoriesByIngredient'],
  // An earlier root field of this request may have read it as a category's group.
  clears: ['categoryGroupsById'],
  descriptions: {
    update:
      'Replaces the group; the slug follows the name. Each colour must clear 4.5:1 on its own theme.',
    delete:
      'A soft delete; the live categories under it move to `moveTo` first, which they need when there are any.',
  },
});
