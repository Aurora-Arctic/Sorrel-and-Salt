import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { listWorkspaceIngredients } from '../services/workspace-ingredient-list';
import { IngredientRef } from './ingredient';

// Story 14's list (M9.4): a coven's own entries and the compendium entries it
// holds, a page at a time, each entry's jars read through `Ingredient.stock`.
// The resolver refuses only a missing session; who may read which coven is
// the service's check (claude-docs/graphql/schema.md, "workspaceIngredients").

builder.queryField('workspaceIngredients', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
      categoryIds: t.arg.idList({ required: false }),
      form: t.arg.string({
        required: false,
        description: 'Keeps entries with a form of this name.',
      }),
    },
    resolve: (_root, { workspaceId, query, categoryIds, form }, page, context) =>
      listWorkspaceIngredients(sessionOf(context), workspaceId, { query, categoryIds, form }, page),
  }),
);
