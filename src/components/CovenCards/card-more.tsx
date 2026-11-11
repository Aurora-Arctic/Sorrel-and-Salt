'use client';

import type { ReactElement } from 'react';
import { MoreMenu, useAskingMenu } from '../IconTip';
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
// (claude-docs/components/coven-cards.md, "Contracts").

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
  const { asking, ask, settle, alert, setAlert, trigger, back } = useAskingMenu<Asking>();
  const { remove, makeOurs } = useCupboardWrites({
    workspaceId,
    covenSlug,
    ingredientId: id,
    removedHref: leaveHref,
    onSettle: settle,
    onRefused: setAlert,
  });
  // Without Make It Ours the menu would hold Remove alone, which the Annotate dialog already holds.
  if (!mayMakeOurs) return null;
  const items: MenuButtonItem[] = [
    { key: 'makeOurs', label: 'Make It Ours', onSelect: () => ask('makeOurs') },
    ...(mayRemove
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: () => ask('remove') }]
      : []),
  ];

  return (
    <>
      <MoreMenu
        ref={trigger}
        name={name}
        {...choicesFor({ compendium: [], coven: items }, 'coven')}
      />
      {asking === 'makeOurs' && (
        <MakeItOursDialog name={label} write={makeOurs} onClose={settle} returnTo={back} />
      )}
      {asking === 'remove' && (
        <RemoveDialog name={label} write={remove} onClose={settle} returnTo={back} />
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
    </>
  );
}
