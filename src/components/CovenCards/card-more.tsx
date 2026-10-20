'use client';

import type { Route } from 'next';
import { type ReactElement, useRef, useState } from 'react';
import IconTip, { BinIcon, DotsIcon } from '../IconTip';
import {
  MakeItOursDialog,
  RemoveDialog,
  useCupboardWrites,
} from '../IngredientEntry/cupboard-writes';
import { DeleteDialog, useDeleteEntry } from '../IngredientEntry/delete-entry';
import { linkHeading } from '../IngredientEntry/link-heading';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import { useOpenModalClick } from '../Modal';
import Notice from '../Notice';
import type { CardMoreProps } from './types';

// A coven card's More (M8.17): the vertical dots beside Edit or Annotate,
// opening a menu downward of the card's further writes. On the coven's own
// entry, Link to the Compendium and Delete Ingredient; on a compendium entry
// the cupboard holds, Make It Ours and Remove. Link opens its dialog from the
// list's `?link=<id>`, as Edit does; the other three ask in place, in the
// dialogs the entry page shares (option A, the owner's call, 2026-10-20),
// since a confirmation has nothing to share as an address. A lone Delete or
// Remove is its own bin instead of a menu of one. A lone Link or Make It Ours
// stays a menu of one: each needs the delete permission too, so no role
// reaches either alone today, and no icon is built for a case that cannot
// happen. A write that takes the card away reads the list again, and the
// focus then goes to the page's heading, the card's More having gone with it;
// a refusal gives More the focus back. claude-docs/components/coven-cards.md.

type Asking = 'delete' | 'makeOurs' | 'remove';

export default function CardMore({
  id,
  label,
  name,
  workspaceId,
  covenSlug,
  linkHref,
  mayDelete = false,
  mayMakeOurs = false,
  mayRemove = false,
}: CardMoreProps): ReactElement | null {
  const [asking, setAsking] = useState<Asking>();
  const [alert, setAlert] = useState<string>();
  // The More (or the lone bin) the focus goes back to once a dialog closes,
  // while it is still in the page; once the write has taken the card away it
  // is gone, and Modal gives the focus to the page's heading.
  const trigger = useRef<HTMLButtonElement>(null);
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const openLink = useOpenModalClick(linkHref ?? ('' as Route), linkHeading(label));
  const settle = () => setAsking(undefined);
  const deleting = useDeleteEntry({
    workspaceId,
    id,
    onSettle: settle,
    onRefused: setAlert,
  });
  const { remove, makeOurs } = useCupboardWrites({
    workspaceId,
    covenSlug,
    ingredientId: id,
    onSettle: settle,
    onRefused: setAlert,
  });
  const ask = (what: Asking) => () => {
    setAlert(undefined);
    setAsking(what);
  };

  const items: MenuButtonItem[] = [
    ...(linkHref
      ? [{ key: 'link', label: 'Link to the Compendium', href: linkHref, onClick: openLink }]
      : []),
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
  const verb = only.key === 'delete' ? 'Delete' : 'Remove';

  const control = bin ? (
    <IconTip tip={verb}>
      <button
        ref={trigger}
        type="button"
        className="icon-tip__remove"
        onClick={only.href === undefined ? only.onSelect : undefined}
      >
        <BinIcon />
        <span className="visually-hidden">
          {verb} {name}
        </span>
      </button>
    </IconTip>
  ) : (
    <IconTip tip="More">
      <MenuButton
        ref={trigger}
        label={`More for ${name}`}
        className="icon-tip__edit"
        icon={<DotsIcon />}
        items={items}
      />
    </IconTip>
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
