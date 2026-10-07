'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import Modal from '../../components/Modal';
import VocabularyValueForm from '../../components/VocabularyValueForm';
import type { VocabularyDialogProps } from './types';

// A flat vocabulary page's modal, opened by its address, as the forms page's
// is: closing it is a navigation back to the page it opened over, replacing
// the modal's entry so Back does not open it again. The refresh re-reads the
// list after a save or a delete.
export default function VocabularyDialog({
  vocabulary,
  title,
  closeHref,
  value,
}: VocabularyDialogProps): ReactElement {
  const router = useRouter();
  const close = () => {
    router.replace(closeHref);
    router.refresh();
  };
  return (
    <Modal title={title} onClose={close}>
      <VocabularyValueForm vocabulary={vocabulary} value={value} onDone={close} />
    </Modal>
  );
}
