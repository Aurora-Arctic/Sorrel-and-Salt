'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { editHeading } from '../CompendiumList/heading';
import { useOpenModalClick } from '../Modal';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import type { EditableEntry } from './types';

/**
 * The page header's Edit: a quiet medium link to the page's own address with
 * `?edit`, which opens the edit modal over the page. A plain press opens the
 * modal at once under its head, its form arriving with the navigation (M9.18);
 * a press with a modifier, or before the script has loaded, follows the link.
 * Named "Edit" and the entry's names in hidden text, as a list row's
 * `EditLink` is (M8.17). A client part for the click handler, which a server
 * page cannot pass down.
 */
export default function EditButton({
  href,
  entry,
  eyebrow = EDIT_ENTRY_EYEBROW,
}: {
  href: Route;
  entry: EditableEntry;
  /** The dialog head's eyebrow, which follows the tier (`editEyebrow`). */
  eyebrow?: string;
}): ReactElement {
  const onClick = useOpenModalClick(href, editHeading(entry, eyebrow));
  const formal = entry.canonicalName?.trim();
  return (
    <Link className="btn btn--quiet btn--medium" href={href} onClick={onClick}>
      Edit{' '}
      <span className="visually-hidden">{formal ? `${entry.name}, ${formal}` : entry.name}</span>
    </Link>
  );
}
