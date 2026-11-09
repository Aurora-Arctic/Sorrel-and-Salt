'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlQuery } from '../../lib/graphql-client';
import type { CategoryIndex } from './types';

// One page of the hard maximum, MAX_PAGE_SIZE, holds every category there is (rule 8): written out,
// since the pagination module is the server's.
export const CategoriesDocument = graphql(`
  query PickerCategories {
    categories(first: 100) {
      edges {
        node {
          id
          name
          description
          group {
            id
            name
            colorDark
            colorLight
          }
        }
      }
    }
  }
`);

/**
 * Every live category, and each one's name and group colours by id, from the one categories
 * request a form shares. Empty until it lands, and when it is refused: a failed read leaves the
 * Categories field saying so and never takes the form down.
 */
export function useCategoryIndex(): CategoryIndex {
  const { data, isPending, isError } = useQuery({
    ...graphqlQuery(CategoriesDocument),
    throwOnError: false,
  });
  return useMemo(() => {
    const categories = data?.categories.edges.map(({ node }) => node) ?? [];
    return {
      categories,
      names: new Map(categories.map((node) => [node.id, node.name])),
      colors: new Map(
        categories.map((node) => [
          node.id,
          { colorDark: node.group.colorDark, colorLight: node.group.colorLight },
        ]),
      ),
      isPending,
      isError,
    };
  }, [data, isPending, isError]);
}
