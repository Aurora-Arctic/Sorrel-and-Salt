'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import Modal from '../Modal';
import Notice from '../Notice';
import type { ConfirmedActionProps, ConfirmStep } from './types';
import './controls.scss';

// A row's action that asks first, in a modal naming the user, shared by the
// creation control (M5.8) and the role control (MB.59): the modal's confirm
// sends the write and stays busy until the re-read page replaces the row; a
// refusal closes it and says why in the row. The service is the guard; this
// only puts it where an admin looks (claude-docs/components/user-list.md).

/** The Reason field's line beneath its label, in view rather than in a tip until the section's sign-off (MB.115, 1d.12). */
const NOTE_HINT = 'Kept with the change in the record of who changed what.';

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
  const { aria: noteAria, ...noteField } = fieldDescription({ id: useId(), note: NOTE_HINT });
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
      // No fields of its own, so the shared reader always answers an alert:
      // the service's refusal verbatim, or the one generic sentence.
      setFailure(readGraphqlFailure(error).alert);
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
      {failure && <Notice kind="error">{failure}</Notice>}
      {/* Asks first, in a modal, on the owner's call. A success leaves it open,
          busy, until the refresh replaces this control; a refusal closes it
          and says why in the row. */}
      {step !== 'idle' && (
        <Modal title={title} onClose={cancel}>
          {(close) => (
            <>
              <p>{question}</p>
              {/* Quiet, a status rather than an alert: this warning is read
                  once, as the description of the button the focus lands on,
                  and an alert would say it twice. */}
              {warning && (
                <Notice kind="warn" quiet id={warningId} className="user-list__warning">
                  {warning}
                </Notice>
              )}
              {withNote && (
                // The wrapper holds the field's room above and below; the shell
                // takes no class of its own.
                <div className="user-list__note">
                  <FieldShell label="Reason" note={NOTE_HINT} {...noteField}>
                    <input
                      id={noteField.controlId}
                      className="input"
                      type="text"
                      autoComplete="off"
                      {...noteAria}
                      value={note}
                      disabled={sending}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </FieldShell>
                </div>
              )}
              <div className="modal__actions">
                {/* Described by the warning: the focus lands here as the modal
                    opens, so the warning is read with what it confirms. */}
                <BusyButton
                  ref={confirmRef}
                  className={confirmClass}
                  aria-describedby={warning ? warningId : undefined}
                  disabled={sending}
                  busy={sending}
                  busyLabel={busy}
                  onClick={() => void confirm()}
                >
                  {label}
                </BusyButton>
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
