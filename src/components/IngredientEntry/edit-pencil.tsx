'use client';

import type { Route } from 'next';
import type { ReactElement } from 'react';
import { editHeading } from '../CompendiumList/heading';
import { EditLink } from '../IconTip';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import type { EditableEntry } from './types';

/**
 * Edit as the pencil, where it is the page head's one choice (a curator in no coven, M9.12):
 * the pencil the Edit menu is everywhere else, in the same placed container, but a link straight
 * into the edit dialog rather than a menu of one item. Named "Edit" and the entry's name, as the
 * menu's pencil is.
 */
export function EditPencil({
  href,
  entry,
  eyebrow = EDIT_ENTRY_EYEBROW,
}: {
  href: Route;
  entry: EditableEntry;
  eyebrow?: string;
}): ReactElement {
  return (
    <div className="ingredient-entry__cupboard ingredient-entry__cupboard--pencil">
      <EditLink href={href} name={entry.name} heading={editHeading(entry, eyebrow)} />
    </div>
  );
}
