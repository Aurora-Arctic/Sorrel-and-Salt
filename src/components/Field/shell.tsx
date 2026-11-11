import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import InfoTip from '../InfoTip';
import type { FieldErrorProps, FieldShellProps } from './types';
import { cx } from '@/lib/class-names';

// The shell and its parts, apart from the react-hook-form fields: no hook and
// no form library here, so a plain-state form, or a server component, renders
// them around its own control (claude-docs/components/field.md).

/**
 * Drawn even when empty: a screen reader announces text put into a live region it already knows, and
 * skips one that arrives with its text. "Error:" opens the message because the red edge is no use to it.
 */
export function FieldError({ id, message }: FieldErrorProps): ReactElement {
  return (
    <p id={id} className="field__error" aria-live="polite">
      {message && (
        <>
          <span className="visually-hidden">Error:</span> {message}
        </>
      )}
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
    <div className={cx('field', className)}>
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
