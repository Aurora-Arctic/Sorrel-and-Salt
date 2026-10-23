import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphql } from '../../gql';
import type {
  CompendiumFacetCountsQueryVariables,
  CovenFacetCountsQueryVariables,
} from '../../gql/graphql';
import type { ToxicFilter } from '@/modules/ingredients/schema/ingredient-enums';
import { DEBOUNCE_MS, useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import { COVEN_PARAMS } from '../IngredientSearch/coven-params';
import { compendiumFacetCounts, covenFacetCounts } from './facets';
import { COMPENDIUM_PARAMS } from './params';
import type {
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  CompendiumFacetVocabulary,
  CompendiumListFilter,
  CovenListFilter,
} from './types';

// The counts the open filter panel keeps current (M12.4). Changes in the panel are held, not
// applied, so the list and the address stay as they were; but what each choice would now list
// is `compendiumFacets` for the filter as held, a plain public query, so the panel asks for it
// after each change and shows the answer. The ask waits for the clicking to settle, and
// TanStack Query keys it by the filter, so an answer for a filter since replaced is never the
// one shown. claude-docs/components/compendium-list.md, "The panel's counts".

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
    $covenIds: [ID!]
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
      covenIds: $covenIds
    ) {
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
      withoutReferences
      withoutForms
    }
  }
`);

// The coven's twin (M9.6): the same counts over the coven's cupboard, with the Source strip and the
// two stock switches beside them, which `covenFacetCounts` maps.
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
      source {
        value
        count
      }
      inStock
      lowStockOnly
    }
  }
`);

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
}: {
  held: CompendiumListFilter &
    Partial<Pick<CovenListFilter, 'source' | 'inStock' | 'lowStockOnly'>>;
  enabled: boolean;
  categories: readonly CompendiumCategoryChoice[];
  vocabulary: CompendiumFacetVocabulary;
  /** A coven's id: given, the counts are the coven cupboard's (M9.6) and carry its Source and stock counts. */
  workspaceId?: string;
}): { facets: CompendiumFacetCounts | undefined; loading: boolean } {
  const lookups = {
    categories: new Map(categories.map(({ slug, id }) => [slug, id])),
    deities: new Map(vocabulary.deities.map(({ slug, id }) => [slug, id])),
  };
  const variables = JSON.stringify(
    workspaceId === undefined
      ? COMPENDIUM_PARAMS.variables(held, lookups)
      : {
          // The coven table needs the three choices only a coven has; a panel that left them out holds none.
          ...COVEN_PARAMS.variables(
            { source: '', inStock: false, lowStockOnly: false, ...held },
            lookups,
          ),
          workspaceId,
        },
  );
  const settled = useDebouncedValue(variables, DEBOUNCE_MS);
  // Only one of the two asks is ever enabled: the page is the compendium's or a coven's.
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
    const idsOf = {
      formIcons: new Map(Object.entries(vocabulary.formIcons)),
      deities: new Map(vocabulary.deities.map(({ id, ...deity }) => [id, deity])),
      categories: new Map(categories.map((category) => [category.id, category])),
    };
    // The answer's toxic counts are the two settings; the type is the filter's, which adds `any`.
    const settings = (toxic: { value: ToxicFilter; count: number }[]) =>
      toxic.flatMap(({ value, count }) => (value === 'any' ? [] : [{ value, count }]));
    if (coven.data) {
      const answer = coven.data.workspaceIngredientFacets;
      return covenFacetCounts({ ...answer, toxic: settings(answer.toxic) }, idsOf);
    }
    if (compendium.data) {
      const answer = compendium.data.compendiumFacets;
      return compendiumFacetCounts({ ...answer, toxic: settings(answer.toxic) }, idsOf);
    }
    return undefined;
  }, [coven.data, compendium.data, vocabulary, categories]);
  return {
    facets: enabled ? facets : undefined,
    loading: enabled && (settled !== variables || compendium.isFetching || coven.isFetching),
  };
}
