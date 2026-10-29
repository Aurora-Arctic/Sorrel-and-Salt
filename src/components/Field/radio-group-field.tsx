'use client';

import { type ReactElement, useId } from 'react';
import { pressFeedback } from '../../lib/press-feedback';
import IconTip from '../IconTip';
import InfoTip from '../InfoTip';
import type { RadioGroupFieldProps } from './types';

/**
 * One choice from a few, each with its own line of explanation: a native radio group in a `.fieldset`,
 * so the arrow keys move the choice. Controlled by `value`. `note` is the group's own line; `layout`
 * `strip` or `segmented` draws a bar (claude-docs/components/field.md).
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
  hint,
}: RadioGroupFieldProps<T>): ReactElement {
  const id = useId();
  const strip = layout === 'strip';
  const segmented = layout === 'segmented';
  const noteId = `${id}-note`;
  const hintId = `${id}-hint`;
  return (
    <fieldset
      className={
        strip
          ? 'fieldset radio-group radio-group--strip'
          : segmented
            ? 'fieldset radio-group radio-group--segmented'
            : 'fieldset radio-group'
      }
      disabled={disabled}
      aria-describedby={[note && noteId, hint && hintId].filter(Boolean).join(' ') || undefined}
    >
      <legend className="fieldset__legend">
        {hint ? (
          <span className="field__label-row">
            {legend}
            <InfoTip id={hintId} label={legend}>
              {hint}
            </InfoTip>
          </span>
        ) : (
          legend
        )}
      </legend>
      {strip && (
        <>
          <div className="radio-strip">
            {/* Each segment's name in a tip above it, on hover and on its
                radio's focus, for a sighted person who cannot tell the icons
                apart before choosing. */}
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
      {segmented && (
        <div className="radio-strip radio-strip--text">
          {options.map((option) => (
            <label
              key={option.value}
              className="radio radio--segment radio--text"
              {...pressFeedback}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                {...pressFeedback}
              />
              {option.label}
              {/* The space is a text node of the label's own: an accessible
                  name drops the one a span begins with. */}
              {option.count !== undefined && (
                <>
                  {' '}
                  <span className="radio__count">{option.count}</span>
                </>
              )}
            </label>
          ))}
        </div>
      )}
      {!strip &&
        !segmented &&
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
