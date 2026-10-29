'use client';

import { type ReactElement, useId } from 'react';
import { pressFeedback } from '../../lib/press-feedback';
import { FacetCount } from './facet-count';

/** An on-or-off filter drawn as SwitchField draws it, with its count after the name; SwitchField's label is a string the ingredient form shares, so the panel draws its own rather than widen it. */
export function FacetSwitch({
  label,
  count,
  name,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): ReactElement {
  const id = useId();
  return (
    <div className="field switch">
      <label className="field__label" htmlFor={id} {...pressFeedback}>
        {label}
        {count !== undefined && <FacetCount count={count} />}
      </label>
      <div className="switch__control">
        <input
          id={id}
          type="checkbox"
          // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props
          role="switch"
          name={name}
          value="1"
          checked={checked}
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
