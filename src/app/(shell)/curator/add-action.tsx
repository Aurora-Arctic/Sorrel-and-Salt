'use client';

import type { MouseEvent, ReactElement } from 'react';
import IconTip, { PlusIcon } from '../../../components/IconTip';
import { ModalLink, useOpenModalClick } from '../../../components/Modal';
import type { AddActionProps } from './types';

/**
 * A list page's Add, the open tab's action, at `href` to keep the list's place. A press opens its
 * modal at once; as a link it opens the address. With `drawnHere` the dialog draws its form from
 * the address in the browser, so a press writes it with `pushState` (claude-docs/components/page-header.md).
 */
export default function AddAction({
  href,
  heading,
  drawnHere = false,
  children,
}: AddActionProps): ReactElement {
  const navigated = useOpenModalClick(href, heading);
  const pushed = (event: MouseEvent<HTMLAnchorElement>) => {
    const plain =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!plain || event.defaultPrevented) return;
    event.preventDefault();
    window.history.pushState(null, '', href);
  };
  return (
    <IconTip tip={children}>
      <ModalLink
        className="btn btn--solid add-action"
        href={href}
        onClick={drawnHere ? pushed : navigated}
      >
        <span className="add-action__label">{children}</span>
        <span className="add-action__plus" aria-hidden="true">
          <PlusIcon />
        </span>
      </ModalLink>
    </IconTip>
  );
}
