'use client';

import { type ReactElement, useRef } from 'react';
import { GENERIC_FAILURE, readGraphqlIssues } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { ConfirmOverlay } from './confirm-overlay';
import { DiscardQuestion } from './discard';
import type { ConfirmQuestionProps } from './types';

/**
 * A form's yes-or-no question over itself (MB.115), written once for the
 * forms that each drew their own: "Delete "Fixture Healing"? …" with Delete,
 * destructive and busy "Deleting" until it is answered, and Keep It, the safe
 * answer the focus lands on. A `ConfirmOverlay`, so it is asked in the modal
 * over the form, centred however far the form is scrolled.
 *
 * Given the form's discard guard, it also settles which question shows: the
 * unsaved changes' while that one asks, since they are what a way out would
 * lose, and its own only while `asked`. And when `onConfirm` rejects, it
 * reads the refusal, the server's first sentence, and hands it to
 * `onRefused` for the form's alert: not a bad value in a box, but a refusal
 * naming its remedy (DESIGN.md §7).
 */
export function ConfirmQuestion({
  question,
  details,
  asked = true,
  guard,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting',
  tone = 'destructive',
  keepLabel = 'Keep It',
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
