'use client';

import Link from 'next/link';
import type { MouseEvent, ReactElement } from 'react';
import IconTip, { PlusIcon } from '../../../components/IconTip';
import { useOpenModalClick } from '../../../components/Modal';
import type { AddActionProps } from './types';

/**
 * A list page's Add, the open tab's action beside the page's heading, at `href` so it keeps the
 * list's place. A press opens its modal at once under `heading`; a link still, so a new tab, or a
 * press before the script loads, opens the address. The label is always in the page; at the narrow
 * header width the plus shows instead, with the label as its tip (`_primitives.scss`,
 * `.add-action`; claude-docs/components/page-header.md).
 *
 * With `drawnHere`, for a dialog that reads the address in the browser and draws its form there
 * (New Spell), a press writes the address with `pushState`, which Next's router follows with no
 * server request. The dialog opens at full size at once, not as a skeleton that grows under the
 * pointer.
 */
export default function AddAction({
  href,
  heading,
  drawnHere = false,
  children,
}: AddActionProps): ReactElement {
  const navigated = useOpenModalClick(href, heading);
  const pushed = (event: MouseEvent<HTMLAnchorElement>) => {
    // A press with a modifier, or another button, is the browser's: a new tab or window.
    const plain =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!plain || event.defaultPrevented) return;
    event.preventDefault();
    window.history.pushState(null, '', href);
  };
  return (
    <IconTip tip={children}>
      <Link
        className="btn btn--solid add-action"
        href={href}
        onClick={drawnHere ? pushed : navigated}
      >
        <span className="add-action__label">{children}</span>
        <span className="add-action__plus" aria-hidden="true">
          <PlusIcon />
        </span>
      </Link>
    </IconTip>
  );
}
