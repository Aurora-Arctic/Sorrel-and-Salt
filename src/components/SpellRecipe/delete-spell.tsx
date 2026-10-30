'use client';

import { useMutation } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { covenTarget } from '../../lib/coven-path';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import BusyButton from '../BusyButton';
import Modal from '../Modal';
import type { DeleteSpellActionProps } from './types';
import type { SpellVisibility } from '@/modules/grimoire';

// Delete Spell: the question naming the spell, asked in a dialog before `deleteSpell` runs. Confirmed,
// the page leaves for the grimoire list, replacing the history entry so Back does not return to a 404.
// Not a `ConfirmQuestion`, which asks over a form and the More menu has none (claude-docs/components/spell-recipe.md, "Delete Spell").

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
    // The target is read off the path alone: the query carries what was deleted, not where.
    onSuccess: () =>
      navigate(deletedHref, { replace: true, target: covenTarget(deletedHref.split('?')[0]!) }),
    onError: (error) => {
      onClosed();
      onRefused(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
    },
  });
  return { remove: remove.mutate, pending: remove.isPending || remove.isSuccess };
}

/** The question naming the spell and its two answers. */
function DeleteSpellQuestion({
  name,
  visibility,
  pending,
  onConfirm,
  close,
}: {
  name: string;
  visibility?: SpellVisibility;
  pending: boolean;
  onConfirm: () => void;
  close: () => void;
}): ReactElement {
  return (
    <>
      <p>
        Delete <strong>{name}</strong>?{' '}
        {visibility === 'workspace'
          ? 'It leaves the grimoire for every member of the coven, and nothing in stock changes.'
          : 'It is gone for good, and nothing in stock changes.'}
      </p>
      <div className="modal__actions">
        <BusyButton
          className="btn btn--destructive"
          busy={pending}
          busyLabel="Deleting"
          disabled={pending}
          onClick={onConfirm}
        >
          Delete
        </BusyButton>
        <button type="button" className="btn btn--quiet" disabled={pending} onClick={close}>
          Cancel
        </button>
      </div>
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
    <Modal title="Delete Spell" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <DeleteSpellQuestion
          name={name}
          visibility={visibility}
          pending={pending}
          onConfirm={onConfirm}
          close={close}
        />
      )}
    </Modal>
  );
}
