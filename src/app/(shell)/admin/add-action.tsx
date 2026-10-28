'use client';

import Link from 'next/link';
import type { MouseEvent, ReactElement } from 'react';
import IconTip, { PlusIcon } from '../../../components/IconTip';
import { useOpenModalClick } from '../../../components/Modal';
import type { AddActionProps } from './types';

/**
 * A list page's Add, the open tab's action beside the page's heading, at
 * `href` so it keeps the list's place. A press opens its modal at once under
 * `heading`, the form arriving with the navigation (M9.18); a link still, so
 * a new tab, or a press before the script loads, opens the address. A client
 * part of its own, out of the server-only `list-page.tsx`, for the press.
 * The label is always in the page, so the link's name never changes: wider
 * than the header's narrow width it shows, the labelled solid button, and at
 * the narrow width it is hidden and the plus shows instead, with the label as
 * its tip (`_primitives.scss`, `.add-action`; claude-docs/components/page-header.md).
 *
 * With `drawnHere`, for a dialog that reads the address in the browser and draws its form
 * there (New Spell, M10.12), a plain press writes the address with the browser's `pushState`,
 * which Next's router follows with no server request, as the shell's Add Ingredient does.
 * The dialog then opens at its full size at once, rather than as the heading's skeleton that
 * the server's form replaces, a change of size that moved the dialog under the pointer.
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
