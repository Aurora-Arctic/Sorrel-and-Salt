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

// A coven's own entry's actions beside its title, drawn as a list card's foot draws them: the
// pencil, Delete Ingredient (the bin when alone) and, where the role may update stock, Edit Stock
// in the three dots (claude-docs/components/ingredient-entry.md, "Structure").

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
