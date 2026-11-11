'use client';

import type { ReactElement, ReactNode } from 'react';
import Spinner from '../Spinner';
import { pressFeedback } from '../../lib/press-feedback';
import type { SwitchControlProps } from './types';

/**
 * The slide toggle's markup with no form bound to it: a native checkbox with `role="switch"`, so it submits
 * `name=value` in a GET form before hydration. Enter answers with a click, as a checkbox flips on Space alone
 * (claude-docs/components/field.md, "Switch, search and select fields for filters").
 */
export function SwitchControl({
  id,
  children,
  tip,
  footer,
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  disabled,
  busy,
  describedBy,
}: SwitchControlProps & { children: ReactNode }): ReactElement {
  const labelElement = (
    <label className="field__label" htmlFor={id} {...pressFeedback}>
      {children}
    </label>
  );
  return (
    <div className="field switch">
      {tip ? (
        <div className="field__label-row">
          {labelElement}
          {tip}
        </div>
      ) : (
        labelElement
      )}
      <div className="switch__control">
        {/* No `aria-checked`: a native checkbox's own checked state is the
            switch's, and one written beside it would go stale on a press
            before hydration, which axe fails and a screen reader may read. */}
        <input
          id={id}
          type="checkbox"
          // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props
          role="switch"
          name={name}
          value={value}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-busy={busy || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.checked)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.currentTarget.click();
          }}
          {...pressFeedback}
        />
        {/* While busy the ring stands where the thumb was (hidden by the stylesheet), so the
            track's fill and the end it sits at still say the state. */}
        {busy && <Spinner className="switch__spinner" />}
      </div>
      {footer}
    </div>
  );
}
