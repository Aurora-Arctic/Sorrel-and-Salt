'use client';

import { type ReactElement, useId } from 'react';
import { pressFeedback } from '../../lib/press-feedback';
import type { RadioGroupFieldProps } from './types';

/**
 * One choice from a few, each with its own line of explanation: a native
 * radio group in a `.fieldset`, its legend the group's name. Native, so the
 * arrow keys move the choice and a screen reader hears "2 of 3". The
 * explanation is the radio's description, read after its name. Controlled by
 * `value`; the caller holds the state (claude-docs/components/field.md).
 */
export function RadioGroupField<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
}: RadioGroupFieldProps<T>): ReactElement {
  const id = useId();
  return (
    <fieldset className="fieldset radio-group" disabled={disabled}>
      <legend className="fieldset__legend">{legend}</legend>
      {options.map((option) => {
        const descriptionId = `${id}-${option.value}`;
        return (
          <label key={option.value} className="radio" {...pressFeedback}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              aria-describedby={option.description ? descriptionId : undefined}
              onChange={() => onChange(option.value)}
              {...pressFeedback}
            />
            <span className="radio__text">
              <span className="radio__label">{option.label}</span>
              {option.description && (
                <span className="radio__description" id={descriptionId}>
                  {option.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
