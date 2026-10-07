'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import GroupForm from '../../../components/GroupForm';
import Modal from '../../../components/Modal';
import type { FormGroupDialogProps } from './types';

// The page's modal, opened by its address, as the categories page's is:
// closing it is a navigation back to the page it opened over, replacing the
// modal's entry so Back does not open it again. The refresh re-reads the list
// after a save or a delete. A save closes it whatever it changed, since a
// rename moves the address of the group and of every form under it.
export default function FormGroupDialog({
  title,
  closeHref,
  group,
  groups,
  memberCount,
}: FormGroupDialogProps): ReactElement {
  const router = useRouter();
  const close = () => {
    router.replace(closeHref);
    router.refresh();
  };
  return (
    <Modal title={title} onClose={close}>
      {/* The modal's own close, so a save or a delete fades it out as Close does (M5.5). */}
      {(fadeOut) => (
        <GroupForm
          kind="form"
          group={group}
          groups={groups}
          memberCount={memberCount}
          onDone={fadeOut}
        />
      )}
    </Modal>
  );
}
