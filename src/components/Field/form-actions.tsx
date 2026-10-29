import { type ReactElement, useId } from 'react';
import BusyButton from '../BusyButton';
import IconTip from '../IconTip';
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
 * `aside` takes Delete's place for a form with other choices to set apart.
 * Save is renamed where the form does something other than save: the admin
 * invitation form's Send Invitation (MB.119).
 * `saveReason` says why Save is off, in a tip on the button that opens on hover, focus and a
 * tap (IconTip), and as its description. The button is then `aria-disabled` and not `disabled`,
 * which would take it out of the tab order and give it no hover or focus to open the tip from;
 * it looks the same, and the press does nothing.
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
