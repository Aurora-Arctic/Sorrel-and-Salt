'use client';

import { createContext, type ReactElement, useContext } from 'react';
import { flushSync } from 'react-dom';
import { ConfirmQuestion } from '../Modal';
import type { RemoveQuestionProps } from './types';

// A variant's × and a reference row's × each ask before they remove, with the form's own question
// card: each takes more typing than a chip to put back (claude-docs/components/ingredient-form.md,
// "Removing a variant or a reference"). The chips of the other lists still go at once.

/**
 * Whether the form's unsaved-changes question is asking: a removal question
 * steps aside while it does, since both would be drawn in the one place, and
 * comes back if the answer is Keep Editing. False outside an ingredient form.
 */
export const DiscardAskingContext = createContext(false);

/**
 * Asks whether to remove a row, while `asked`. Remove runs `onRemove`, which removes the row and
 * stops asking, then `afterRemove` once the card has gone, so the focus goes where the list says:
 * the pressed × went with its row. Keep It leaves the row as it was, the focus back on its ×.
 */
export function RemoveQuestion({
  asked,
  question,
  onRemove,
  afterRemove,
  onKeep,
}: RemoveQuestionProps): ReactElement | null {
  const discardAsking = useContext(DiscardAskingContext);
  return (
    <ConfirmQuestion
      asked={asked && !discardAsking}
      question={question}
      confirmLabel="Remove"
      busyLabel="Removing"
      busy={false}
      onConfirm={async () => {
        // Committed at once, the card's cleanup with it, so the focus it
        // gives back is moved on after it rather than before.
        flushSync(onRemove);
        afterRemove();
      }}
      onKeep={onKeep}
    />
  );
}
