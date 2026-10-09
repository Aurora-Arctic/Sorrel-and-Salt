import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  createIngredientFormGroup,
  deleteIngredientFormGroup,
  updateIngredientFormGroup,
} from '../services/ingredient-form-groups';
import { IngredientFormGroupRef } from './ingredient-form-values';

// M5.6b's form-group writes, the site admin's alone: scoped here and refused
// again by the service, which is the real gate. A form's slug is its name and
// its group (M5.6a), so a rename moves its forms' slugs and a delete moves its
// forms to `moveTo`, re-slugged there.

/** A form group as the admin writes one, whole: no slug, which follows the name. */
const IngredientFormGroupInput = builder.inputType('IngredientFormGroupInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: true }),
  }),
});

builder.mutationField('createIngredientFormGroup', (t) =>
  t.field({
    type: IngredientFormGroupRef,
    args: { input: t.arg({ type: IngredientFormGroupInput, required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { input }, { session }) => {
      if (!session) throw new Forbidden();
      return createIngredientFormGroup(session, input);
    },
  }),
);

builder.mutationField('updateIngredientFormGroup', (t) =>
  t.field({
    type: IngredientFormGroupRef,
    description:
      'Replaces the group; the slug follows the name, and so does the slug of every form under it.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: IngredientFormGroupInput, required: true }),
    },
    authScopes: { admin: true },
    resolve: async (_root, { id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateIngredientFormGroup(session, id, input);
      // An earlier root field of this request may have read it, or a form it re-slugged.
      loaders.ingredientFormGroupsById.clearAll();
      loaders.ingredientFormsById.clearAll();
      return row;
    },
  }),
);

builder.mutationField('deleteIngredientFormGroup', (t) =>
  t.id({
    description:
      'A soft delete; the live forms under it move to `moveTo` first, re-slugged there, which they need when there are any.',
    args: { id: t.arg.id({ required: true }), moveTo: t.arg.id({ required: false }) },
    authScopes: { admin: true },
    resolve: async (_root, { id, moveTo }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      await deleteIngredientFormGroup(session, id, moveTo ?? undefined);
      loaders.ingredientFormGroupsById.clearAll();
      loaders.ingredientFormsById.clearAll();
      return id;
    },
  }),
);
