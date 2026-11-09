'use client';

import { useMutation } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { failureMessage } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import ConfirmDialog from '../ConfirmDialog';
import type { DeleteSpellActionProps } from './types';
import type { SpellVisibility } from '@/modules/grimoire';

// Delete Spell: the question naming the spell, asked in a dialog before `deleteSpell` runs. Confirmed,
// the page leaves for the grimoire list, replacing the history entry so Back does not return to a 404.
// Not a `ConfirmQuestion`, which asks over a form and the More menu has none (claude-docs/components/spell-recipe.md, "The actions row").

export const DeleteSpellDocument = graphql(`
  mutation DeleteSpell($workspaceId: ID!, $id: ID!) {
    deleteSpell(workspaceId: $workspaceId, id: $id)
  }
`);

/**
 * The delete write and where it leaves for. `pending` runs past the write until the list arrives,
 * so the confirmation closes with the page; `onRefused` gets the service's refusal after the
 * dialog has closed.
 */
export function useDeleteSpell({
  workspaceId,
  spellId,
  deletedHref,
  onRefused,
  onClosed,
}: Pick<DeleteSpellActionProps, 'workspaceId' | 'spellId' | 'deletedHref'> & {
  onRefused: (message: string) => void;
  onClosed: () => void;
}) {
  const { navigate } = usePendingNavigation();
  const remove = useMutation({
    mutationFn: () => graphqlRequest(DeleteSpellDocument, { id: spellId, workspaceId }),
    onSuccess: () => navigate(deletedHref, { replace: true }),
    onError: (error) => {
      onClosed();
      onRefused(failureMessage(error));
    },
  });
  return { remove: remove.mutate, pending: remove.isPending || remove.isSuccess };
}

export function DeleteSpellWords({
  name,
  visibility,
}: {
  name: string;
  visibility?: SpellVisibility;
}): ReactElement {
  return (
    <>
      Delete <strong>{name}</strong>?{' '}
      {visibility === 'workspace'
        ? 'It leaves the grimoire for every member of the coven, and nothing in stock changes.'
        : 'It is gone for good, and nothing in stock changes.'}
    </>
  );
}

/** The question in a dialog opened by state, as the More menu's item opens it; it gives the focus to `returnTo()` once it closes. */
export function DeleteSpellDialog({
  name,
  visibility,
  pending,
  onConfirm,
  onClose,
  returnTo,
}: {
  name: string;
  visibility?: SpellVisibility;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  returnTo: () => HTMLElement | null;
}): ReactElement {
  return (
    <ConfirmDialog
      title="Delete Spell"
      question={<DeleteSpellWords name={name} visibility={visibility} />}
      confirmLabel="Delete"
      busyLabel="Deleting"
      busy={pending}
      onConfirm={onConfirm}
      onClose={onClose}
      returnTo={returnTo}
    />
  );
}
