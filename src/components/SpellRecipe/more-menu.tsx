'use client';

import { type ReactElement, useCallback, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { MoreMenu } from '../IconTip';
import type { MenuButtonItem } from '../MenuButton/types';
import { copiedHrefOf } from './copied-href';
import { DeleteSpellDialog, useDeleteSpell } from './delete-spell';
import { useDuplicateSpell } from './duplicate-spell';
import type { SpellMoreMenuProps } from './types';

// The recipe page's three dots, after the pencil as the ingredient entry's own-actions are laid out:
// Duplicate, which makes a private draft copy and leaves for it, and Delete Spell, which asks in a
// dialog first. A role that may do neither has no menu
// (claude-docs/components/spell-recipe.md, "Duplicate" and "Delete Spell").

export default function SpellMoreMenu({
  workspaceId,
  covenSlug,
  spellId,
  name,
  deletedHref,
  canDuplicate,
  canDelete,
}: SpellMoreMenuProps): ReactElement | null {
  const [asking, setAsking] = useState(false);
  // The dots, where the focus goes back to once the dialog closes; once the delete has led away
  // they are gone, and Modal gives the focus to the heading.
  const trigger = useRef<HTMLButtonElement | null>(null);
  const feedback = useClickFeedback({ name: `More for ${name}` });
  const { anchorRef } = feedback;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const { duplicate } = useDuplicateSpell(
    workspaceId,
    (id) => copiedHrefOf(covenSlug, id),
    feedback.report,
  );
  const { remove, pending } = useDeleteSpell({
    workspaceId,
    spellId,
    deletedHref,
    onRefused: feedback.report,
    onClosed: () => setAsking(false),
  });

  const items: MenuButtonItem[] = [
    ...(canDuplicate
      ? [
          {
            key: 'duplicate',
            label: 'Duplicate',
            onSelect: () => {
              feedback.report(undefined);
              duplicate(spellId);
            },
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: 'delete',
            label: 'Delete Spell',
            destructive: true,
            onSelect: () => {
              feedback.report(undefined);
              setAsking(true);
            },
          },
        ]
      : []),
  ];
  if (items.length === 0) return null;

  return (
    <>
      <MoreMenu ref={triggerRef} name={name} items={items} />
      {feedback.feedback}
      {asking && (
        <DeleteSpellDialog
          name={name}
          pending={pending}
          onConfirm={() => remove()}
          onClose={() => setAsking(false)}
          returnTo={() => (trigger.current?.isConnected ? trigger.current : null)}
        />
      )}
    </>
  );
}
