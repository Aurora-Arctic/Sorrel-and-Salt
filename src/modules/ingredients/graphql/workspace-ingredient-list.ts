import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { workspaceIngredientFacets } from '../services/ingredient-facets';
import { listWorkspaceIngredients } from '../services/workspace-ingredient-list';
import type { WorkspaceIngredientFilterInput } from '../validation/compendium-filter';
import { categoryArgs, facetArgs } from './compendium';
import { IngredientRef, IngredientSourceEnum } from './ingredient';
import { IngredientFacetsRef } from './ingredient-facets';

// The list: a coven's own entries and the compendium entries its cupboard holds, a page at a time, with how many entries each filter value would list.
// The resolvers refuse only a missing session; the service checks the coven (claude-docs/graphql/schema.md, "workspaceIngredients").

// The two settings only a coven's list has, so not in `facetArgs`,
// which the compendium shares.
const stockArgs = builder.args((t) => ({
  source: t.field({
    type: IngredientSourceEnum,
    required: false,
    description:
      "Keeps the coven's own entries, or the compendium entries it holds; leaving it out keeps both.",
  }),
  inStock: t.boolean({
    required: false,
    description:
      'Keeps entries with a jar not at 0, a jar with no quantity counting as held; false, or leaving it out, keeps all.',
  }),
  lowStockOnly: t.boolean({
    required: false,
    description:
      'Keeps entries with a jar at 0 (Out of Stock) or at or below a threshold above 0 (Low Stock); false, or leaving it out, keeps all.',
  }),
}));

builder.queryField('workspaceIngredients', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
      ...categoryArgs,
      // Filtering as the compendium's do, under the coven's membership check.
      ...facetArgs,
      ...stockArgs,
    },
    resolve: async (_root, args, page, context) => {
      const entries = await listWorkspaceIngredients(
        sessionOf(context),
        args.workspaceId,
        filterOf(args),
        page,
      );
      // The page read each entry's cupboard row beside it, under the same
      // read permission the loader's service asks, so `Ingredient.cupboardEntry`
      // is answered from here rather than by a second read.
      for (const { node, cupboardEntry } of entries) {
        context.loaders.cupboardEntryByIngredient.prime(
          { ingredientId: node.id, workspaceId: args.workspaceId },
          cupboardEntry,
        );
      }
      return entries;
    },
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
      ...stockArgs,
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
  source,
  inStock,
  lowStockOnly,
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
    source,
    inStock,
    lowStockOnly,
  };
}
