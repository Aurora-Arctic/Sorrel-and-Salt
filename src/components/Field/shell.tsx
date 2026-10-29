import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import InfoTip from '../InfoTip';
import type { FieldErrorProps, FieldShellProps } from './types';

// The shell and its parts, apart from the react-hook-form fields: no hook and
// no form library here, so a plain-state form, or a server component, renders
// them around its own control (claude-docs/components/field.md).

/** The one element a field's error renders through, whether the resolver found it or the server did. */
export function FieldError({ id, message }: FieldErrorProps): ReactElement | null {
  if (!message) return null;
  return (
    <p id={id} className="field__error">
      {message}
    </p>
  );
}

/**
 * For the eye, hard against the label: "Name*". Hidden from the field's name,
 * so a screen reader hears "Name" and the control's `aria-required` rather
 * than "Name star".
 */
export const Required = (): ReactElement => (
  <span className="field__required" aria-hidden="true">
    *
  </span>
);

/** The block around one control: its label row, note, the control, and its error. */
export function FieldShell({
  label,
  labelSuffix,
  hint,
  note,
  required,
  controlId,
  labelId,
  hintId,
  noteId,
  errorId,
  error,
  children,
  after,
  action,
  className,
  errorInto,
}: FieldShellProps): ReactElement {
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      {/* Positioned by the primitive: the hint's tip places itself above its
          nearest positioned ancestor (claude-docs/components/info-tip.md). */}
      <div className="field__label-row">
        <label className="field__label" id={labelId} htmlFor={controlId}>
          {label}
          {labelSuffix && <span className="visually-hidden">, {labelSuffix}</span>}
          {required && <Required />}
        </label>
        {hint && (
          <InfoTip id={hintId} label={labelSuffix ? `${label}, ${labelSuffix}` : label}>
            {hint}
          </InfoTip>
        )}
        {action}
      </div>
      {note && (
        <p className="field__hint" id={noteId}>
          {note}
        </p>
      )}
      {children}
      {errorInto ? (
        createPortal(<FieldError id={errorId} message={error} />, errorInto)
      ) : (
        <FieldError id={errorId} message={error} />
      )}
      {after}
    </div>
  );
}
