'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
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
 */
export default function AddAction({ href, heading, children }: AddActionProps): ReactElement {
  const onClick = useOpenModalClick(href, heading);
  return (
    <IconTip tip={children}>
      <Link className="btn btn--solid add-action" href={href} onClick={onClick}>
        <span className="add-action__label">{children}</span>
        <span className="add-action__plus" aria-hidden="true">
          <PlusIcon />
        </span>
      </Link>
    </IconTip>
  );
}
