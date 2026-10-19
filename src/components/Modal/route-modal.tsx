'use client';

import type { ReactElement } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
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
/** A link in the page, outside any dialog, to exactly this address. */
function linkTo(href: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find(
    (a) => a.getAttribute('href') === href && !a.closest('dialog'),
  );
}

/** The page's heading, made focusable by script alone so Tab never stops on it. */
function pageHeading(): HTMLElement | null {
  const heading =
    document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('h1');
  if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  return heading;
}

export default function RouteModal({
  closeHref,
  size,
  content,
  returnTo,
}: RouteModalProps): ReactElement | null {
  const { navigate, refresh } = usePendingNavigation();
  const opener = useRouteModalOpener();
  const heading = content?.heading ?? opener?.loading;
  if (!heading) return null;
  const close = () => {
    // A close while it loads forgets the press; the navigation back
    // supersedes the one on its way, which Next then discards.
    opener?.cancel();
    navigate(closeHref, { replace: true });
    refresh();
  };
  // Modal gives the focus back to what opened it while that is in the page.
  // A link a close draws afresh, or a press that focused nothing, as a click
  // in WebKit does not, leaves the address it opened: a link to it takes the
  // focus. With none, as on a pasted address or a reload, the owner's place
  // or the page's heading does, rather than the focus being lost to the
  // page (claude-docs/components/modal.md, "Giving the focus back").
  const backTo = (gone: Element | null): HTMLElement | null | undefined => {
    const href = gone instanceof HTMLAnchorElement ? gone.getAttribute('href') : opener?.opened;
    return (href && linkTo(href)) || returnTo?.() || pageHeading();
  };
  return (
    <Modal {...heading} size={size} loading={!content} onClose={close} returnTo={backTo}>
      {(done) => (content ? content.body(done) : <ModalLoading />)}
    </Modal>
  );
}
