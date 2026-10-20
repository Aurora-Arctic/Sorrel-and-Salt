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
/**
 * Where the focus goes for a link in the page to exactly this address: the
 * link itself, or, for an item of a closed menu (a MenuButton's, which keeps
 * its items in the page hidden), the button that opens that menu, where the
 * press began (M8.17).
 */
function focusFor(a: HTMLAnchorElement): HTMLElement | null {
  const menu = a.closest<HTMLElement>('[role="menu"]');
  if (!menu || !(menu.hidden || menu.inert)) return a;
  const trigger = menu.previousElementSibling;
  return trigger instanceof HTMLElement && trigger.getAttribute('aria-haspopup') === 'menu'
    ? trigger
    : null;
}

/** A link in the page, outside any dialog, to exactly this address, or the menu button holding it. */
function linkTo(href: string): HTMLElement | undefined {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (a.getAttribute('href') !== href || a.closest('dialog')) continue;
    const target = focusFor(a);
    if (target) return target;
  }
  return undefined;
}

export default function RouteModal({
  closeHref,
  size,
  readingBody,
  content,
  place,
  returnTo,
}: RouteModalProps): ReactElement | null {
  const { navigate, refresh } = usePendingNavigation();
  const opener = useRouteModalOpener();
  // A press shows in the place it names alone (M12.5).
  const pressed = opener?.loadingPlace === place ? opener?.loading : undefined;
  const heading = content?.heading ?? pressed;
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
  // does, and failing that Modal gives it to the page's heading rather than
  // lose it to the page (claude-docs/components/modal.md, "Giving the focus back").
  const backTo = (gone: Element | null): HTMLElement | null | undefined => {
    const href = gone instanceof HTMLAnchorElement ? gone.getAttribute('href') : opener?.opened;
    return (href && linkTo(href)) || returnTo?.() || null;
  };
  return (
    <Modal
      {...heading}
      size={size}
      readingBody={readingBody}
      loading={!content}
      onClose={close}
      returnTo={backTo}
    >
      {(done) => (content ? content.body(done) : <ModalLoading />)}
    </Modal>
  );
}
