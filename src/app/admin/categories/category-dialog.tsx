'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import GroupedValueForm from '../../../components/GroupedValueForm';
import Modal from '../../../components/Modal';
import type { CategoryDialogProps } from './types';

// The page's modal, opened by its address: closing it is a navigation back to
// the page it opened over, replacing the modal's entry so Back does not open
// it again. The refresh re-reads the list after a save or a delete.
export default function CategoryDialog({
  title,
  closeHref,
  category,
  groups,
}: CategoryDialogProps): ReactElement {
  const router = useRouter();
  const close = () => {
    router.replace(closeHref);
    router.refresh();
  };
  return (
    <Modal title={title} onClose={close}>
      {/* The modal's own close, so a save or a delete fades it out as Close does (M5.5). */}
      {(fadeOut) => (
        <GroupedValueForm kind="category" value={category} groups={groups} onDone={fadeOut} />
      )}
    </Modal>
  );
}
