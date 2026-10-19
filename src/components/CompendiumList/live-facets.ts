import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphql } from '../../gql';
import type { CompendiumFacetCountsQueryVariables } from '../../gql/graphql';
import { DEBOUNCE_MS, useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import { compendiumFacetCounts } from './facets';
import { COMPENDIUM_PARAMS } from './params';
import type {
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  CompendiumFacetVocabulary,
  CompendiumListFilter,
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
}: {
  held: CompendiumListFilter;
  enabled: boolean;
  categories: readonly CompendiumCategoryChoice[];
  vocabulary: CompendiumFacetVocabulary;
}): { facets: CompendiumFacetCounts | undefined; loading: boolean } {
  const variables = JSON.stringify(
    COMPENDIUM_PARAMS.variables(held, {
      categories: new Map(categories.map(({ slug, id }) => [slug, id])),
      deities: new Map(vocabulary.deities.map(({ slug, id }) => [slug, id])),
    }),
  );
  const settled = useDebouncedValue(variables, DEBOUNCE_MS);
  const query = useQuery({
    ...graphqlQuery(
      CompendiumFacetCountsDocument,
      // Written by the parameter table from the held filter, which the document's variables mirror.
      JSON.parse(settled) as CompendiumFacetCountsQueryVariables,
    ),
    enabled,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const facets = useMemo(
    () =>
      query.data &&
      compendiumFacetCounts(
        {
          ...query.data.compendiumFacets,
          // The answer's toxic counts are the two settings; the type is the filter's, which adds `any`.
          toxic: query.data.compendiumFacets.toxic.flatMap(({ value, count }) =>
            value === 'any' ? [] : [{ value, count }],
          ),
        },
        {
          formIcons: new Map(Object.entries(vocabulary.formIcons)),
          deities: new Map(vocabulary.deities.map(({ id, ...deity }) => [id, deity])),
          categories: new Map(categories.map((category) => [category.id, category])),
        },
      ),
    [query.data, vocabulary, categories],
  );
  return {
    facets: enabled ? facets : undefined,
    loading: enabled && (settled !== variables || query.isFetching),
  };
}
