'use client';

import { type ReactElement, useId } from 'react';
import { pressFeedback } from '../../lib/press-feedback';
import type { SwitchFieldProps } from './types';

/**
 * An on-or-off choice drawn as a slide toggle (MB.115): a `.field` block,
 * its label above and the toggle beneath at a control's height, as every
 * other field in a filter row is laid out (the owner's call). The toggle is
 * a native checkbox with `role="switch"`, not a button, so it submits
 * `name=value` with a GET form before hydration, keeps Space and its label's
 * click, and its checked state is the switch's to a screen reader. The label
 * and the toggle are each marked `data-pressed` while a pointer holds them,
 * since a phone shows `:active` late or not at all. Controlled by `checked`,
 * or uncontrolled from `defaultChecked`, as a filter that applies on the
 * change draws it: the new list draws it again from the filter it shows.
 * Enter turns it as a click does (MB.261): a native checkbox flips on Space
 * alone and Enter would only submit the form around it, so the key press is
 * cancelled and answered with a click, which flips the checkbox and fires its
 * change whether it is controlled or not, the one path a press takes.
 */
export function SwitchField({
  label,
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  disabled,
}: SwitchFieldProps): ReactElement {
  const id = useId();
  return (
    <div className="field switch">
      <label className="field__label" htmlFor={id} {...pressFeedback}>
        {label}
      </label>
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
          onChange={(event) => onChange(event.target.checked)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.currentTarget.click();
          }}
          {...pressFeedback}
        />
      </div>
    </div>
  );
}
