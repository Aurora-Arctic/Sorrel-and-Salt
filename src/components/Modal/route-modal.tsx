'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import ModalLoading from './loading';
import Modal from './modal';
import { useRouteModalOpener } from './route-modal-provider';
import type { RouteModalProps } from './types';

// A page's one modal place, opened by its address (`?new`, `?edit=<slug>`),
// the shape every admin page's add and edit modal takes. Closing it is a
// navigation back to the page it opened over, replacing the modal's entry so
// Back does not open it again, and a refresh, so the list re-reads after a
// save or a delete. Its contents close it through `done`, the Modal's own
// close, so a save fades out as Close does (M5.5): eight hand-written
// wrappers each carried this, and the one that passed the navigation straight
// to its form skipped the fade (claude-docs/components/modal.md, "RouteModal").
//
// A page renders it whether or not its address opens a modal (M9.18), so a
// modal pressed open (`RouteModalProvider`) shows here at once over a
// skeleton, and its contents arrive in the same dialog: one element from the
// press to the form, which fades in once rather than twice.
export default function RouteModal({
  closeHref,
  size,
  content,
}: RouteModalProps): ReactElement | null {
  const router = useRouter();
  const opener = useRouteModalOpener();
  const heading = content?.heading ?? opener?.loading;
  if (!heading) return null;
  const close = () => {
    // A close while it loads forgets the press; the navigation back
    // supersedes the one on its way, which Next then discards.
    opener?.cancel();
    router.replace(closeHref);
    router.refresh();
  };
  return (
    <Modal {...heading} size={size} loading={!content} onClose={close}>
      {(done) => (content ? content.body(done) : <ModalLoading />)}
    </Modal>
  );
}
