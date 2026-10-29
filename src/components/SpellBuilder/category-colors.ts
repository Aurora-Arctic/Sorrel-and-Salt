'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphqlQuery } from '../../lib/graphql-client';
import type { GroupColors } from '../../lib/types';
import { CategoriesDocument } from '../IngredientForm/categories';

/**
 * Each category's group colours by category id, from the categories the picker already asks
 * for (one request, shared by the Jar's fill and the Category Match panel). Empty until they
 * land, and when they are refused.
 */
export function useCategoryColors(): ReadonlyMap<string, GroupColors> {
  const { data } = useQuery({ ...graphqlQuery(CategoriesDocument), throwOnError: false });
  return useMemo(
    () =>
      new Map(
        (data?.categories.edges ?? []).map(({ node }) => [
          node.id,
          { colorDark: node.group.colorDark, colorLight: node.group.colorLight },
        ]),
      ),
    [data],
  );
}

/** Each category's name by category id, from the same request as the colours. Empty until it lands. */
export function useCategoryNames(): ReadonlyMap<string, string> {
  const { data } = useQuery({ ...graphqlQuery(CategoriesDocument), throwOnError: false });
  return useMemo(
    () => new Map((data?.categories.edges ?? []).map(({ node }) => [node.id, node.name])),
    [data],
  );
}
