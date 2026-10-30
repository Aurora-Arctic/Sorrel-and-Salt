'use client';

import { type ReactElement, useCallback, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import { EditLink, MoreMenu } from '../IconTip';
import { choicesFor } from '../MenuButton/sections';
import type { MenuButtonItem } from '../MenuButton/types';
import { DeleteDialog, useDeleteEntry } from './delete-entry';
import { editEyebrow } from './edit-heading';
import EditStock from './edit-stock';
import type { OwnEntryActionsProps } from './types';

// A coven's own entry's actions beside its title: the pencil, then the three dots holding Edit
// Stock, where the role may update stock, and Delete Ingredient. Every role that may delete may
// update stock, so the dots never hold Delete alone (claude-docs/components/ingredient-entry.md).

export default function OwnEntryActions({ edit, entry }: OwnEntryActionsProps): ReactElement {
  const [asking, setAsking] = useState<'stock' | 'delete'>();
  // The dots, where the focus goes back to once a dialog closes; once the delete has
  // led away they are gone, and Modal gives the focus to the heading.
  const trigger = useRef<HTMLButtonElement | null>(null);
  const feedback = useClickFeedback({ name: `More for ${entry.name}` });
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
      <MoreMenu
        ref={triggerRef}
        name={entry.name}
        {...choicesFor({ compendium: [], coven: items }, 'coven')}
      />
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
