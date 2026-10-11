'use client';

import type { ReactElement } from 'react';
import { pressFeedback } from '../../lib/press-feedback';
import type { SwitchFieldProps } from './types';

/**
 * An on-or-off choice drawn as a slide toggle (MB.115): a native checkbox
 * rather than a button, so it submits `name=value` with a GET form before
 * hydration, keeps Space and the label's click, and its checked state is
 * the switch's to a screen reader. Marked `data-pressed` while a pointer
 * holds it, since a phone shows `:active` late or not at all.
 */
export function SwitchField({
  label,
  name,
  value,
  checked,
  onChange,
  disabled,
}: SwitchFieldProps): ReactElement {
  return (
    <label className="switch" {...pressFeedback}>
      {/* No `aria-checked`: a native checkbox's own checked state is the
          switch's, and one written beside it would go stale on a press
          before hydration, which axe fails and a screen reader may read. */}
      <input
        type="checkbox"
        // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props
        role="switch"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
