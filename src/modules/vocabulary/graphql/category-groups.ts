import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  createCategoryGroup,
  deleteCategoryGroup,
  updateCategoryGroup,
} from '../services/category-groups';
import { CategoryGroupRef } from './categories';

// M5.6b's category-group writes, the site admin's alone: scoped here and
// refused again by the service, which is the real gate. Each colour is held to
// 4.5:1 against its own theme's harder surface (MB.36), the refusal pathed to
// the column; a delete moves the group's categories to `moveTo` first.

/** A category group as the admin writes one, whole: no slug, which follows the name. */
const CategoryGroupInput = builder.inputType('CategoryGroupInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: true }),
    colorDark: t.string({ required: true }),
    colorLight: t.string({ required: true }),
  }),
});

builder.mutationField('createCategoryGroup', (t) =>
  t.field({
    type: CategoryGroupRef,
    args: { input: t.arg({ type: CategoryGroupInput, required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { input }, { session }) => {
      if (!session) throw new Forbidden();
      return createCategoryGroup(session, input);
    },
  }),
);

builder.mutationField('updateCategoryGroup', (t) =>
  t.field({
    type: CategoryGroupRef,
    description:
      'Replaces the group; the slug follows the name. Each colour must clear 4.5:1 on its own theme.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: CategoryGroupInput, required: true }),
    },
    authScopes: { admin: true },
    resolve: async (_root, { id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateCategoryGroup(session, id, input);
      // An earlier root field of this request may have read it as a category's group.
      loaders.categoryGroupsById.clearAll();
      return row;
    },
  }),
);

builder.mutationField('deleteCategoryGroup', (t) =>
  t.id({
    description:
      'A soft delete; the live categories under it move to `moveTo` first, which they need when there are any.',
    args: { id: t.arg.id({ required: true }), moveTo: t.arg.id({ required: false }) },
    authScopes: { admin: true },
    resolve: async (_root, { id, moveTo }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      await deleteCategoryGroup(session, id, moveTo ?? undefined);
      loaders.categoryGroupsById.clearAll();
      loaders.categoriesByIngredient.clearAll();
      return id;
    },
  }),
);
