'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useOpenModalClick } from '../../components/Modal';
import type { AddActionProps } from './types';

/**
 * A list page's Add, the open tab's action beside the page's heading, at
 * `href` so it keeps the list's place. A press opens its modal at once under
 * `heading`, the form arriving with the navigation (M9.18); a link still, so
 * a new tab, or a press before the script loads, opens the address. A client
 * part of its own, out of the server-only `list-page.tsx`, for the press.
 */
export default function AddAction({ href, heading, children }: AddActionProps): ReactElement {
  const onClick = useOpenModalClick(href, heading);
  return (
    <Link className="btn btn--solid" href={href} onClick={onClick}>
      {children}
    </Link>
  );
}
