'use client';

import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import { graphql } from '../../gql';
import { covenTarget } from '../../lib/coven-path';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';

// Duplicate: `duplicateSpell` makes a private draft copy, and the page leaves for the Drafts tab
// with the copy open in the builder. The recipe page's button and the builder's Copy as Draft both
// use it (claude-docs/components/spell-recipe.md, "Duplicate").

export const DuplicateSpellDocument = graphql(`
  mutation DuplicateSpell($workspaceId: ID!, $id: ID!) {
    duplicateSpell(workspaceId: $workspaceId, id: $id) {
      id
    }
  }
`);

/**
 * Duplicates a spell and navigates to `hrefOf(copyId)`. `isPending` stays true past the write until
 * the next page arrives, so the button holds its spinner across the move.
 */
export function useDuplicateSpell(
  workspaceId: string,
  hrefOf: (id: string) => Route,
  onError: (message: string) => void,
) {
  const { navigate } = usePendingNavigation();
  const copy = useMutation({
    mutationFn: async (id: string) => {
      const { duplicateSpell } = await graphqlRequest(DuplicateSpellDocument, { workspaceId, id });
      if (!duplicateSpell) throw new Error('No copy was made.');
      return duplicateSpell.id;
    },
    onSuccess: (copyId) => {
      const href = hrefOf(copyId);
      navigate(href, { target: covenTarget(href.split('?')[0]!) });
    },
    onError: (error) => onError(readGraphqlFailure(error).alert ?? GENERIC_FAILURE),
  });
  return { duplicate: copy.mutate, duplicating: copy.isPending || copy.isSuccess };
}
