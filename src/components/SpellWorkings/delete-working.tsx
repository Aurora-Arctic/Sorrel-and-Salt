'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useCallback, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { BinButton } from '../IconTip';
import Modal from '../Modal';
import type { DeleteWorkingActionProps } from './types';

// Delete Working: the bin on a working's row, which asks in a dialog before `deleteWorking` runs.
// The page is read again afterwards, so the row and the card's count both drop it.

export const DeleteWorkingDocument = graphql(`
  mutation DeleteWorking($workspaceId: ID!, $id: ID!) {
    deleteWorking(workspaceId: $workspaceId, id: $id)
  }
`);

export default function DeleteWorkingAction({
  workspaceId,
  workingId,
  name,
}: DeleteWorkingActionProps): ReactElement {
  const [asking, setAsking] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const feedback = useClickFeedback({ name: `Delete Working ${name}` });
  const { anchorRef } = feedback;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const { refresh } = usePendingNavigation();
  const remove = useMutation({
    mutationFn: () => graphqlRequest(DeleteWorkingDocument, { id: workingId, workspaceId }),
    onSuccess: () => {
      setAsking(false);
      refresh();
    },
    onError: (error) => {
      setAsking(false);
      feedback.report(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
    },
  });

  return (
    <>
      <BinButton
        ref={triggerRef}
        verb="Delete Working"
        name={name}
        onClick={() => {
          feedback.report(undefined);
          setAsking(true);
        }}
      />
      {feedback.feedback}
      {asking && (
        <Modal
          title="Delete Working"
          onClose={() => setAsking(false)}
          returnTo={() => (trigger.current?.isConnected ? trigger.current : null)}
        >
          {(close) => (
            <>
              <p>
                Delete the working of <strong>{name}</strong>? It is removed from the spell&rsquo;s
                history and from the count. What it took from the jars stays taken.
              </p>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--destructive"
                  busy={remove.isPending}
                  busyLabel="Deleting"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Delete
                </BusyButton>
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={remove.isPending}
                  onClick={close}
                >
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
