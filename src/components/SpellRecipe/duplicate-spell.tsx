'use client';

import type { Route } from 'next';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest, useRefusableMutation } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';

// Duplicate: `duplicateSpell` makes a private draft copy, and the page leaves for the Drafts tab
// with the copy open in the builder. The recipe page's button and the builder's Duplicate both
// use it (claude-docs/components/spell-recipe.md, "The actions row").

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
  const copy = useRefusableMutation({
    request: async (id: string) => {
      const { duplicateSpell } = await graphqlRequest(DuplicateSpellDocument, { workspaceId, id });
      if (!duplicateSpell) throw new Error('No copy was made.');
      return duplicateSpell.id;
    },
    onDone: (copyId) => {
      const href = hrefOf(copyId);
      navigate(href);
    },
    onRefused: onError,
  });
  return { duplicate: copy.run, duplicating: copy.pending };
}
