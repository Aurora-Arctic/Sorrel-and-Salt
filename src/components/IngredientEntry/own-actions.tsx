'use client';

import { type ReactElement, useCallback, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import { BinButton, EditLink } from '../IconTip';
import { DeleteDialog, useDeleteEntry } from './delete-entry';
import { editEyebrow } from './edit-heading';
import type { OwnEntryActionsProps } from './types';

// A coven's own entry's actions beside its title (M8.17), drawn as a list card's foot draws
// them (the owner's call, 2026-10-20): the pencil, a link to the page's own `?edit`, which opens
// its dialog over it, and the bin, a Delete Ingredient that asks in a dialog in place, shared
// with the card's (`delete-entry.tsx`), since a confirmation has nothing to share as an address
// (option A, the owner's call, 2026-10-20). Two icons and no More: a lone Delete is the bin, as
// the card has it, and a menu holding it would cost two presses for one. A refusal is the
// callout under the bin (M12.31's design F), which floats rather than taking the row's room.
// claude-docs/components/ingredient-entry.md.

export default function OwnEntryActions({ edit, entry }: OwnEntryActionsProps): ReactElement {
  const [asking, setAsking] = useState(false);
  // The bin, where the focus goes back to once Delete's dialog closes; once the delete has led
  // away it is gone, and Modal gives the focus to the heading.
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
    onSettle: () => setAsking(false),
    onRefused: feedback.report,
  });

  return (
    <div className="ingredient-entry__cupboard ingredient-entry__cupboard--icons" data-icons={2}>
      <EditLink
        href={edit.href}
        name={entry.name}
        heading={editHeading(entry, editEyebrow(edit))}
      />
      <BinButton
        ref={triggerRef}
        verb="Delete Ingredient"
        name={entry.name}
        onClick={() => {
          feedback.report(undefined);
          setAsking(true);
        }}
      />
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
