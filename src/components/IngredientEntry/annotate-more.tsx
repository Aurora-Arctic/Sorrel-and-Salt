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
  RemoveQuestion,
  useCupboardWrites,
} from './cupboard-writes';
import type { AnnotateMoreProps } from './types';

// The Annotate dialog's Make It Ours and Remove (M8.17), set apart at the
// form's foot in Delete's place, each offered on the member's permission. With
// both, a More menu (the owner's call of 2026-10-19), drawn as every menu is,
// with Remove in its destructive item style, both in the one Coven section every More draws
// (the owner's call, 2026-10-20), and both items in the button's
// own type (the owner's call of 2026-10-20), opening above the button at the
// dialog's foot, where the room is (MenuButton); with one, that one as a
// button of its own, Remove destructive, so a menu never holds a single choice. Either asks in the
// form's own confirmation card, the card, scrim and focus handling of Delete
// and of "You have unsaved changes", not in a second dialog over this one
// (the owner's call, 2026-10-20). A write leaves the dialog with whatever it
// held unsaved: Remove deletes the annotations, and Make It Ours copies the
// saved ones, which its confirmation says while the form holds changes.

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
  /**
   * The form's unsaved-changes confirmation is asking: the confirmation here steps
   * aside, both being drawn in the one place, and comes back on Keep Editing.
   */
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
  // The menu's button or the single one. The card hands the focus back to
  // whatever held it as it opened, and a menu item that chose goes with its
  // menu, so the focus is put on this first.
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
  const only = items.length === 1 ? items[0] : undefined;
  if (items.length === 0) return null;
  return (
    <>
      {only === undefined ? (
        <MenuButton
          ref={trigger}
          label={CUPBOARD_MENU_LABEL}
          className="btn btn--quiet"
          {...choicesFor({ compendium: [], coven: items }, 'coven')}
          buttonType
        />
      ) : (
        <button
          ref={trigger}
          type="button"
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
        keepLabel="Cancel"
        busy={writes.makeOurs.pending}
        onConfirm={async () => writes.makeOurs.run()}
        onKeep={settle}
      />
      <ConfirmQuestion
        key="remove"
        asked={asking === 'remove' && !discardAsking}
        question={<RemoveQuestion name={name} />}
        confirmLabel="Remove"
        busyLabel="Removing"
        keepLabel="Cancel"
        busy={writes.remove.pending}
        onConfirm={async () => writes.remove.run()}
        onKeep={settle}
      />
    </>
  );
}
