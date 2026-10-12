'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import Modal from './modal';
import type { RouteModalProps } from './types';

// A modal opened by its page's address (`?new`, `?edit=<slug>`), the shape
// every admin page's add and edit modal takes. Closing it is a navigation
// back to the page it opened over, replacing the modal's entry so Back does
// not open it again, and a refresh, so the list re-reads after a save or a
// delete. Its contents close it through `done`, the Modal's own close, so a
// save fades out as Close does (M5.5): eight hand-written wrappers each
// carried this, and the one that passed the navigation straight to its form
// skipped the fade (claude-docs/components/modal.md, "RouteModal").
export default function RouteModal({
  closeHref,
  size,
  children,
  ...heading
}: RouteModalProps): ReactElement {
  const router = useRouter();
  const close = () => {
    router.replace(closeHref);
    router.refresh();
  };
  return (
    <Modal {...heading} size={size} onClose={close}>
      {(done) => children(done)}
    </Modal>
  );
}
