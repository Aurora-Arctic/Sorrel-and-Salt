'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import GroupedValueForm from '../../../components/GroupedValueForm';
import Modal from '../../../components/Modal';
import type { DeityDialogProps } from './types';

// The page's modal, opened by its address, as the forms page's is: closing it
// is a navigation back to the page it opened over, replacing the modal's
// entry so Back does not open it again. The refresh re-reads the list after a
// save or a delete. A save closes it whatever it changed, since a deity's
// slug is its name and its tradition, and either can move the address.
export default function DeityDialog({
  title,
  closeHref,
  deity,
  traditions,
}: DeityDialogProps): ReactElement {
  const router = useRouter();
  const close = () => {
    router.replace(closeHref);
    router.refresh();
  };
  return (
    <Modal title={title} onClose={close}>
      {/* The modal's own close, so a save or a delete fades it out as Close does (M5.5). */}
      {(fadeOut) => (
        <GroupedValueForm kind="deity" value={deity} groups={traditions} onDone={fadeOut} />
      )}
    </Modal>
  );
}
