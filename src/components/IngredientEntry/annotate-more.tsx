'use client';

import type { Route } from 'next';
import { type ReactElement, useRef, useState } from 'react';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import {
  CUPBOARD_MENU_LABEL,
  MakeItOursDialog,
  RemoveDialog,
  useCupboardWrites,
} from './cupboard-writes';
import type { AnnotateMoreProps } from './types';

// The Annotate dialog's Make It Ours and Remove (M8.17), set apart at the
// form's foot in Delete's place, each offered on the member's permission. With
// both, a More menu (the owner's call of 2026-10-19), drawn as every menu is,
// with Remove in its destructive item style, opening upward so it stays
// inside the dialog; with one, that one as a button of its own, Remove
// destructive, so a menu never holds a single choice. Either asks in the same
// confirmation dialog the entry page opens, here over this one. A write
// leaves the dialog with whatever it held unsaved: Remove deletes the
// annotations, and Make It Ours copies the saved ones, which its question
// says while the form holds changes.

interface AnnotateMoreBodyProps extends AnnotateMoreProps {
  workspaceId: string;
  ingredientId: string;
  /** The entry as the coven calls it, for the two questions. */
  name: string;
  /** Where the dialog closes to, and so where a remove leads without `removedHref`. */
  closeHref: Route;
  onRefused: (message: string) => void;
  /** The form holds unsaved changes. */
  dirty: boolean;
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
}: AnnotateMoreBodyProps): ReactElement | null {
  const [asking, setAsking] = useState<'remove' | 'own'>();
  // The menu's button or the single one, where the focus goes back to once a
  // question closes, since a menu item that opened it goes with the menu.
  const trigger = useRef<HTMLButtonElement>(null);
  const back = () => trigger.current;
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
    ...(canMakeOurs
      ? [{ key: 'own', label: 'Make It Ours', onSelect: () => setAsking('own') }]
      : []),
    ...(canRemove
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: () => setAsking('remove') }]
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
          items={items}
          opens="above"
        />
      ) : (
        <button
          ref={trigger}
          type="button"
          className={only.destructive ? 'btn btn--destructive' : 'btn btn--quiet'}
          onClick={() => setAsking(only.key === 'own' ? 'own' : 'remove')}
        >
          {only.label}
        </button>
      )}
      {asking === 'own' && (
        <MakeItOursDialog
          name={name}
          write={writes.makeOurs}
          unsaved={dirty}
          onClose={settle}
          returnTo={back}
        />
      )}
      {asking === 'remove' && (
        <RemoveDialog name={name} write={writes.remove} onClose={settle} returnTo={back} />
      )}
    </>
  );
}
