'use client';

import type { ReactElement } from 'react';
import { SwitchField } from './switch-field';

export interface VisibilitySwitchProps {
  noun: 'spell' | 'working';
  label?: string;
  brief?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Shut on: already shared and complete, so it cannot be made private again. */
  sharedForGood?: boolean;
  /** Shut off by a rule outside this item, said in this line instead of the usual one. */
  heldPrivate?: string;
}

const MEANS = {
  workspace: (noun: string) =>
    `Every member of the coven can see it. Once the ${noun} is complete, it stays shared.`,
  private: () => 'Only you can see it, until you share it with the coven.',
};

const SHARED_FOR_GOOD = 'Shared with the coven';

const BRIEF = {
  workspace: 'The coven can see it.',
  private: 'Only you can see it.',
  stays: (noun: string) => `Once the ${noun} is complete, it stays shared.`,
};

export function VisibilitySwitch({
  noun,
  label = 'Share With the Coven',
  brief,
  checked,
  onChange,
  sharedForGood,
  heldPrivate,
}: VisibilitySwitchProps): ReactElement {
  const tip =
    noun === 'spell'
      ? 'It cannot be made private again. Duplicate makes a private copy.'
      : 'It cannot be made private again.';
  const on = sharedForGood || checked;
  const note = brief
    ? (heldPrivate ?? (on ? BRIEF.workspace : BRIEF.private))
    : sharedForGood
      ? SHARED_FOR_GOOD
      : (heldPrivate ?? (checked ? MEANS.workspace(noun) : MEANS.private()));
  const noteTip = sharedForGood
    ? tip
    : brief && checked && heldPrivate === undefined
      ? BRIEF.stays(noun)
      : undefined;
  return (
    <SwitchField
      label={label}
      name="visibility"
      value="workspace"
      checked={on}
      onChange={onChange}
      disabled={sharedForGood || heldPrivate !== undefined}
      note={note}
      noteTip={noteTip}
    />
  );
}
