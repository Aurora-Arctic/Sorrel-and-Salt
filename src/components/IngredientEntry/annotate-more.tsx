'use client';

import type { Route } from 'next';
import { type ReactElement, useRef, useState } from 'react';
import MenuButton from '../MenuButton';
import { choicesFor } from '../MenuButton/sections';
import type { MenuButtonItem } from '../MenuButton/types';
import { ConfirmQuestion, UNSAVED_CHANGES_LOST } from '../Modal';
import Notice from '../Notice';
import {
  CUPBOARD_MENU_LABEL,
  MAKE_IT_OURS_DETAILS,
  MakeItOursQuestion,
  RemoveFromCupboardQuestion,
  useCupboardWrites,
} from './cupboard-writes';
import type { AnnotateMoreProps } from './types';

// The Annotate dialog's Make It Ours and Remove at the form's foot: a More menu with both, a button
// with one, each asking in the form's own confirmation card
// (claude-docs/components/ingredient-entry.md, "Discarding while annotating").

interface AnnotateMoreBodyProps extends AnnotateMoreProps {
  workspaceId: string;
  ingredientId: string;
  /** The entry as the coven calls it, for the two confirmations. */
  name: string;
  /** Where the dialog closes to, and so where a remove leads without `removedHref`. */
  closeHref: Route;
  onRefused: (message: string) => void;
  /** The form holds unsaved changes. */
  dirty: boolean;
  /** The form's unsaved-changes confirmation is asking, so this one steps aside until Keep Editing. */
  discardAsking: boolean;
}

export default function AnnotateMore({
  workspaceId,
  ingredientId,
  name,
  covenSlug,
  canMakeOurs,
  canRemove,
  removedHref,
  closeHref,
  onRefused,
  dirty,
  discardAsking,
}: AnnotateMoreBodyProps): ReactElement | null {
  const [asking, setAsking] = useState<'remove' | 'own'>();
  // The menu's button or the single one takes the focus first: the card hands it back to whatever
  // held it, and a chosen item goes with its menu.
  const trigger = useRef<HTMLButtonElement>(null);
  const ask = (what: 'remove' | 'own') => {
    trigger.current?.focus();
    setAsking(what);
  };
  const settle = () => setAsking(undefined);
  const writes = useCupboardWrites({
    workspaceId,
    covenSlug,
    ingredientId,
    // On the list, where the dialog closes to: the list as it was, read again.
    removedHref: removedHref ?? closeHref,
    onSettle: settle,
    onRefused,
  });
  const items: MenuButtonItem[] = [
    ...(canMakeOurs ? [{ key: 'own', label: 'Make It Ours', onSelect: () => ask('own') }] : []),
    ...(canRemove
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: () => ask('remove') }]
      : []),
  ];
  // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
  const only = items.length === 1 ? items[0] : undefined;
  // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
  if (items.length === 0) return null;
  return (
    <>
      {/* oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering */}
      {only === undefined ? (
        <MenuButton
          ref={trigger}
          label={CUPBOARD_MENU_LABEL}
          className="btn btn--quiet"
          // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
          {...choicesFor({ compendium: [], coven: items }, 'coven')}
          buttonType
        />
      ) : (
        <button
          ref={trigger}
          type="button"
          // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
          className={only.destructive ? 'btn btn--destructive' : 'btn btn--quiet'}
          onClick={() => ask(only.key === 'own' ? 'own' : 'remove')}
        >
          {only.label}
        </button>
      )}
      <ConfirmQuestion
        key="own"
        asked={asking === 'own' && !discardAsking}
        question={<MakeItOursQuestion name={name} />}
        details={
          <>
            <p>{MAKE_IT_OURS_DETAILS}</p>
            {dirty && (
              <Notice kind="warn" className="confirm-overlay__warning">
                {UNSAVED_CHANGES_LOST}
              </Notice>
            )}
          </>
        }
        tone="solid"
        confirmLabel="Make It Ours"
        busyLabel="Making It Ours"
        busy={writes.makeOurs.pending}
        onConfirm={async () => writes.makeOurs.run()}
        onKeep={settle}
      />
      <ConfirmQuestion
        key="remove"
        asked={asking === 'remove' && !discardAsking}
        question={<RemoveFromCupboardQuestion name={name} />}
        confirmLabel="Remove"
        busyLabel="Removing"
        busy={writes.remove.pending}
        onConfirm={async () => writes.remove.run()}
        onKeep={settle}
      />
    </>
  );
}
