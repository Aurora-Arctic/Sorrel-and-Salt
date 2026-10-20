'use client';

import { type ReactElement, useCallback, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import IconTip, { PencilIcon } from '../IconTip';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import { useOpenModalClick } from '../Modal';
import { DeleteDialog, useDeleteEntry } from './delete-entry';
import { editEyebrow } from './edit-heading';
import type { EditableEntry, IngredientEntryEdit } from './types';

// The Edit menu beside a coven's own entry's title (M8.17), the twin of a
// compendium entry's CupboardActions: Edit Ingredient and Delete Ingredient.
// Edit is a link to the page's own `?edit`, which opens its dialog over it;
// Delete asks in a dialog in place, shared with the list card's More
// (`delete-entry.tsx`), since a confirmation has nothing to share as an
// address (option A, the owner's call, 2026-10-20). The menu's button is the
// pencil at the end of the name's row, named for the entry as the details
// modal's pencil is (the owner's call, 2026-10-20), and a refusal is the callout
// under it (M12.31's design F), which floats rather than taking the row's room.
// claude-docs/components/ingredient-entry.md.

export default function OwnEntryActions({
  edit,
  entry,
}: {
  /** The page's Edit, which names the coven (`edit.coven`). */
  edit: IngredientEntryEdit;
  entry: EditableEntry;
}): ReactElement {
  const [asking, setAsking] = useState(false);
  // The menu's button, where the focus goes back to once Delete's dialog
  // closes, the item that opened it being gone with the menu; once the delete
  // has led away, it is gone too, and Modal gives the focus to the heading.
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = `Edit ${entry.name}`;
  const feedback = useClickFeedback({ name: label });
  const { anchorRef } = feedback;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const openEdit = useOpenModalClick(edit.href, editHeading(entry, editEyebrow(edit)));
  const remove = useDeleteEntry({
    workspaceId: edit.coven?.workspaceId ?? '',
    id: entry.id,
    deletedHref: edit.deletedHref,
    onSettle: () => setAsking(false),
    onRefused: feedback.report,
  });

  const items: MenuButtonItem[] = [
    { key: 'edit', label: 'Edit Ingredient', primary: true, href: edit.href, onClick: openEdit },
    {
      key: 'delete',
      label: 'Delete Ingredient',
      destructive: true,
      onSelect: () => {
        feedback.report(undefined);
        setAsking(true);
      },
    },
  ];

  return (
    <div className="ingredient-entry__cupboard ingredient-entry__cupboard--pencil">
      <IconTip tip="Edit">
        <MenuButton
          ref={triggerRef}
          label={label}
          className="icon-tip__edit"
          icon={<PencilIcon />}
          items={items}
        />
      </IconTip>
      {feedback.feedback}
      {asking && (
        <DeleteDialog
          name={entry.name}
          write={remove}
          onClose={() => setAsking(false)}
          returnTo={back}
        />
      )}
    </div>
  );
}
