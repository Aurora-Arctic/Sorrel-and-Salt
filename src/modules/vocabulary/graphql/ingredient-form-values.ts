import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  countIngredientFormValues,
  createIngredientFormValue,
  deleteIngredientFormValue,
  listIngredientFormGroups,
  listIngredientFormValues,
  updateIngredientFormValue,
} from '../services/ingredient-form-values';
import type {
  IngredientFormGroupRow,
  IngredientFormValueFilter,
  IngredientFormValueRow,
} from '../types';

// `IngredientFormValue`, not `IngredientForm`: one row is one permitted value
// of `ingredients.form`, and `IngredientForm` is the entry-form component
// (DESIGN.md §7). Public (MB.80), so no scope and no session in the readers;
// tests/db/graphql-query-scopes.test.ts holds every other query to its refusal.
// The writes are the site admin's (M5.6a), scoped here and refused again by
// the service, which is the real gate.

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
    description:
      'The curated forms by name, each under a live group: those whose name holds `query`, case-insensitively, and those filed under `groupId`, when given.',
    args: {
      query: t.arg.string({ required: false }),
      groupId: t.arg.id({ required: false }),
    },
    resolve: (_query, args, page) => listIngredientFormValues(formFilter(args), page),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_query, args, start) => countIngredientFormValues(formFilter(args), start),
  }),
);

/** The list's arguments as the service's filter: GraphQL's null is absent. */
function formFilter(args: {
  query?: string | null;
  groupId?: string | null;
}): IngredientFormValueFilter {
  return { query: args.query ?? undefined, groupId: args.groupId ?? undefined };
}

builder.queryField('ingredientFormGroups', (t) =>
  t.pagedConnection({
    type: IngredientFormGroupRef,
    description:
      'The live form groups by name: the group a form is filed under is picked from these.',
    resolve: (_query, _args, page) => listIngredientFormGroups(page),
  }),
);

/**
 * A form as the admin writes one, whole: no slug, which follows the name and
 * the group. `endRedirect` confirms a rename that moves a compendium entry
 * onto an address another entry's redirect still runs from (MB.82).
 */
const IngredientFormValueInput = builder.inputType('IngredientFormValueInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: true }),
    groupId: t.id({ required: true }),
    endRedirect: t.boolean({ required: false }),
  }),
});

/** The input as the service takes it: GraphQL's null is absent. */
function formInput({
  endRedirect,
  ...input
}: {
  name: string;
  description: string;
  groupId: string;
  endRedirect?: boolean | null;
}) {
  return { ...input, endRedirect: endRedirect ?? undefined };
}

builder.mutationField('createIngredientFormValue', (t) =>
  t.field({
    type: IngredientFormValueRef,
    args: { input: t.arg({ type: IngredientFormValueInput, required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { input }, { session }) => {
      if (!session) throw new Forbidden();
      return createIngredientFormValue(session, formInput(input));
    },
  }),
);

builder.mutationField('updateIngredientFormValue', (t) =>
  t.field({
    type: IngredientFormValueRef,
    description:
      'Replaces the form; the slug follows the name and the group. A rename is carried onto every live compendium entry that picked the form.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: IngredientFormValueInput, required: true }),
    },
    authScopes: { admin: true },
    resolve: async (_root, { id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateIngredientFormValue(session, id, formInput(input));
      // An earlier root field of this request may have read it as an ingredient's pick.
      loaders.ingredientFormsById.clearAll();
      return row;
    },
  }),
);

builder.mutationField('deleteIngredientFormValue', (t) =>
  t.id({
    description:
      'A soft delete, refused while a live compendium entry picked the form; a coven keeps its pick.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: async (_root, { id }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      await deleteIngredientFormValue(session, id);
      loaders.ingredientFormsById.clearAll();
      return id;
    },
  }),
);
