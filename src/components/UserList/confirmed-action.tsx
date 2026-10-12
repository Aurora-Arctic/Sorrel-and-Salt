'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { ReasonField } from '../Field';
import Modal, { ConfirmOverlay } from '../Modal';
import Notice from '../Notice';
import type { ConfirmAnswersProps, ConfirmedActionProps, ConfirmStep } from './types';
import './controls.scss';

// An action that asks first, in a modal, shared by the creation control
// (M5.8), the role control (MB.59), Impersonate (MB.53), the pause switch
// (MB.63) and the invitations' Revoke (MB.70): the modal's confirm sends the
// write and stays busy until the page is read again, or left; a refusal
// closes it and says why beside the control. Inside a modal already, the
// user's (M9.19), it asks over that modal's body through `ConfirmOverlay`
// instead, as the forms' questions do, rather than open a second modal on top. The service is the guard; this
// only puts it where an admin looks (claude-docs/components/user-list.md).

const ConfirmedAction = ({
  label,
  accessibleName,
  confirmLabel,
  openClass,
  title,
  question,
  warning,
  busy,
  confirmClass,
  withNote = false,
  send,
  onSent,
  refusal,
  onFailure,
  choices,
  closeOnSent = false,
  inModal = false,
}: ConfirmedActionProps): ReactElement => {
  const router = useRouter();
  const warningId = useId();

  const [step, setStep] = useState<ConfirmStep>('idle');
  const [failure, setFailure] = useState<string>();
  const [note, setNote] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  // Set by Cancel only, so the first render takes no focus.
  const returning = useRef(false);

  // Focus follows the step: to the modal's action when asked, back to the
  // row's on Cancel.
  // In a modal, the overlay puts the focus on Cancel, its safe answer, and
  // gives it back itself.
  useEffect(() => {
    if (inModal) return;
    if (step === 'confirming') confirmRef.current?.focus();
    if (step === 'idle' && returning.current) {
      returning.current = false;
      openRef.current?.focus();
    }
  }, [step, inModal]);

  // A caller that shows the refusal itself (the members page, above its table)
  // takes it through `onFailure`; otherwise it shows beside the control.
  function report(message: string | undefined) {
    if (onFailure) onFailure(message);
    else setFailure(message);
  }

  async function confirm() {
    setStep('sending');
    report(undefined);
    try {
      await send(note.trim() || undefined);
      // Busy until the re-read replaces this control with one offering the
      // other action, or until the page is left.
      if (onSent) onSent();
      else router.refresh();
      // A control that survives the re-read (a member's Promote after a
      // promotion) is not replaced, so it closes its own modal.
      if (closeOnSent) setStep('idle');
    } catch (error) {
      setStep('idle');
      // No fields of its own, so the shared reader always answers an alert:
      // the service's refusal verbatim, or the one generic sentence, unless
      // the caller says the refusal itself.
      report(refusal ?? readGraphqlFailure(error).alert);
    }
  }

  function cancel() {
    returning.current = true;
    setStep('idle');
  }

  const sending = step === 'sending';
  // The warning and the reason, under the question, in a modal or over one.
  const details = (
    <>
      {/* Quiet, a status rather than an alert: this warning is read once, as
          the description of the button the focus lands on, and an alert would
          say it twice. */}
      {warning && (
        <Notice kind="warn" quiet id={warningId} className="user-list__warning">
          {warning}
        </Notice>
      )}
      {typeof choices === 'function' ? choices(sending) : choices}
      {withNote && (
        <ReasonField
          className="user-list__note"
          value={note}
          onChange={setNote}
          disabled={sending}
        />
      )}
    </>
  );
  const answerProps = {
    label: confirmLabel ?? label,
    busy,
    confirmClass,
    describedBy: warning ? warningId : undefined,
    sending,
    confirmRef,
    cancelRef,
    onConfirm: () => void confirm(),
  };
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
          report(undefined);
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
      {step !== 'idle' &&
        (inModal ? (
          <ConfirmOverlay question={question} safe={cancelRef}>
            {details}
            <Answers {...answerProps} onCancel={cancel} />
          </ConfirmOverlay>
        ) : (
          <Modal title={title} onClose={cancel}>
            {(close) => (
              <>
                <p>{question}</p>
                {details}
                <Answers {...answerProps} onCancel={close} />
              </>
            )}
          </Modal>
        ))}
    </>
  );
};

/**
 * The confirm and Cancel under the question, in the modal or over one. A
 * component rather than a render helper, so its refs are passed, never read,
 * while rendering.
 */
function Answers({
  label,
  busy,
  confirmClass,
  describedBy,
  sending,
  confirmRef,
  cancelRef,
  onConfirm,
  onCancel,
}: ConfirmAnswersProps): ReactElement {
  return (
    <div className="modal__actions">
      {/* Described by the warning: the focus lands here as the modal opens,
          so the warning is read with what it confirms. */}
      <BusyButton
        ref={confirmRef}
        className={confirmClass}
        aria-describedby={describedBy}
        disabled={sending}
        busy={sending}
        busyLabel={busy}
        onClick={onConfirm}
      >
        {label}
      </BusyButton>
      <button
        ref={cancelRef}
        className="btn btn--quiet"
        type="button"
        disabled={sending}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}

export default ConfirmedAction;
