'use client';

import type { ReactElement } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import ModalLoading from './loading';
import Modal from './modal';
import { useRouteModalOpener } from './route-modal-provider';
import type { RouteModalProps } from './types';

// A page's one modal place, opened by its address (`?new`, `?edit=<slug>`). Closing it navigates back
// to the page and refreshes the list; contents close it through `done`, so a save fades out as Close
// does (claude-docs/components/modal.md, "RouteModal").

// A page renders it whether or not its address opens a modal, so a modal pressed open shows here at
// once over a skeleton and its contents arrive in the same dialog ("Opening at once").

/**
 * Where the focus goes for a link in the page to exactly this address: the link itself, or for an
 * item of a closed menu (kept hidden in the page) the button that opens that menu.
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
  loadingBody,
}: RouteModalProps): ReactElement | null {
  const { navigate, refresh } = usePendingNavigation();
  const opener = useRouteModalOpener();
  // A press shows in the place it names alone.
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
  // Modal gives the focus back to what opened it while that is in the page; otherwise a link to the
  // address it opened takes it, else the page's heading (claude-docs/components/modal.md, "Giving
  // the focus back").
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
      foot={content?.foot}
      onClose={close}
      returnTo={backTo}
    >
      {(done) => (content ? content.body(done) : (loadingBody ?? <ModalLoading />))}
    </Modal>
  );
}
