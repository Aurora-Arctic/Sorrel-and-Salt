'use client';

import type { ReactElement } from 'react';
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
  return (
    <Modal
      title={rest.working ? 'Edit a Working' : 'Record a Working'}
      onClose={onClose}
      returnTo={returnTo}
    >
      {(close) => <RecordWorkingForm {...rest} close={close} />}
    </Modal>
  );
}
