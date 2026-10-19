'use client';

import type { Route } from 'next';
import { type ReactElement, useRef, useState } from 'react';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import { ConfirmQuestion } from '../Modal';
import {
  CUPBOARD_MENU_LABEL,
  MAKE_IT_OURS_DETAILS,
  MakeItOursQuestion,
  RemoveQuestion,
  useCupboardWrites,
} from './cupboard-writes';
import type { AnnotateMoreProps } from './types';

// The Annotate dialog's More menu (M8.17): Make It Ours and Remove from the
// form's foot, set apart in Delete's place, each offered on the member's
// permission and asked as the entry page asks it. MenuButton as every other
// menu draws it, the owner's call of 2026-10-19, with Remove in its
// destructive item style. The question is a ConfirmQuestion over the form
// rather than the page's Modal, since a second native dialog inside the first
// would take its Escape. A write leaves the dialog with whatever it held
// unsaved: Remove deletes the annotations, and Make It Ours copies the saved ones.

interface AnnotateMoreBodyProps extends AnnotateMoreProps {
  workspaceId: string;
  ingredientId: string;
  /** The entry as the coven calls it, for the two questions. */
  name: string;
  /** Where the dialog closes to, and so where a remove leads without `removedHref`. */
  closeHref: Route;
  onRefused: (message: string) => void;
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
}: AnnotateMoreBodyProps): ReactElement | null {
  const [asking, setAsking] = useState<'remove' | 'own'>();
  // The menu's button, where the focus goes back to once a question closes,
  // since the item that opened it goes with the menu.
  const trigger = useRef<HTMLButtonElement>(null);
  const writes = useCupboardWrites({
    workspaceId,
    covenSlug,
    ingredientId,
    // On the list, where the dialog closes to: the list as it was, read again.
    removedHref: removedHref ?? closeHref,
    onSettle: () => setAsking(undefined),
    onRefused,
  });
  const ask = (what: 'remove' | 'own') => () => {
    trigger.current?.focus();
    setAsking(what);
  };
  const items: MenuButtonItem[] = [
    ...(canMakeOurs ? [{ key: 'own', label: 'Make It Ours', onSelect: ask('own') }] : []),
    ...(canRemove
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: ask('remove') }]
      : []),
  ];
  if (items.length === 0) return null;
  const keep = () => setAsking(undefined);
  return (
    <>
      <MenuButton
        ref={trigger}
        label={CUPBOARD_MENU_LABEL}
        className="btn btn--quiet"
        items={items}
      />
      <ConfirmQuestion
        key="own"
        asked={asking === 'own'}
        question={<MakeItOursQuestion name={name} />}
        details={<p>{MAKE_IT_OURS_DETAILS}</p>}
        tone="solid"
        confirmLabel="Make It Ours"
        busyLabel="Making It Ours"
        keepLabel="Cancel"
        busy={writes.makeOurs.pending}
        onConfirm={async () => writes.makeOurs.run()}
        onKeep={keep}
      />
      <ConfirmQuestion
        key="remove"
        asked={asking === 'remove'}
        question={<RemoveQuestion name={name} />}
        confirmLabel="Remove"
        busyLabel="Removing"
        keepLabel="Cancel"
        busy={writes.remove.pending}
        onConfirm={async () => writes.remove.run()}
        onKeep={keep}
      />
    </>
  );
}
