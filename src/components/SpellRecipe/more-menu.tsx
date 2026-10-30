'use client';

import { type ReactElement, useCallback, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { MoreMenu } from '../IconTip';
import type { MenuButtonItem } from '../MenuButton/types';
import { copiedHrefOf } from './copied-href';
import { DeleteSpellDialog, useDeleteSpell } from './delete-spell';
import { useDuplicateSpell } from './duplicate-spell';
import PrintButton from './print-button';
import type { SpellMoreMenuProps } from './types';

// The three dots on the recipe page and a spell's card: Duplicate, Print (the page's alone) and Delete, bare
// verbs whose dialog names the noun. Print alone is its own button, not a menu of one, and an empty menu is not
// drawn (claude-docs/components/spell-recipe.md, "Duplicate", "Print" and "Delete Spell").

export default function SpellMoreMenu({
  workspaceId,
  covenSlug,
  spellId,
  name,
  deletedHref,
  canDuplicate,
  canDelete,
  canPrint,
  visibility,
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
  const { duplicate, duplicating } = useDuplicateSpell(
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
    ...(canPrint ? [{ key: 'print', label: 'Print', onSelect: () => window.print() }] : []),
    ...(canDelete
      ? [
          {
            key: 'delete',
            label: 'Delete',
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
  if (items.length === 1 && items[0]!.key === 'print') return <PrintButton name={name} />;
  return (
    <>
      <MoreMenu
        ref={triggerRef}
        name={name}
        items={items}
        busy={duplicating}
        busyLabel="Duplicating"
      />
      {feedback.feedback}
      {asking && (
        <DeleteSpellDialog
          name={name}
          visibility={visibility}
          pending={pending}
          onConfirm={() => remove()}
          onClose={() => setAsking(false)}
          returnTo={() => (trigger.current?.isConnected ? trigger.current : null)}
        />
      )}
    </>
  );
}
