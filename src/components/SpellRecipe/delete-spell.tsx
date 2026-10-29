'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useCallback, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { covenTarget } from '../../lib/coven-path';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { BinButton } from '../IconTip';
import Modal from '../Modal';
import type { DeleteSpellActionProps } from './types';

// Delete Spell on the recipe page (M13.11), as a coven's own ingredient's page has its Delete
// (M8.17, M9.10): the bin beside the Edit pencil, named for the spell, which asks in a dialog
// before `deleteSpell` runs. The dialog names the spell and says the coven loses it, since a
// shared spell can be deleted (story 56's rule governs widening, not existence). Confirmed, the
// page leaves for the grimoire list, replacing the history entry so Back does not return to a
// 404, with the list told what was deleted; the Modal, gone with the page, gives the focus to
// the list's heading. A refusal is the callout under the bin (M12.31). Not a `ConfirmQuestion`:
// that card asks over a form, and this page has none (claude-docs/components/spell-recipe.md).

export const DeleteSpellDocument = graphql(`
  mutation DeleteSpell($workspaceId: ID!, $id: ID!) {
    deleteSpell(workspaceId: $workspaceId, id: $id)
  }
`);

export default function DeleteSpellAction({
  workspaceId,
  spellId,
  name,
  deletedHref,
}: DeleteSpellActionProps): ReactElement {
  const [asking, setAsking] = useState(false);
  // The bin, where the focus goes back to once the dialog closes; once the delete has led
  // away it is gone, and Modal gives the focus to the heading.
  const trigger = useRef<HTMLButtonElement | null>(null);
  const feedback = useClickFeedback({ name: `Delete Spell ${name}` });
  const { anchorRef } = feedback;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const { navigate } = usePendingNavigation();
  const remove = useMutation({
    mutationFn: () => graphqlRequest(DeleteSpellDocument, { id: spellId, workspaceId }),
    // The target is read off the path alone: the query carries what was deleted, not where.
    onSuccess: () =>
      navigate(deletedHref, { replace: true, target: covenTarget(deletedHref.split('?')[0]!) }),
    onError: (error) => {
      setAsking(false);
      feedback.report(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
    },
  });
  // Busy past the write until the list arrives, so the confirmation closes with the page.
  const pending = remove.isPending || remove.isSuccess;

  return (
    <>
      <BinButton
        ref={triggerRef}
        verb="Delete Spell"
        name={name}
        onClick={() => {
          feedback.report(undefined);
          setAsking(true);
        }}
      />
      {feedback.feedback}
      {asking && (
        <Modal
          title="Delete Spell"
          onClose={() => setAsking(false)}
          returnTo={() => (trigger.current?.isConnected ? trigger.current : null)}
        >
          {(close) => (
            <>
              <p>
                Delete <strong>{name}</strong>? It leaves the grimoire for every member of the
                coven. Nothing in stock changes.
              </p>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--destructive"
                  busy={pending}
                  busyLabel="Deleting"
                  disabled={pending}
                  onClick={() => remove.mutate()}
                >
                  Delete
                </BusyButton>
                <button type="button" className="btn btn--quiet" disabled={pending} onClick={close}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
