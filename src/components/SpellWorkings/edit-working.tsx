'use client';

import { type ReactElement, useRef, useState } from 'react';
import { EditButton } from '../IconTip';
import { RecordWorkingDialog } from '../RecordWorking';
import type { RecordWorkingDialogProps } from '../RecordWorking/types';

// Edit on a working's row: the pencil, and the Record a Working dialog opened on that working, with
// the focus back on the pencil when it closes.
export default function EditWorkingAction({
  name,
  plain = false,
  ...dialog
}: Omit<RecordWorkingDialogProps, 'onClose' | 'returnTo'> & {
  /** What the row is called to a reader: the day it was worked. */
  name: string;
  /** The pencil in the text ink, not the accent green. */
  plain?: boolean;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <EditButton
        ref={trigger}
        plain={plain}
        name={`Working ${name}`}
        onClick={() => setOpen(true)}
      />
      {open && (
        <RecordWorkingDialog
          {...dialog}
          onClose={() => setOpen(false)}
          returnTo={() => trigger.current}
        />
      )}
    </>
  );
}
