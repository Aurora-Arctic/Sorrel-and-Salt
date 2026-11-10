'use client';

import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest, useRefusableMutation } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import ConfirmDialog from '../ConfirmDialog';
import type { CupboardQuestionProps, CupboardWrite, DeleteEntryOptions } from './types';

// Delete Ingredient asked in a dialog, for a coven's own entry: the entry page's bin and a list
// card's More share it (claude-docs/components/ingredient-entry.md, "Structure").

const DeleteOwnIngredientDocument = graphql(`
  mutation DeleteOwnIngredient($id: ID!, $workspaceId: ID!) {
    deleteIngredient(id: $id, workspaceId: $workspaceId)
  }
`);

export function DeleteDialog({
  name,
  write,
  onClose,
  returnTo,
}: CupboardQuestionProps): ReactElement {
  return (
    <ConfirmDialog
      title="Delete Ingredient"
      question={
        <>
          Delete <strong>{name}</strong>? It leaves the coven, but any spell that uses it keeps it.
        </>
      }
      confirmLabel="Delete"
      busyLabel="Deleting"
      busy={write.pending}
      onConfirm={write.run}
      onClose={onClose}
      returnTo={returnTo}
    />
  );
}

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
  const remove = useRefusableMutation({
    request: () => graphqlRequest(DeleteOwnIngredientDocument, { id, workspaceId }),
    onDone: () => {
      // The page's status region outlives the card, so a screen reader hears the removal the list
      // then shows.
      if (announcement) announce(announcement);
      if (deletedHref) navigate(deletedHref, { replace: true });
      else refresh();
    },
    onRefused: (message) => {
      onSettle();
      onRefused(message);
    },
  });
  return { run: () => remove.run(), pending: remove.pending };
}
