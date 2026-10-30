'use client';

import { type ReactElement, useRef, useState } from 'react';
import { RecordButton } from '../IconTip';
import RecordWorkingDialog from './dialog';
import type { RecordWorkingButtonProps } from './types';

// Record a Working on a complete spell's recipe page: the button, and the dialog it opens with the
// focus back on the button when it closes (claude-docs/components/record-working.md).
export default function RecordWorkingButton(props: RecordWorkingButtonProps): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <RecordButton ref={trigger} onClick={() => setOpen(true)} />
      {open && (
        <RecordWorkingDialog
          {...props}
          onClose={() => setOpen(false)}
          returnTo={() => trigger.current}
        />
      )}
    </>
  );
}

export { default as RecordWorkingDialog } from './dialog';
export { default as CompleteWorkingAction } from './complete-action';
export type * from './types';
