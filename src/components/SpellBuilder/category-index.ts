'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphqlQuery } from '../../lib/graphql-client';
import { CategoriesDocument } from '../IngredientForm/categories';
import type { CategoryIndex } from './types';

/**
 * Every live category, and each one's name and group colours by id, from the one categories
 * request the whole builder shares. Empty until it lands, and when it is refused: a failed read
 * leaves the Categories field saying so and never takes the builder down.
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
