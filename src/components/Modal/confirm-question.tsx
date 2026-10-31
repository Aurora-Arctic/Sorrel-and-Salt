'use client';

import { type ReactElement, useRef } from 'react';
import { GENERIC_FAILURE, readGraphqlIssues } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { ConfirmOverlay } from './confirm-overlay';
import { DiscardQuestion } from './discard';
import type { ConfirmQuestionProps } from './types';

/**
 * A form's yes-or-no question over itself: Delete (destructive, busy until answered) and Cancel,
 * the safe answer the focus lands on. With the discard guard it yields to the unsaved changes'
 * question; a rejected `onConfirm` hands the server's first sentence to `onRefused` (DESIGN.md §7).
 */
export function ConfirmQuestion({
  question,
  details,
  asked = true,
  guard,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting',
  tone = 'destructive',
  keepLabel = 'Cancel',
  busy,
  onConfirm,
  also,
  onKeep,
  onRefused,
}: ConfirmQuestionProps): ReactElement | null {
  const keep = useRef<HTMLButtonElement>(null);
  if (guard?.asking) return <DiscardQuestion guard={guard} />;
  if (!asked) return null;
  const running = busy || also?.busy === true;
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      if (!onRefused) throw error;
      onRefused(readGraphqlIssues(error)[0]?.message ?? GENERIC_FAILURE);
    }
  };
  return (
    <ConfirmOverlay question={question} safe={keep}>
      {details}
      <div className="modal__actions">
        <BusyButton
          className={`btn btn--${tone}`}
          disabled={running}
          busy={busy}
          busyLabel={busyLabel}
          onClick={() => void run(onConfirm)}
        >
          {confirmLabel}
        </BusyButton>
        {also && (
          <BusyButton
            className="btn btn--destructive"
            disabled={running}
            busy={also.busy}
            busyLabel={also.busyLabel}
            onClick={() => void run(also.onClick)}
          >
            {also.label}
          </BusyButton>
        )}
        <button
          ref={keep}
          type="button"
          className="btn btn--quiet"
          // Shut only beside a second answer, whose action cannot be taken back.
          disabled={also !== undefined && running}
          onClick={onKeep}
        >
          {keepLabel}
        </button>
      </div>
    </ConfirmOverlay>
  );
}

/**
 * Said, as a warning notice, in a confirmation over a form whose page goes with the answer (Make It
 * Ours's over the Annotate dialog).
 */
export const UNSAVED_CHANGES_LOST = 'Changes you have not saved are lost.';
