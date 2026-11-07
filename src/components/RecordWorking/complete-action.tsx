'use client';

import { type ReactElement, useId } from 'react';
import IconTip, { CompleteIcon } from '../IconTip';
import { ModalButton } from '../Modal';
import WorkingCompletion from './completion';
import { completeReason } from './day';
import type { CompleteWorkingActionProps } from './types';

// Complete on a draft working's row: opens the deduction preview in a dialog (claude-docs/components/record-working.md).
// A draft dated ahead has the button `aria-disabled`, so it keeps focus and shows the day in its tip.
export default function CompleteWorkingAction({
  label = 'Complete',
  workedOn,
  ...completion
}: CompleteWorkingActionProps): ReactElement {
  const reasonId = useId();
  const waitFor = workedOn ? completeReason(workedOn) : undefined;
  if (waitFor) {
    return (
      <IconTip tip={waitFor} opensOnPress>
        <button
          type="button"
          className="icon-tip__edit"
          aria-label={label}
          aria-disabled="true"
          aria-describedby={reasonId}
        >
          <CompleteIcon />
        </button>
        <span id={reasonId} className="visually-hidden">
          {waitFor}
        </span>
      </IconTip>
    );
  }
  return (
    <ModalButton
      label={<CompleteIcon />}
      ariaLabel={label}
      tip="Complete"
      className="icon-tip__edit"
      title="Complete Working"
    >
      {(close) => <WorkingCompletion {...completion} onBack={close} />}
    </ModalButton>
  );
}
