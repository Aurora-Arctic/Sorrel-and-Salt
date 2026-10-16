'use client';

import { type ReactElement, useId } from 'react';
import { pressFeedback } from '../../lib/press-feedback';
import IconTip from '../IconTip';
import type { RadioGroupFieldProps } from './types';

/**
 * One choice from a few, each with its own line of explanation: a native
 * radio group in a `.fieldset`, its legend the group's name. Native, so the
 * arrow keys move the choice and a screen reader hears "2 of 3". The
 * explanation is the radio's description, read after its name. Controlled by
 * `value`; the caller holds the state. A `note` is the group's own line, read
 * with it, for what holds for every choice. `layout="strip"` draws the options
 * as one bar of icon-only segments with the chosen name printed beneath, still
 * a native radio underneath (claude-docs/components/field.md).
 */
export function RadioGroupField<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
  note,
  layout = 'list',
}: RadioGroupFieldProps<T>): ReactElement {
  const id = useId();
  const strip = layout === 'strip';
  const noteId = `${id}-note`;
  return (
    <fieldset
      className={strip ? 'fieldset radio-group radio-group--strip' : 'fieldset radio-group'}
      disabled={disabled}
      aria-describedby={note ? noteId : undefined}
    >
      <legend className="fieldset__legend">{legend}</legend>
      {strip && (
        <>
          <div className="radio-strip">
            {/* Each segment's name in a tip above it, on hover and on its
                radio's focus, for a sighted person who cannot tell the icons
                apart before choosing (the owner's call, 2026-10-16). */}
            {options.map((option) => (
              <IconTip key={option.value} tip={option.label} placement="above">
                <label className="radio radio--segment" {...pressFeedback}>
                  <input
                    type="radio"
                    name={name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={() => onChange(option.value)}
                    {...pressFeedback}
                  />
                  <span className="radio__segment-icon" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="visually-hidden">{option.label}</span>
                </label>
              </IconTip>
            ))}
          </div>
          {/* The checked radio already names the choice to assistive tech. */}
          <p className="radio-strip__chosen" aria-hidden="true">
            {options.find((option) => option.value === value)?.label}
          </p>
        </>
      )}
      {!strip &&
        options.map((option) => {
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
                <span className="radio__label">
                  {option.icon}
                  {option.label}
                </span>
                {option.description && (
                  <span className="radio__description" id={descriptionId}>
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      {note && (
        <p id={noteId} className="field__hint">
          {note}
        </p>
      )}
    </fieldset>
  );
}
