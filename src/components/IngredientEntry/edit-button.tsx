'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { editHeading } from '../CompendiumList/heading';
import { useOpenModalClick } from '../Modal';
import type { EditableEntry } from './types';

/**
 * The page header's Edit: a quiet medium link to the page's own address with
 * `?edit`, which opens the edit modal over the page. A plain press opens the
 * modal at once under its head, its form arriving with the navigation (M9.18);
 * a press with a modifier, or before the script has loaded, follows the link.
 * A client part for the click handler, which a server page cannot pass down.
 */
export default function EditButton({
  href,
  entry,
}: {
  href: Route;
  entry: EditableEntry;
}): ReactElement {
  const onClick = useOpenModalClick(href, editHeading(entry));
  return (
    <Link className="btn btn--quiet btn--medium" href={href} onClick={onClick}>
      Edit
    </Link>
  );
}
