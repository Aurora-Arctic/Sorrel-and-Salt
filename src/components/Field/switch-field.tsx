'use client';

import { type ReactElement, useId } from 'react';
import InfoTip from '../InfoTip';
import { SwitchControl } from './switch-control';
import type { SwitchFieldProps } from './types';

/** An on-or-off choice as a slide toggle (`SwitchControl`), with its hint beside the label and its note beneath. */
export function SwitchField({
  label,
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  disabled,
  busy,
  hint,
  note,
  noteTip,
}: SwitchFieldProps): ReactElement {
  const id = useId();
  const hintId = `${id}-hint`;
  const noteId = `${id}-note`;
  const noteTipId = `${id}-note-tip`;
  const describedBy =
    [hint && hintId, note && noteId, note && noteTip && noteTipId].filter(Boolean).join(' ') ||
    undefined;
  return (
    <SwitchControl
      id={id}
      name={name}
      value={value}
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={onChange}
      disabled={disabled}
      busy={busy}
      describedBy={describedBy}
      tip={
        hint ? (
          <InfoTip id={hintId} label={label}>
            {hint}
          </InfoTip>
        ) : undefined
      }
      footer={
        note ? (
          <p id={noteId} className="field__hint">
            {note}
            {noteTip && (
              <>
                {' '}
                <InfoTip id={noteTipId} label={label}>
                  {noteTip}
                </InfoTip>
              </>
            )}
          </p>
        ) : undefined
      }
    >
      {label}
    </SwitchControl>
  );
}
