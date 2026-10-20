'use client';

import { type ReactElement, useRef, useState } from 'react';
import { editHeading } from '../CompendiumList/heading';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import { useOpenModalClick } from '../Modal';
import Notice from '../Notice';
import { DeleteDialog, useDeleteEntry } from './delete-entry';
import { editEyebrow } from './edit-heading';
import type { EditableEntry, IngredientEntryEdit } from './types';

// The Edit menu beside a coven's own entry's title (M8.17), the twin of a
// compendium entry's CupboardActions: Edit Ingredient and Delete Ingredient.
// Edit is a link to the page's own `?edit`, which opens its dialog over it;
// Delete asks in a dialog in place, shared with the list card's More
// (`delete-entry.tsx`), since a confirmation has nothing to share as an
// address (option A, the owner's call, 2026-10-20). claude-docs/components/ingredient-entry.md.

export default function OwnEntryActions({
  edit,
  entry,
}: {
  /** The page's Edit, which names the coven (`edit.coven`). */
  edit: IngredientEntryEdit;
  entry: EditableEntry;
}): ReactElement {
  const [asking, setAsking] = useState(false);
  const [alert, setAlert] = useState<string>();
  // The menu's button, where the focus goes back to once Delete's dialog
  // closes, the item that opened it being gone with the menu; once the delete
  // has led away, it is gone too, and Modal gives the focus to the heading.
  const trigger = useRef<HTMLButtonElement>(null);
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const openEdit = useOpenModalClick(edit.href, editHeading(entry, editEyebrow(edit)));
  const remove = useDeleteEntry({
    workspaceId: edit.coven?.workspaceId ?? '',
    id: entry.id,
    deletedHref: edit.deletedHref,
    onSettle: () => setAsking(false),
    onRefused: setAlert,
  });

  const items: MenuButtonItem[] = [
    { key: 'edit', label: 'Edit Ingredient', primary: true, href: edit.href, onClick: openEdit },
    {
      key: 'delete',
      label: 'Delete Ingredient',
      destructive: true,
      onSelect: () => {
        setAlert(undefined);
        setAsking(true);
      },
    },
  ];

  return (
    <div className="ingredient-entry__cupboard">
      <MenuButton
        ref={trigger}
        label="Edit"
        placement="auto"
        className="btn btn--quiet btn--medium"
        items={items}
      />
      {asking && (
        <DeleteDialog
          name={entry.name}
          write={remove}
          onClose={() => setAsking(false)}
          returnTo={back}
        />
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
    </div>
  );
}
