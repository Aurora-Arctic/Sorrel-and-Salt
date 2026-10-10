import { builder } from '../../../graphql/builder';
import {
  createIngredientFormGroup,
  deleteIngredientFormGroup,
  updateIngredientFormGroup,
} from '../services/ingredient-form-groups';
import type { IngredientFormGroupRow } from '../types';
import { curatedVocabularyWrites } from './curated';

// A form's group and M5.6b's writes. A form's slug is its name and its group
// (M5.6a), so a rename moves its forms' slugs and a delete moves its forms to
// `moveTo`, re-slugged there.

export const IngredientFormGroupRef = curatedVocabularyWrites({
  ref: builder.objectRef<IngredientFormGroupRow>('IngredientFormGroup'),
  services: {
    create: createIngredientFormGroup,
    update: updateIngredientFormGroup,
    delete: deleteIngredientFormGroup,
  },
  moveTo: [],
  // An earlier root field of this request may have read it, or a form it re-slugged.
  clears: ['ingredientFormGroupsById', 'ingredientFormsById'],
  descriptions: {
    update:
      'Replaces the group; the slug follows the name, and so does the slug of every form under it.',
    delete:
      'A soft delete; the live forms under it move to `moveTo` first, re-slugged there, which they need when there are any.',
  },
});
