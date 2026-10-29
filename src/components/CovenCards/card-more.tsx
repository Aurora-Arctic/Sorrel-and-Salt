'use client';

import { type ReactElement, useRef, useState } from 'react';
import { BinButton, MoreMenu } from '../IconTip';
import {
  MakeItOursDialog,
  RemoveDialog,
  useCupboardWrites,
} from '../IngredientEntry/cupboard-writes';
import { DeleteDialog, useDeleteEntry } from '../IngredientEntry/delete-entry';
import { choicesFor } from '../MenuButton/sections';
import type { MenuButtonItem } from '../MenuButton/types';
import Notice from '../Notice';
import type { CardMoreProps } from './types';

// A coven card's More menu: Delete Ingredient on the coven's own entry; Make It Ours and Remove on a
// held compendium entry. A lone Delete or Remove is its own bin, as a one-choice menu costs two presses
// (claude-docs/components/coven-cards.md, "Source notes").

type Asking = 'delete' | 'makeOurs' | 'remove';

export default function CardMore({
  id,
  label,
  name,
  workspaceId,
  covenSlug,
  mayDelete = false,
  mayMakeOurs = false,
  mayRemove = false,
  leaveHref,
}: CardMoreProps): ReactElement | null {
  const [asking, setAsking] = useState<Asking>();
  const [alert, setAlert] = useState<string>();
  // The More (or the lone bin) the focus goes back to once a dialog closes,
  // while it is still in the page; once the write has taken the card away it
  // is gone, and Modal gives the focus to the page's heading.
  const trigger = useRef<HTMLButtonElement>(null);
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const settle = () => setAsking(undefined);
  const deleting = useDeleteEntry({
    workspaceId,
    id,
    deletedHref: leaveHref,
    announcement: `${label} deleted`,
    onSettle: settle,
    onRefused: setAlert,
  });
  const { remove, makeOurs } = useCupboardWrites({
    workspaceId,
    covenSlug,
    ingredientId: id,
    removedHref: leaveHref,
    onSettle: settle,
    onRefused: setAlert,
  });
  const ask = (what: Asking) => () => {
    setAlert(undefined);
    setAsking(what);
  };

  const items: MenuButtonItem[] = [
    ...(mayDelete
      ? [{ key: 'delete', label: 'Delete Ingredient', destructive: true, onSelect: ask('delete') }]
      : []),
    ...(mayMakeOurs ? [{ key: 'makeOurs', label: 'Make It Ours', onSelect: ask('makeOurs') }] : []),
    ...(mayRemove
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: ask('remove') }]
      : []),
  ];
  if (items.length === 0) return null;
  // A lone bin: the one choice is Delete or Remove.
  const [only] = items;
  const bin = items.length === 1 && (only.key === 'delete' || only.key === 'remove');
  const verb = only.key === 'delete' ? 'Delete Ingredient' : 'Remove';

  const control = bin ? (
    <BinButton
      ref={trigger}
      verb={verb}
      name={name}
      onClick={only.href === undefined ? only.onSelect : () => {}}
    />
  ) : (
    <MoreMenu
      ref={trigger}
      name={name}
      {...choicesFor({ compendium: [], coven: items }, 'coven')}
    />
  );

  const close = () => setAsking(undefined);
  return (
    <>
      {control}
      {asking === 'delete' && (
        <DeleteDialog name={label} write={deleting} onClose={close} returnTo={back} />
      )}
      {asking === 'makeOurs' && (
        <MakeItOursDialog name={label} write={makeOurs} onClose={close} returnTo={back} />
      )}
      {asking === 'remove' && (
        <RemoveDialog name={label} write={remove} onClose={close} returnTo={back} />
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
    </>
  );
}
