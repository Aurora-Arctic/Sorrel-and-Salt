import { builder } from '../../../graphql/builder';
import { countCompendium, getIngredient, listCompendium } from '../services/compendium';
import type { CompendiumFilterInput } from '../validation/compendium-filter';
import { IngredientRef, NomenclatureEnum, ToxicFilterEnum } from './ingredient';

// The compendium's two queries. Public, so neither carries the `signedIn`
// scope (MB.80); tests/db/graphql-query-scopes.test.ts holds every other
// query to its refusal. The filtering is the service's, in SQL: the browser
// never holds more than a page, so it cannot be the search
// (claude-docs/graphql/schema.md, "compendium, ingredient and ingredientFormValues").

/**
 * The five facet arguments the compendium and a coven's ingredient list share
 * (M11.22, claude-docs/design-decisions/m11.22-search-facets.md): within each
 * list any value matches, and every argument given must match.
 */
export const facetArgs = builder.args((t) => ({
  forms: t.stringList({
    required: false,
    description:
      'Keeps entries with a live form named any one of these, ignoring case and outer spaces.',
  }),
  deityIds: t.idList({
    required: false,
    description: 'Keeps entries linked to any one of these curated deities, by id.',
  }),
  zodiacSigns: t.stringList({
    required: false,
    description: 'Keeps entries listing any one of these zodiac signs, ignoring case.',
  }),
  celestialBodies: t.stringList({
    required: false,
    description:
      'Keeps entries listing any one of these planets or other celestial bodies, ignoring case.',
  }),
  toxic: t.field({
    type: ToxicFilterEnum,
    required: false,
    description:
      'Keeps toxic entries, or entries that are not toxic; any, or leaving it out, keeps both.',
  }),
}));

builder.queryField('compendium', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      query: t.arg.string({ required: false }),
      categoryIds: t.arg.idList({ required: false }),
      ...facetArgs,
      // The admin's to-do list: live entries citing no live reference (M5.5).
      withoutReferences: t.arg.boolean({ required: false }),
      // The formal names still to look up are the `unknown` entries (M5.5).
      nomenclature: t.arg({ type: NomenclatureEnum, required: false }),
    },
    resolve: (_root, args, page) => listCompendium(filterOf(args), page),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_root, args, start) => countCompendium(filterOf(args), start),
    edgeFields: (t) => ({
      score: t.float({
        nullable: true,
        description:
          "The search's rank, 0 to 1: the query's word similarity to each matched field — label, formal name, folk name, variant form or description — times that field's weight, the best kept. Null without a query.",
        resolve: (edge) => edge.score,
      }),
    }),
  }),
);

builder.queryField('ingredient', (t) =>
  t.field({
    type: IngredientRef,
    args: {
      id: t.arg.id({ required: true }),
      // Names the coven whose own entry may be asked for; absent, the read is
      // the compendium alone.
      workspaceId: t.arg.id({ required: false }),
    },
    resolve: (_root, { id, workspaceId }, { session }) => getIngredient(session, id, workspaceId),
  }),
);

/** The filter's arguments, the page's left to `t.pagedConnection`. */
function filterOf({
  query,
  categoryIds,
  forms,
  deityIds,
  zodiacSigns,
  celestialBodies,
  toxic,
  withoutReferences,
  nomenclature,
}: CompendiumFilterInput): CompendiumFilterInput {
  return {
    query,
    categoryIds,
    forms,
    deityIds,
    zodiacSigns,
    celestialBodies,
    toxic,
    withoutReferences,
    nomenclature,
  };
}
