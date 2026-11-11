import type { ReactElement, ReactNode, Ref } from 'react';
import BusyButton from '../BusyButton';
import '../Modal/index.scss';

// The row under a yes-or-no question: the confirm, an optional second confirm, and the safe answer
// that comes last. One row for the confirm dialog, the confirmation over a form and the discard
// question, so the buttons keep one order, one style and one busy state (claude-docs/components/confirm-dialog.md).

interface ConfirmAnswersRowProps {
  /** The confirm's text. */
  label: ReactNode;
  /** The confirm's button style, `btn btn--destructive` unless the answer can be taken back. */
  className?: string;
  /** The confirm's text while its write runs; absent for a confirm that is never busy. */
  busyLabel?: string;
  busy?: boolean;
  /** The confirm is off, though nothing may be running. */
  disabled?: boolean;
  /** The id of the warning the confirm is described by. */
  describedBy?: string;
  confirmRef?: Ref<HTMLButtonElement>;
  onConfirm: () => void;
  /** A second confirm beside the first, whose action cannot be taken back. */
  also?: {
    label: string;
    busyLabel: string;
    busy: boolean;
    disabled?: boolean;
    onClick: () => void;
  };
  /** The safe answer's text. */
  safeLabel?: string;
  safeRef?: Ref<HTMLButtonElement>;
  safeDisabled?: boolean;
  onSafe: () => void;
}

const ConfirmAnswersRow = ({
  label,
  className = 'btn btn--destructive',
  busyLabel,
  busy = false,
  disabled = false,
  describedBy,
  confirmRef,
  onConfirm,
  also,
  safeLabel = 'Cancel',
  safeRef,
  safeDisabled = false,
  onSafe,
}: ConfirmAnswersRowProps): ReactElement => (
  <div className="modal__actions">
    <BusyButton
      ref={confirmRef}
      className={className}
      aria-describedby={describedBy}
      disabled={disabled}
      busy={busy}
      busyLabel={busyLabel}
      onClick={onConfirm}
    >
      {label}
    </BusyButton>
    {also && (
      <BusyButton
        className="btn btn--destructive"
        disabled={also.disabled}
        busy={also.busy}
        busyLabel={also.busyLabel}
        onClick={also.onClick}
      >
        {also.label}
      </BusyButton>
    )}
    <button
      ref={safeRef}
      type="button"
      className="btn btn--quiet"
      disabled={safeDisabled}
      onClick={onSafe}
    >
      {safeLabel}
    </button>
  </div>
);

export default ConfirmAnswersRow;
