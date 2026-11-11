import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphql } from '@/lib/graphql-document';
import type {
  CompendiumFacetCountsQueryVariables,
  CovenFacetCountsQueryVariables,
} from '../../gql/graphql';
import type { ToxicFilter } from '@/modules/ingredients/schema/ingredient-enums';
import { DEBOUNCE_MS, useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import { COVEN_PARAMS } from '../IngredientSearch/coven-params';
import { compendiumFacetCounts, covenFacetCounts, vocabulariesOf } from './facets';
import { COMPENDIUM_PARAMS } from './params';
import type {
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  CompendiumFacetVocabulary,
  CompendiumListFilterProps,
} from './types';

// The counts the open filter panel keeps current: `compendiumFacets` is asked for the held filter once
// the clicking settles, and TanStack Query keys it by filter, so a replaced filter's answer is never
// shown (claude-docs/components/compendium-list.md, "The panel's counts").

// Defined for its side effect: both queries below borrow it by name when sent.
graphql(`
  fragment IngredientFacetCountsFields on IngredientFacetCounts {
    forms {
      value
      count
    }
    deities {
      value
      count
    }
    categories {
      value
      count
    }
    zodiacSigns {
      value
      count
    }
    celestialBodies {
      value
      count
    }
    elements {
      value
      count
    }
    toxic {
      value
      count
    }
  }
`);

const CompendiumFacetCountsDocument = graphql(`
  query CompendiumFacetCounts(
    $query: String
    $forms: [String!]
    $withoutReferences: Boolean
    $withoutForms: Boolean
    $elements: [IngredientElement!]
    $categoryIds: [ID!]
    $categoryMode: CategoryMode
    $deityIds: [ID!]
    $zodiacSigns: [String!]
    $celestialBodies: [String!]
    $toxic: ToxicFilter
    $reviewed: Boolean
    $listing: CompendiumListing
    $covenIds: [ID!]
    $covensNot: Boolean
  ) {
    compendiumFacets(
      query: $query
      forms: $forms
      withoutReferences: $withoutReferences
      withoutForms: $withoutForms
      elements: $elements
      categoryIds: $categoryIds
      categoryMode: $categoryMode
      deityIds: $deityIds
      zodiacSigns: $zodiacSigns
      celestialBodies: $celestialBodies
      toxic: $toxic
      reviewed: $reviewed
      listing: $listing
      covenIds: $covenIds
      covensNot: $covensNot
    ) {
      ...IngredientFacetCountsFields
      withoutReferences
      withoutForms
      reviewed {
        value
        count
      }
    }
  }
`);

const CovenFacetCountsDocument = graphql(`
  query CovenFacetCounts(
    $workspaceId: ID!
    $query: String
    $forms: [String!]
    $elements: [IngredientElement!]
    $categoryIds: [ID!]
    $categoryMode: CategoryMode
    $deityIds: [ID!]
    $zodiacSigns: [String!]
    $celestialBodies: [String!]
    $toxic: ToxicFilter
    $source: IngredientSource
    $inStock: Boolean
    $lowStockOnly: Boolean
  ) {
    workspaceIngredientFacets(
      workspaceId: $workspaceId
      query: $query
      forms: $forms
      elements: $elements
      categoryIds: $categoryIds
      categoryMode: $categoryMode
      deityIds: $deityIds
      zodiacSigns: $zodiacSigns
      celestialBodies: $celestialBodies
      toxic: $toxic
      source: $source
      inStock: $inStock
      lowStockOnly: $lowStockOnly
    ) {
      ...IngredientFacetCountsFields
      source {
        value
        count
      }
      inStock
      lowStockOnly
    }
  }
`);

/** The keeper's variables with hidden entries counted in unless the Hidden switch narrows to them; anyone else's are left as they are. */
function withListing<T extends { listing?: string }>(variables: T, admin: boolean): T {
  return admin ? { ...variables, listing: variables.listing ?? 'all' } : variables;
}

/**
 * The counts for `held` while `enabled`, and whether they are on their way. `facets` is
 * undefined until the first answer, and after a failed ask: the caller keeps the counts the
 * page drew. Never throws, since a count that cannot be read is not worth an error page.
 */
export function useLiveFacets({
  held,
  enabled,
  categories,
  vocabulary,
  workspaceId,
  admin = false,
}: {
  held: CompendiumListFilterProps['filter'];
  enabled: boolean;
  categories: readonly CompendiumCategoryChoice[];
  vocabulary: CompendiumFacetVocabulary;
  workspaceId?: string;
  admin?: boolean;
}): { facets: CompendiumFacetCounts | undefined; loading: boolean } {
  const lookups = {
    categories: new Map(categories.map(({ slug, id }) => [slug, id])),
    deities: new Map(vocabulary.deities.map(({ slug, id }) => [slug, id])),
  };
  const variables = JSON.stringify(
    workspaceId === undefined
      ? withListing(
          COMPENDIUM_PARAMS.variables(
            { reviewed: '', hidden: false, sort: '', order: '', ...held },
            lookups,
          ),
          admin,
        )
      : {
          ...COVEN_PARAMS.variables(
            { source: '', inStock: false, lowStockOnly: false, ...held },
            lookups,
          ),
          workspaceId,
        },
  );
  const settled = useDebouncedValue(variables, DEBOUNCE_MS);
  const compendium = useQuery({
    ...graphqlQuery(
      CompendiumFacetCountsDocument,
      // Written by the parameter table from the held filter, which the document's variables mirror.
      JSON.parse(settled) as CompendiumFacetCountsQueryVariables,
    ),
    enabled: enabled && workspaceId === undefined,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const coven = useQuery({
    ...graphqlQuery(
      CovenFacetCountsDocument,
      JSON.parse(settled) as CovenFacetCountsQueryVariables,
    ),
    enabled: enabled && workspaceId !== undefined,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const facets = useMemo(() => {
    const idsOf = vocabulariesOf(categories, vocabulary);
    const settings = (toxic: { value: ToxicFilter; count: number }[]) =>
      toxic.flatMap(({ value, count }) => (value === 'any' ? [] : [{ value, count }]));
    if (coven.data) {
      const answer = coven.data.workspaceIngredientFacets;
      return covenFacetCounts({ ...answer, toxic: settings(answer.toxic) }, idsOf);
    }
    if (compendium.data) {
      const answer = compendium.data.compendiumFacets;
      const reviewed =
        answer.reviewed?.map(({ value, count }) => ({
          value: value ? ('reviewed' as const) : ('needs_review' as const),
          count,
        })) ?? null;
      return compendiumFacetCounts({ ...answer, toxic: settings(answer.toxic), reviewed }, idsOf);
    }
    return undefined;
  }, [coven.data, compendium.data, vocabulary, categories]);
  return {
    facets: enabled ? facets : undefined,
    loading: enabled && (settled !== variables || compendium.isFetching || coven.isFetching),
  };
}
