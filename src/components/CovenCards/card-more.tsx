'use client';

import { type ReactElement, useRef, useState } from 'react';
import { MoreMenu } from '../IconTip';
import {
  MakeItOursDialog,
  RemoveDialog,
  useCupboardWrites,
} from '../IngredientEntry/cupboard-writes';
import { choicesFor } from '../MenuButton/sections';
import type { MenuButtonItem } from '../MenuButton/types';
import Notice from '../Notice';
import type { CardMoreProps } from './types';

// A held compendium entry's More menu on a coven card: Make It Ours, and Remove beside it. Delete and a
// lone Remove are not on the card, since the Edit Ingredient and Annotate dialogs hold them
// (claude-docs/components/coven-cards.md, "The More menu on a card").

type Asking = 'makeOurs' | 'remove';

export default function CardMore({
  id,
  label,
  name,
  workspaceId,
  covenSlug,
  mayMakeOurs = false,
  mayRemove = false,
  leaveHref,
}: CardMoreProps): ReactElement | null {
  const [asking, setAsking] = useState<Asking>();
  const [alert, setAlert] = useState<string>();
  // The More the focus goes back to once a dialog closes, while it is still in
  // the page; once the write has taken the card away it is gone, and Modal
  // gives the focus to the page's heading.
  const trigger = useRef<HTMLButtonElement>(null);
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const settle = () => setAsking(undefined);
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

  // Without Make It Ours the menu would hold Remove alone, which the Annotate dialog already holds.
  if (!mayMakeOurs) return null;
  const items: MenuButtonItem[] = [
    { key: 'makeOurs', label: 'Make It Ours', onSelect: ask('makeOurs') },
    ...(mayRemove
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: ask('remove') }]
      : []),
  ];

  const close = () => setAsking(undefined);
  return (
    <>
      <MoreMenu
        ref={trigger}
        name={name}
        {...choicesFor({ compendium: [], coven: items }, 'coven')}
      />
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
