import { builder } from '../../../graphql/builder';
import type { IngredientFormGroupRow } from '../services/groups';
import {
  type IngredientFormValueRow,
  listIngredientFormValues,
} from '../services/ingredient-form-values';

// `IngredientFormValue`, not `IngredientForm`: one row is one permitted value
// of `ingredients.form`, and `IngredientForm` is the entry-form component
// (DESIGN.md §7). Public (MB.80), so no scope and no session in the resolver;
// tests/db/graphql-query-scopes.test.ts holds every other query to its refusal.

export const IngredientFormGroupRef = builder
  .objectRef<IngredientFormGroupRow>('IngredientFormGroup')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      name: t.exposeString('name'),
      slug: t.exposeString('slug'),
      description: t.exposeString('description'),
    }),
  });

export const IngredientFormValueRef = builder
  .objectRef<IngredientFormValueRow>('IngredientFormValue')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      name: t.exposeString('name'),
      slug: t.exposeString('slug'),
      description: t.exposeString('description'),
      // The group is what tells two same-named forms apart: "Wax (Substance)".
      group: t.field({
        type: IngredientFormGroupRef,
        resolve: (form, _args, { loaders }) => loaders.ingredientFormGroupsById.load(form.groupId),
      }),
    }),
  });

builder.queryField('ingredientFormValues', (t) =>
  t.pagedConnection({
    type: IngredientFormValueRef,
    resolve: (_query, _args, page) => listIngredientFormValues(page),
  }),
);
