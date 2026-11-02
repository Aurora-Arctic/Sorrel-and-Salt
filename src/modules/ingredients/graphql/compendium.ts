import { builder } from '../../../graphql/builder';
import { countCompendium, getIngredient, listCompendium } from '../services/compendium';
import { compendiumFacetsHeldIn } from '../services/compendium-held-in';
import type { CompendiumFilterInput } from '../validation/compendium-filter';
import {
  CategoryModeEnum,
  CompendiumListingEnum,
  CompendiumSortEnum,
  IngredientElementEnum,
  IngredientRef,
  NomenclatureEnum,
  ToxicFilterEnum,
} from './ingredient';
import { CompendiumFacetsRef } from './ingredient-facets';

// The compendium's three queries. Public, so none carries the `signedIn` scope; tests/db/graphql-query-scopes.test.ts holds every other query to its refusal.
// The filtering is the service's, in SQL (claude-docs/graphql/schema.md, "compendium, ingredient and ingredientFormValues").

/**
 * The six facet arguments the compendium and a coven's ingredient list share (claude-docs/design-decisions/m11.22-search-facets.md):
 * any value within a list matches, and every argument given must match.
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
    description: 'Keeps entries listing any one of these celestial bodies, ignoring case.',
  }),
  elements: t.field({
    type: [IngredientElementEnum],
    required: false,
    description:
      'Keeps entries whose elements, or those of any of their live forms, include any one of these, alone or among others.',
  }),
  toxic: t.field({
    type: ToxicFilterEnum,
    required: false,
    description:
      'Keeps toxic entries, or entries that are not toxic; any, or leaving it out, keeps both.',
  }),
}));

/**
 * The category arguments the compendium and a coven's ingredient list share:
 * the ids, and how many of them an entry needs.
 */
export const categoryArgs = builder.args((t) => ({
  categoryIds: t.idList({ required: false }),
  categoryMode: t.field({
    type: CategoryModeEnum,
    required: false,
    defaultValue: 'all',
    description:
      'With categoryIds: all (the default) keeps entries carrying every one of them; any keeps entries carrying at least one. A category counts when it is filed on the entry or on any live form.',
  }),
}));

builder.queryField('compendium', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      query: t.arg.string({ required: false }),
      ...categoryArgs,
      ...facetArgs,
      // The admin's to-do list: live entries citing no live reference.
      withoutReferences: t.arg.boolean({ required: false }),
      // The admin's other to-do list: live entries with no live form.
      withoutForms: t.arg.boolean({ required: false }),
      // The formal names still to look up are the `unknown` entries.
      nomenclature: t.arg({ type: NomenclatureEnum, required: false }),
      // A curator's review mark and hidden entries: FORBIDDEN to anyone else.
      listing: t.arg({ type: CompendiumListingEnum, required: false }),
      reviewed: t.arg.boolean({
        required: false,
        description:
          'Keeps the entries a curator has marked reviewed, or with false the ones needing review. A curator or admin alone may set it.',
      }),
      // A curator's order by sourcing score: FORBIDDEN to anyone else, as the score is.
      sort: t.arg({ type: CompendiumSortEnum, required: false }),
    },
    // The session reaches the read for a curator's settings alone: Reviewed, the hidden listing and the sourcing sort.
    resolve: (_root, args, page, { session }) => listCompendium(filterOf(args), page, session),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_root, args, start, { session }) => countCompendium(filterOf(args), start, session),
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

// How many entries each filter value would list, under the same
// arguments as `compendium`, so the counts sit beside the page they narrow.
builder.queryField('compendiumFacets', (t) =>
  t.field({
    type: CompendiumFacetsRef,
    description:
      'How many compendium entries each search filter value would list under the rest of the filter.',
    args: {
      query: t.arg.string({ required: false }),
      ...categoryArgs,
      ...facetArgs,
      withoutReferences: t.arg.boolean({ required: false }),
      withoutForms: t.arg.boolean({ required: false }),
      nomenclature: t.arg({ type: NomenclatureEnum, required: false }),
      // A curator's review mark and hidden entries: FORBIDDEN to anyone else.
      listing: t.arg({ type: CompendiumListingEnum, required: false }),
      reviewed: t.arg.boolean({
        required: false,
        description:
          'Keeps the entries a curator has marked reviewed, or with false the ones needing review. A curator or admin alone may set it.',
      }),
      // The In My Covens filter, the viewer's own; signed out, or naming a coven
      // they are not in, it filters nothing and the counts are the cached public ones.
      covenIds: t.arg.idList({
        required: false,
        description:
          'Counts only entries a cupboard of any one of these covens holds, by id. A coven the viewer is not in is ignored.',
      }),
      covensNot: t.arg.boolean({
        required: false,
        description:
          "Counts only entries none of the covenIds holds instead; with no covenIds, none of the viewer's covens. If every id given is ignored, nothing is filtered.",
      }),
    },
    resolve: (_root, { covenIds, covensNot, ...args }, { session }) =>
      compendiumFacetsHeldIn(
        session,
        { covenIds: covenIds ?? [], covensNot: covensNot ?? undefined },
        filterOf(args),
      ),
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
  categoryMode,
  forms,
  deityIds,
  zodiacSigns,
  celestialBodies,
  elements,
  toxic,
  withoutReferences,
  withoutForms,
  nomenclature,
  reviewed,
  listing,
  sort,
}: CompendiumFilterInput): CompendiumFilterInput {
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
    withoutReferences,
    withoutForms,
    nomenclature,
    reviewed,
    listing,
    sort,
  };
}
