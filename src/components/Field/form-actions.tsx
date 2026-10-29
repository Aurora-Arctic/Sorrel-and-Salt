import { type ReactElement, useId } from 'react';
import BusyButton from '../BusyButton';
import IconTip from '../IconTip';
import type { FormActionsProps } from './types';

/**
 * A form's row of actions: Save, quiet Cancel, destructive Delete at the far end, and further saves
 * (claude-docs/components/field.md, "Notes from code comments: filter and action fields"). `aside` takes
 * Delete's place; `saveReason` makes Save `aria-disabled`, so it keeps focus and the tip.
 */
export function FormActions({
  noun,
  label = `Save ${noun}`,
  busyLabel = `Saving ${noun}`,
  dirty,
  submitting,
  busy = submitting,
  saveValue,
  saveDescribedBy,
  saveReason,
  onSave,
  onCancel,
  holdCancel = false,
  onDelete,
  children,
  aside,
}: FormActionsProps): ReactElement {
  const reasonId = useId();
  const off = !dirty || submitting;
  // Told only while Save is off for a reason the form can say.
  const told = off && saveReason ? saveReason : null;
  const save = (
    <BusyButton
      // The form's submit, unless the form is a panel inside another and
      // so has none of its own to press.
      type={onSave || told ? 'button' : 'submit'}
      value={saveValue}
      className="btn btn--solid"
      disabled={off && !told}
      aria-disabled={told ? true : undefined}
      busy={busy}
      busyLabel={busyLabel}
      aria-describedby={
        [saveDescribedBy, told ? reasonId : undefined].filter(Boolean).join(' ') || undefined
      }
      onClick={told ? undefined : onSave}
    >
      {label}
    </BusyButton>
  );
  return (
    <div className="form__actions">
      {told ? (
        <IconTip tip={told} placement="above" opensOnPress>
          {save}
          <span id={reasonId} className="visually-hidden">
            {told}
          </span>
        </IconTip>
      ) : (
        save
      )}
      {children}
      {onCancel && (
        <button
          type="button"
          className="btn btn--quiet"
          disabled={holdCancel && submitting}
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
      {onDelete && (
        <button type="button" className="btn btn--destructive form__aside" onClick={onDelete}>
          {`Delete ${noun}`}
        </button>
      )}
      {aside && <div className="form__aside">{aside}</div>}
    </div>
  );
}
