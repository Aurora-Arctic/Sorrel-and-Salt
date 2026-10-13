import type { ReactElement } from 'react';
import BusyButton from '../BusyButton';
import type { FormActionsProps } from './types';

/**
 * A form's row of actions (MB.115), written once for the admin forms and the
 * ingredient form, where each drew its own: Save, off until there is
 * something to save and busy from the press to the answer, "Saving
 * Ingredient" with a spinner (the owner's rules for every form, M5.6);
 * any further saves after it; Cancel, quiet; and Delete, destructive and set
 * apart at the far end. `.form__actions` rather than `.modal__actions`: it
 * wraps, so a third button never squeezes the row. What Cancel and Delete do
 * is the form's: Cancel calls its discard guard, Delete asks its question.
 * Save is renamed where the form does something other than save: the admin
 * invitation form's Send Invitation (MB.119).
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
  onSave,
  onCancel,
  holdCancel = false,
  onDelete,
  children,
}: FormActionsProps): ReactElement {
  return (
    <div className="form__actions">
      <BusyButton
        // The form's submit, unless the form is a panel inside another and
        // so has none of its own to press.
        type={onSave ? 'button' : 'submit'}
        value={saveValue}
        className="btn btn--solid"
        disabled={!dirty || submitting}
        busy={busy}
        busyLabel={busyLabel}
        aria-describedby={saveDescribedBy}
        onClick={onSave}
      >
        {label}
      </BusyButton>
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
    </div>
  );
}
