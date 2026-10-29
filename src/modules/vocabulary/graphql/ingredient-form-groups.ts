import type { InputFieldBuilder } from '@pothos/core';
import { builder } from '../../../graphql/builder';
import type { BuilderTypes } from '../../../graphql/types';
import { FORM_GROUP_ICONS } from '../schema/form-group-icons';
import {
  createIngredientFormGroup,
  deleteIngredientFormGroup,
  updateIngredientFormGroup,
} from '../services/ingredient-form-groups';
import type { IngredientFormGroupRow } from '../types';
import { curatedVocabularyWrites } from './curated';

// A form's group and its writes. A form's slug is its name and its group,
// so a rename moves its forms' slugs and a delete moves its forms to
// `moveTo`, re-slugged there. Its icon is an enum on the wire as in
// the table, so a value outside the six is refused before a resolver runs;
// null is the generic icon.

export const FormGroupIconEnum = builder.enumType('FormGroupIcon', { values: FORM_GROUP_ICONS });

/** The input's one field beyond the name and description: the icon, which may be left unset. */
const iconInput = (t: InputFieldBuilder<BuilderTypes, 'InputObject'>) => ({
  icon: t.field({ type: FormGroupIconEnum, required: false }),
});

// Typed by hand rather than inferred: inference reads the parent's key off
// the service's input, which would take `icon` for one, and a group has no
// parent; named, the service's input is checked against the icon's type.
export const IngredientFormGroupRef = curatedVocabularyWrites<
  IngredientFormGroupRow,
  ReturnType<typeof iconInput>
>({
  ref: builder.objectRef<IngredientFormGroupRow>('IngredientFormGroup'),
  fields: (t) => ({
    icon: t.expose('icon', { type: FormGroupIconEnum, nullable: true }),
  }),
  input: iconInput,
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
