'use client';

import { type ReactElement, useState } from 'react';
import Modal from '../Modal';
import RecordWorkingForm from './form';
import type { RecordWorkingDialogProps } from './types';

// The dialog on its own, apart from its button, so a working's row can open it on that working
// (`working`) from its own pencil (claude-docs/components/record-working.md).
export default function RecordWorkingDialog({
  onClose,
  returnTo,
  ...rest
}: RecordWorkingDialogProps): ReactElement {
  // The form tells the dialog which step it is on, so the confirm step is titled for the action it confirms.
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal
      title={confirming ? 'Complete Working' : rest.working ? 'Edit Working' : 'Record a Working'}
      onClose={onClose}
      returnTo={returnTo}
    >
      {(close) => <RecordWorkingForm {...rest} close={close} onConfirming={setConfirming} />}
    </Modal>
  );
}
