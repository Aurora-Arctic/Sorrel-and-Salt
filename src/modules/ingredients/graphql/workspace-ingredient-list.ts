import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { workspaceIngredientFacets } from '../services/ingredient-facets';
import { listWorkspaceIngredients } from '../services/workspace-ingredient-list';
import type { WorkspaceIngredientFilterInput } from '../validation/compendium-filter';
import { categoryArgs, facetArgs } from './compendium';
import { IngredientRef } from './ingredient';
import { IngredientFacetsRef } from './ingredient-facets';

// Story 14's list (M9.4): a coven's own entries and the compendium entries it
// holds, a page at a time, each entry's jars read through `Ingredient.stock`;
// and beside it how many entries each filter value would list (M12.3). The
// resolvers refuse only a missing session; who may read which coven is the
// service's check (claude-docs/graphql/schema.md, "workspaceIngredients").

builder.queryField('workspaceIngredients', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
      ...categoryArgs,
      // Filtering as the compendium's do, under the coven's membership check.
      ...facetArgs,
    },
    resolve: (_root, args, page, context) =>
      listWorkspaceIngredients(sessionOf(context), args.workspaceId, filterOf(args), page),
  }),
);

builder.queryField('workspaceIngredientFacets', (t) =>
  t.field({
    type: IngredientFacetsRef,
    description:
      "How many of a coven's ingredients each search filter value would list under the rest of the filter.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
      ...categoryArgs,
      ...facetArgs,
    },
    resolve: (_root, args, context) =>
      workspaceIngredientFacets(sessionOf(context), args.workspaceId, filterOf(args)),
  }),
);

/** The filter's arguments, leaving out the coven and any page arguments. */
function filterOf({
  query,
  categoryIds,
  categoryMode,
  forms,
  deityIds,
  zodiacSigns,
  celestialBodies,
  elements,
  toxic,
}: WorkspaceIngredientFilterInput): WorkspaceIngredientFilterInput {
  return {
    query,
    categoryIds,
    categoryMode,
    forms,
    deityIds,
    zodiacSigns,
    celestialBodies,
    elements,
    toxic,
  };
}
