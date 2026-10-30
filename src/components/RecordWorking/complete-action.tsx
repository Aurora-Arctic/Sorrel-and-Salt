'use client';

import type { ReactElement } from 'react';
import { CompleteIcon } from '../IconTip';
import { ModalButton } from '../Modal';
import WorkingCompletion from './completion';
import type { CompleteWorkingActionProps } from './types';

// Complete on a draft working's row: the flask-and-tick icon button opening the deduction preview in a dialog, and its
// Confirm. The Record a Working dialog draws the same panel in place instead
// (claude-docs/components/record-working.md).
export default function CompleteWorkingAction({
  label = 'Complete',
  ...completion
}: CompleteWorkingActionProps): ReactElement {
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
