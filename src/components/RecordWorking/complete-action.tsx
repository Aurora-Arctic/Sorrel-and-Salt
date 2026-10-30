'use client';

import type { ReactElement } from 'react';
import { ModalButton } from '../Modal';
import WorkingCompletion from './completion';
import type { CompleteWorkingActionProps } from './types';

// Complete on a draft working's row: a button opening the deduction preview in a dialog, and its
// Confirm. The Record a Working dialog draws the same panel in place instead
// (claude-docs/components/record-working.md).
export default function CompleteWorkingAction({
  label = 'Complete',
  ...completion
}: CompleteWorkingActionProps): ReactElement {
  return (
    <ModalButton label={label} className="btn" title="Complete a Working">
      {(close) => <WorkingCompletion {...completion} onBack={close} />}
    </ModalButton>
  );
}
