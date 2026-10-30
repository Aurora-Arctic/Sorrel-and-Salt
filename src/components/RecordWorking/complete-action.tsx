'use client';

import type { ReactElement } from 'react';
import IconTip, { CompleteIcon } from '../IconTip';
import { ModalButton } from '../Modal';
import WorkingCompletion from './completion';
import { completeReason } from './day';
import type { CompleteWorkingActionProps } from './types';

// Complete on a draft working's row: the flask-and-tick icon button opening the deduction preview in a dialog, and its
// Confirm. The Record a Working dialog draws the same panel in place instead
// (claude-docs/components/record-working.md). A draft dated ahead has the button off, with the day in its tip.
export default function CompleteWorkingAction({
  label = 'Complete',
  workedOn,
  ...completion
}: CompleteWorkingActionProps): ReactElement {
  const waitFor = workedOn ? completeReason(workedOn) : undefined;
  if (waitFor) {
    return (
      <IconTip tip={waitFor}>
        <button type="button" className="icon-tip__edit" aria-label={label} disabled>
          <CompleteIcon />
        </button>
      </IconTip>
    );
  }
  return (
    <ModalButton
      label={<CompleteIcon />}
      ariaLabel={label}
      tip="Complete"
      className="icon-tip__edit"
      title="Complete a Working"
    >
      {(close) => <WorkingCompletion {...completion} onBack={close} />}
    </ModalButton>
  );
}
