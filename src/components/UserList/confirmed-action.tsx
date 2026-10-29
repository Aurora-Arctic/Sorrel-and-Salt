'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { ReasonField } from '../Field';
import Modal, { ConfirmOverlay } from '../Modal';
import Notice from '../Notice';
import type { ConfirmAnswersProps, ConfirmedActionProps, ConfirmStep } from './types';
import './controls.scss';

// An action that asks first, in a modal: the confirm sends the write and stays busy until the
// page is read again. A refusal closes the modal and says why in a callout under the button.
// (claude-docs/components/user-list.md, "Notes from code comments: confirmed action")

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
  announcement,
  choices,
  closeOnSent = false,
  inModal = false,
  refusalInModal = 'notice',
}: ConfirmedActionProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const warningId = useId();

  const [step, setStep] = useState<ConfirmStep>('idle');
  const [failure, setFailure] = useState<string>();
  const [note, setNote] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const feedback = useClickFeedback({ name: accessibleName });
  const { anchorRef } = feedback;
  // One ref for both: the focus return holds it, and the callout hangs from it.
  const openButton = useCallback(
    (node: HTMLButtonElement | null) => {
      openRef.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );

  // The focus goes to the modal's action when asked; Modal gives it back to
  // the row's button as it closes, on Cancel or a refusal alike, so the
  // callout is read with the focus on what it is about. In a modal, the
  // overlay puts the focus on Cancel, its safe answer, and gives it back
  // itself.
  useEffect(() => {
    if (!inModal && step === 'confirming') confirmRef.current?.focus();
  }, [step, inModal]);

  // Outside a modal, a callout under the control. Inside one, a plain notice
  // in that dialog, which a button row's style lifts onto its own line above
  // the buttons, unless the control asks for the callout.
  function report(message: string | undefined) {
    if (inModal && refusalInModal === 'notice') setFailure(message);
    else feedback.report(message);
  }

  async function confirm() {
    setStep('sending');
    report(undefined);
    try {
      await send(note.trim() || undefined);
      if (announcement) feedback.announce(announcement);
      // Busy until the re-read replaces this control with one offering the
      // other action, or until the page is left.
      if (onSent) onSent();
      else refresh();
      // A control that survives the re-read (a member's Promote after a
      // promotion) is not replaced, so it closes its own modal.
      if (closeOnSent) setStep('idle');
    } catch (error) {
      setStep('idle');
      // No fields of its own, so the shared reader always answers an alert:
      // the service's refusal verbatim, or the one generic sentence, unless
      // the caller words the refusal itself.
      report(refusal ?? readGraphqlFailure(error).alert);
    }
  }

  function cancel() {
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
        ref={openButton}
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
      {feedback.feedback}
      {failure && <Notice kind="error">{failure}</Notice>}
      {/* Asks first, in a modal. A success leaves it open,
          busy, until the refresh replaces this control; a refusal closes it
          and says why under the control. */}
      {step !== 'idle' &&
        (inModal ? (
          <ConfirmOverlay question={question} safe={cancelRef}>
            {details}
            <Answers {...answerProps} onCancel={cancel} />
          </ConfirmOverlay>
        ) : (
          <Modal title={title} onClose={cancel} returnTo={() => openRef.current}>
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
