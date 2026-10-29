import { builder } from '../../../graphql/builder';
import { definedArgs } from '../../../graphql/context-helpers';
import {
  countIngredientFormValues,
  createIngredientFormValue,
  deleteIngredientFormValue,
  listIngredientFormValues,
  updateIngredientFormValue,
} from '../services/ingredient-form-values';
import { listIngredientFormGroups } from '../services/ingredient-form-groups';
import type { IngredientFormValueRow } from '../types';
import { curatedVocabularyWrites } from './curated';
import { IngredientFormGroupRef } from './ingredient-form-groups';

// `IngredientFormValue`, not `IngredientForm`: one row is one permitted value
// of `ingredient_variants.form`, and `IngredientForm` is the entry-form component
// (DESIGN.md §7). Public, so no scope and no session in the readers;
// tests/db/graphql-query-scopes.test.ts holds every other query to its refusal.
// The writes are the site admin's.

export const IngredientFormValueRef = curatedVocabularyWrites({
  ref: builder.objectRef<IngredientFormValueRow>('IngredientFormValue'),
  // The group is what tells two same-named forms apart: "Wax (Substance)".
  parent: {
    field: 'group',
    key: 'groupId',
    type: IngredientFormGroupRef,
    loader: (loaders) => loaders.ingredientFormGroupsById,
  },
  // The slug follows the name and the group. No `endRedirect`: a rename moves
  // no compendium entry's address, so ends no redirect.
  services: {
    create: createIngredientFormValue,
    update: updateIngredientFormValue,
    delete: deleteIngredientFormValue,
  },
  // An earlier root field of this request may have read it as an ingredient's pick.
  clears: ['ingredientFormsById'],
  descriptions: {
    update:
      'Replaces the form; the slug follows the name and the group. A rename is carried onto every form of a live compendium entry that picked it, moving no entry address.',
    delete:
      'A soft delete, refused while a live compendium entry picked the form; a coven keeps its pick.',
  },
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
    resolve: (_query, { query, groupId }, page) =>
      listIngredientFormValues(definedArgs({ query, groupId }), page),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_query, { query, groupId }, start) =>
      countIngredientFormValues(definedArgs({ query, groupId }), start),
  }),
);

builder.queryField('ingredientFormGroups', (t) =>
  t.pagedConnection({
    type: IngredientFormGroupRef,
    description:
      'The live form groups by name: the group a form is filed under is picked from these.',
    resolve: (_query, _args, page) => listIngredientFormGroups(page),
  }),
);
