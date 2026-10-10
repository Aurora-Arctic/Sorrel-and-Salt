'use client';

import { ClientError } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import Modal from '../Modal';
import type { ConfirmedActionProps, ConfirmStep } from './types';

// A row's action that asks first, in a modal naming the user, shared by the
// creation control (M5.8) and the role control (MB.59): the modal's confirm
// sends the write and stays busy until the re-read page replaces the row; a
// refusal closes it and says why in the row. The service is the guard; this
// only puts it where an admin looks (claude-docs/components/user-list.md).

const GENERIC_ERROR = "That didn't work. Please try again.";

/** The service's own refusal, verbatim, or one generic sentence. */
function messageOf(error: unknown): string {
  if (!(error instanceof ClientError)) return GENERIC_ERROR;
  return error.response.errors?.[0]?.message || GENERIC_ERROR;
}

const ConfirmedAction = ({
  label,
  accessibleName,
  openClass,
  title,
  question,
  warning,
  busy,
  confirmClass,
  withNote = false,
  send,
}: ConfirmedActionProps): ReactElement => {
  const router = useRouter();
  const warningId = useId();
  const noteId = useId();
  const noteHintId = useId();
  const [step, setStep] = useState<ConfirmStep>('idle');
  const [failure, setFailure] = useState<string>();
  const [note, setNote] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  // Set by Cancel only, so the first render takes no focus.
  const returning = useRef(false);

  // Focus follows the step: to the modal's action when asked, back to the
  // row's on Cancel.
  useEffect(() => {
    if (step === 'confirming') confirmRef.current?.focus();
    if (step === 'idle' && returning.current) {
      returning.current = false;
      openRef.current?.focus();
    }
  }, [step]);

  async function confirm() {
    setStep('sending');
    setFailure(undefined);
    try {
      await send(note.trim() || undefined);
      // Busy until the re-read replaces this row with one offering the other action.
      router.refresh();
    } catch (error) {
      setStep('idle');
      setFailure(messageOf(error));
    }
  }

  function cancel() {
    returning.current = true;
    setStep('idle');
  }

  const sending = step === 'sending';
  return (
    <>
      {/* The visible label opens the accessible name, so a voice command
          saying what it sees still reaches it. */}
      <button
        ref={openRef}
        className={openClass}
        type="button"
        aria-label={accessibleName}
        onClick={() => {
          setFailure(undefined);
          setNote('');
          setStep('confirming');
        }}
      >
        {label}
      </button>
      {failure && (
        <p className="notice notice--error" role="alert">
          {failure}
        </p>
      )}
      {/* Asks first, in a modal, on the owner's call. A success leaves it open,
          busy, until the refresh replaces this control; a refusal closes it
          and says why in the row. */}
      {step !== 'idle' && (
        <Modal title={title} onClose={cancel}>
          {(close) => (
            <>
              <p>{question}</p>
              {warning && (
                <p id={warningId} className="notice notice--warn user-list__warning">
                  {warning}
                </p>
              )}
              {withNote && (
                <div className="field">
                  <label className="field__label" htmlFor={noteId}>
                    Reason
                  </label>
                  <p id={noteHintId} className="field__hint">
                    Optional. Kept with the change in the record of who changed what.
                  </p>
                  <input
                    id={noteId}
                    className="input"
                    type="text"
                    autoComplete="off"
                    aria-describedby={noteHintId}
                    value={note}
                    disabled={sending}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              )}
              <div className="modal__actions">
                {/* Described by the warning: the focus lands here as the modal
                    opens, so the warning is read with what it confirms. */}
                <button
                  ref={confirmRef}
                  className={confirmClass}
                  type="button"
                  aria-describedby={warning ? warningId : undefined}
                  disabled={sending}
                  aria-busy={sending || undefined}
                  onClick={() => void confirm()}
                >
                  {sending && <span className="spinner" aria-hidden="true" />}
                  {sending ? busy : label}
                </button>
                <button className="btn btn--quiet" type="button" disabled={sending} onClick={close}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
};

export default ConfirmedAction;
