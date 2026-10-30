'use client';

import { useMutation } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import type { DeleteWorkingProps } from './types';

// Delete Working's write and its question, which the Edit dialog asks before `deleteWorking` runs.
// The page is read again afterwards, so the row and the card's count both drop it.

export const DeleteWorkingDocument = graphql(`
  mutation DeleteWorking($workspaceId: ID!, $id: ID!) {
    deleteWorking(workspaceId: $workspaceId, id: $id)
  }
`);

/** The Delete Working write; the page is read again once it lands, so the row and the card's count drop the working. */
export function useDeleteWorking({ workspaceId, workingId }: DeleteWorkingProps) {
  const { refresh } = usePendingNavigation();
  return useMutation({
    mutationFn: () => graphqlRequest(DeleteWorkingDocument, { id: workingId, workspaceId }),
    onSuccess: refresh,
  });
}

/** The question naming the working by its day, asked in the Edit dialog. */
export function DeleteWorkingQuestion({ name }: { name: string }): ReactElement {
  return (
    <>
      Delete the working of <strong>{name}</strong>? It leaves the spell&rsquo;s history and its
      count, and what it took from the jars stays taken.
    </>
  );
}
