'use client';

import { useMutation } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import BusyButton from '../BusyButton';
import { useAnnounce } from '../ClickFeedback/status-region';
import Modal from '../Modal';
import type { CupboardQuestionProps, CupboardWrite, DeleteEntryOptions } from './types';

// Delete Ingredient asked in a dialog, for a coven's own entry: the entry page's bin and a list
// card's More share it (claude-docs/components/ingredient-entry.md, "Component notes").

const DeleteOwnIngredientDocument = graphql(`
  mutation DeleteOwnIngredient($id: ID!, $workspaceId: ID!) {
    deleteIngredient(id: $id, workspaceId: $workspaceId)
  }
`);

/** Delete Ingredient's confirmation, in a dialog. */
export function DeleteDialog({
  name,
  write,
  onClose,
  returnTo,
}: CupboardQuestionProps): ReactElement {
  return (
    <Modal title="Delete Ingredient" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <>
          <p>
            Delete <strong>{name}</strong>? It leaves the coven, but any spell that uses it keeps
            it.
          </p>
          <div className="modal__actions">
            <BusyButton
              className="btn btn--destructive"
              busy={write.pending}
              busyLabel="Deleting"
              disabled={write.pending}
              onClick={write.run}
            >
              Delete
            </BusyButton>
            <button
              type="button"
              className="btn btn--quiet"
              disabled={write.pending}
              onClick={close}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/** The delete and what follows it, as `useCupboardWrites`'s remove; a refusal closes the confirmation and goes to `onRefused`. */
export function useDeleteEntry({
  workspaceId,
  id,
  deletedHref,
  announcement,
  onSettle,
  onRefused,
}: DeleteEntryOptions): CupboardWrite {
  const { navigate, refresh } = usePendingNavigation();
  const announce = useAnnounce();
  const remove = useMutation({
    mutationFn: () => graphqlRequest(DeleteOwnIngredientDocument, { id, workspaceId }),
    onSuccess: () => {
      // The page's status region outlives the card, so a screen reader hears the removal the list
      // then shows.
      if (announcement) announce(announcement);
      if (deletedHref) navigate(deletedHref, { replace: true });
      else refresh();
    },
    onError: (error) => {
      onSettle();
      onRefused(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
    },
  });
  return { run: () => remove.mutate(), pending: remove.isPending || remove.isSuccess };
}
