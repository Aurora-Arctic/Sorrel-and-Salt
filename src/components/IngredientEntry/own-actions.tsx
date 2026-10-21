'use client';

import { type ReactElement, useCallback, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import { BinButton, EditLink, MoreMenu } from '../IconTip';
import { choicesFor } from '../MenuButton/sections';
import type { MenuButtonItem } from '../MenuButton/types';
import { DeleteDialog, useDeleteEntry } from './delete-entry';
import { editEyebrow } from './edit-heading';
import EditStock from './edit-stock';
import type { OwnEntryActionsProps } from './types';

// A coven's own entry's actions beside its title (M8.17), drawn as a list card's foot draws
// them (the owner's call, 2026-10-20): the pencil, a link to the page's own `?edit`, which opens
// its dialog over it, and Delete Ingredient, which asks in a dialog in place, shared with the
// card's (`delete-entry.tsx`), since a confirmation has nothing to share as an address (option
// A, the owner's call, 2026-10-20). Delete alone is the bin, as the card has it: a lone choice is
// its own icon, and a menu holding it would cost two presses for one. Where the role may also
// update stock, Edit Stock joins it and the two become the three dots, Edit Stock first (the
// owner's call, 2026-10-21, as on a compendium entry's page): the dialog opens at once, for this
// coven, with no coven to choose. A refusal is the callout under the bin or the dots (M12.31's
// design F), which floats rather than taking the row's room.
// claude-docs/components/ingredient-entry.md.

export default function OwnEntryActions({ edit, entry }: OwnEntryActionsProps): ReactElement {
  const [asking, setAsking] = useState<'stock' | 'delete'>();
  // The bin or the dots, where the focus goes back to once a dialog closes; once the delete has
  // led away they are gone, and Modal gives the focus to the heading.
  const trigger = useRef<HTMLButtonElement | null>(null);
  const feedback = useClickFeedback({ name: `Delete Ingredient ${entry.name}` });
  const { anchorRef } = feedback;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const remove = useDeleteEntry({
    workspaceId: edit.coven?.workspaceId ?? '',
    id: entry.id,
    deletedHref: edit.deletedHref,
    onSettle: () => setAsking(undefined),
    onRefused: feedback.report,
  });

  const stock = edit.coven?.stock;
  const items: MenuButtonItem[] = [
    ...(stock
      ? [
          {
            key: 'stock',
            label: 'Edit Stock',
            onSelect: () => {
              feedback.report(undefined);
              setAsking('stock');
            },
          },
        ]
      : []),
    {
      key: 'delete',
      label: 'Delete Ingredient',
      destructive: true,
      onSelect: () => {
        feedback.report(undefined);
        setAsking('delete');
      },
    },
  ];

  return (
    <div className="ingredient-entry__cupboard ingredient-entry__cupboard--icons" data-icons={2}>
      <EditLink
        href={edit.href}
        name={entry.name}
        heading={editHeading(entry, editEyebrow(edit))}
      />
      {stock ? (
        <MoreMenu
          ref={triggerRef}
          name={entry.name}
          {...choicesFor({ compendium: [], coven: items }, 'coven')}
        />
      ) : (
        <BinButton
          ref={triggerRef}
          verb="Delete Ingredient"
          name={entry.name}
          onClick={() => {
            feedback.report(undefined);
            setAsking('delete');
          }}
        />
      )}
      {feedback.feedback}
      {asking === 'stock' && edit.coven && stock && (
        <EditStock
          places={[{ workspaceId: edit.coven.workspaceId, name: '', stock }]}
          ingredientId={entry.id}
          ingredientName={entry.name}
          defaultWorkspaceId={edit.coven.workspaceId}
          onClose={() => setAsking(undefined)}
          returnTo={back}
        />
      )}
      {asking === 'delete' && (
        <DeleteDialog
          name={entry.name}
          write={remove}
          onClose={() => setAsking(undefined)}
          returnTo={back}
        />
      )}
    </div>
  );
}
