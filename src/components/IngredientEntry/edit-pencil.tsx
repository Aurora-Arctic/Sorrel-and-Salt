'use client';

import type { Route } from 'next';
import type { ReactElement } from 'react';
import { editHeading } from '../CompendiumList/heading';
import { CompendiumEditLink } from '../IconTip';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import type { EditableEntry } from './types';

/** Edit in Compendium as the one icon where it is the page head's only action (a curator in no coven): the cards' pencil, named for the compendium, linking into the edit dialog. */
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
    <div className="ingredient-entry__cupboard ingredient-entry__cupboard--icons" data-icons={1}>
      <CompendiumEditLink href={href} name={entry.name} heading={editHeading(entry, eyebrow)} />
    </div>
  );
}
