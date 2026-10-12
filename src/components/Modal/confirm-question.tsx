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
  asked = true,
  guard,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting',
  tone = 'destructive',
  keepLabel = 'Keep It',
  busy,
  onConfirm,
  onKeep,
  onRefused,
}: ConfirmQuestionProps): ReactElement | null {
  const keep = useRef<HTMLButtonElement>(null);
  if (guard?.asking) return <DiscardQuestion guard={guard} />;
  if (!asked) return null;
  const confirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      if (!onRefused) throw error;
      onRefused(readGraphqlIssues(error)[0]?.message ?? GENERIC_FAILURE);
    }
  };
  return (
    <ConfirmOverlay question={question} safe={keep}>
      <div className="modal__actions">
        <BusyButton
          className={`btn btn--${tone}`}
          disabled={busy}
          busy={busy}
          busyLabel={busyLabel}
          onClick={() => void confirm()}
        >
          {confirmLabel}
        </BusyButton>
        <button ref={keep} type="button" className="btn btn--quiet" onClick={onKeep}>
          {keepLabel}
        </button>
      </div>
    </ConfirmOverlay>
  );
}
