'use client';

import type { ReactElement } from 'react';
import { SwitchField } from './switch-field';

// The Share With the Coven switch a spell and a working both use: on is the coven, off is the author
// alone. It holds no rule of its own; the caller says when it is shut and why.

export interface VisibilitySwitchProps {
  /** What is being shared, for the line under the switch. */
  noun: 'spell' | 'working';
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

export function VisibilitySwitch({
  noun,
  checked,
  onChange,
  sharedForGood,
  heldPrivate,
}: VisibilitySwitchProps): ReactElement {
  const tip =
    noun === 'spell'
      ? 'It cannot be made private again. Duplicate makes a private copy.'
      : 'It cannot be made private again.';
  return (
    <SwitchField
      label="Share With the Coven"
      name="visibility"
      value="workspace"
      checked={sharedForGood || checked}
      onChange={onChange}
      disabled={sharedForGood || heldPrivate !== undefined}
      note={
        sharedForGood
          ? SHARED_FOR_GOOD
          : (heldPrivate ?? (checked ? MEANS.workspace(noun) : MEANS.private()))
      }
      noteTip={sharedForGood ? tip : undefined}
    />
  );
}
