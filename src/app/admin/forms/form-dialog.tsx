'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import IngredientFormValueForm from '../../../components/IngredientFormValueForm';
import Modal from '../../../components/Modal';
import type { FormDialogProps } from './types';

// The page's modal, opened by its address, as the categories page's is:
// closing it is a navigation back to the page it opened over, replacing the
// modal's entry so Back does not open it again. The refresh re-reads the list
// after a save or a delete. A save closes it whatever it changed, since a
// form's slug is its name and its group, and either can move the address.
export default function FormDialog({
  title,
  closeHref,
  formValue,
  groups,
}: FormDialogProps): ReactElement {
  const router = useRouter();
  const close = () => {
    router.replace(closeHref);
    router.refresh();
  };
  return (
    <Modal title={title} onClose={close}>
      <IngredientFormValueForm formValue={formValue} groups={groups} onDone={close} />
    </Modal>
  );
}
