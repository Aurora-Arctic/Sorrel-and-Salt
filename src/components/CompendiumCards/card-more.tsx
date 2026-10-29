'use client';

import type { Route } from 'next';
import { type ReactElement, useRef, useState } from 'react';
import { MoreMenu } from '../IconTip';
import { ANNOTATE_HEADING } from '../IngredientEntry/annotate-heading';
import AnnotatePicker from '../IngredientEntry/annotate-picker';
import EditStock, { type StockPlace } from '../IngredientEntry/edit-stock';
import {
  MakeItOursDialog,
  RemoveDialog,
  useCupboardWrites,
} from '../IngredientEntry/cupboard-writes';
import { choicesFor } from '../MenuButton/sections';
import type { MenuButtonItem } from '../MenuButton/types';
import { useOpenModalClick } from '../Modal';
import Notice from '../Notice';
import type { CompendiumCardMoreProps, CompendiumCardPlace } from './types';

// The three dots on a compendium card (the owner's call, 2026-10-20), after the plus and, for a
// curator, Edit in Compendium: what a signed-in member may do about the entry in the covens that
// hold it. Annotate (a link to the entry's page with that coven's Annotate dialog open, or a
// question of which coven where two or more may), Make It Ours and Remove, each asked in the
// dialogs the entry page shares, and first of them Edit Stock (the owner's call, 2026-10-21): the
// coven card's own dialog, opened at once for one coven that may update stock and after a question
// of which for several, so the card and the page cannot differ. Add is the plus, and
// Edit in Compendium its own icon, so neither is in here; the Compendium section `choicesFor`
// would put first therefore has nothing in it today and is left out, and the menu draws the
// coven's choices under the one "Coven" section label every More draws, though they are all the
// coven's (the owner's call, 2026-10-20). Drawn only when it holds a choice, so a visitor, a viewer and a coven without the
// entry see no dots. The Quick Look window made from the same component carries `leaveHref`,
// where a remove leads to close it. claude-docs/components/compendium-cards.md.

type Asking = 'stock' | 'annotate' | 'own' | 'remove';
type Can = 'canAnnotate' | 'canMakeOurs' | 'canRemove';

/** The covens a choice may act in: those that hold the entry (the page's) and let the role do it. */
const among = (places: readonly CompendiumCardPlace[], can: Can) =>
  places.filter((place) => place[can]);

export default function CompendiumCardMore({
  id,
  label,
  name,
  places,
  leaveHref,
}: CompendiumCardMoreProps): ReactElement | null {
  const [asking, setAsking] = useState<Asking>();
  const [alert, setAlert] = useState<string>();
  const [target, setTarget] = useState(places[0]?.workspaceId);
  const trigger = useRef<HTMLButtonElement>(null);
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const settle = () => setAsking(undefined);

  // The covens that may update stock carry the stock the page read for them.
  const stockers = places.flatMap(({ workspaceId, name: coven, stock }): StockPlace[] =>
    stock ? [{ workspaceId, name: coven, stock }] : [],
  );
  const annotators = among(places, 'canAnnotate');
  const owners = among(places, 'canMakeOurs');
  const removers = among(places, 'canRemove');
  const targetPlace = places.find(({ workspaceId }) => workspaceId === target) ?? places[0];
  // One coven that may annotate: a link to the entry's page with its dialog open, pressed open at
  // once as the other dialog links are.
  const annotateHref = annotators.length === 1 ? annotators[0].annotateHref : ('' as Route);
  const openAnnotate = useOpenModalClick(annotateHref, ANNOTATE_HEADING);
  const writes = useCupboardWrites({
    workspaceId: targetPlace?.workspaceId ?? '',
    covenSlug: targetPlace?.covenSlug ?? '',
    ingredientId: id,
    removedHref: leaveHref,
    onSettle: settle,
    onRefused: setAlert,
  });

  // A remove the page has read again, so the coven no longer holds the entry, closes its
  // confirmation with it.
  const stillThere = (list: readonly CompendiumCardPlace[]) =>
    list.some(({ workspaceId }) => workspaceId === targetPlace?.workspaceId);
  const gone =
    (asking === 'remove' && !stillThere(removers)) || (asking === 'own' && !stillThere(owners));
  if (gone) setAsking(undefined);

  const ask = (what: Asking, list: readonly CompendiumCardPlace[]) => () => {
    setAlert(undefined);
    writes.makeOurs.reset?.();
    writes.remove.reset?.();
    setTarget(list[0].workspaceId);
    setAsking(what);
  };
  const choiceOf = (list: readonly CompendiumCardPlace[]) =>
    list.length > 1
      ? {
          options: list.map(({ workspaceId, name: coven }) => ({ id: workspaceId, name: coven })),
          chosen: targetPlace.workspaceId,
          onChoose: setTarget,
        }
      : undefined;

  const coven: MenuButtonItem[] = [
    ...(stockers.length > 0
      ? [{ key: 'stock', label: 'Edit Stock', onSelect: () => setAsking('stock') }]
      : []),
    ...(annotators.length === 0
      ? []
      : [
          annotators.length === 1
            ? { key: 'annotate', label: 'Annotate', href: annotateHref, onClick: openAnnotate }
            : { key: 'annotate', label: 'Annotate', onSelect: ask('annotate', annotators) },
        ]),
    ...(owners.length > 0
      ? [{ key: 'own', label: 'Make It Ours', onSelect: ask('own', owners) }]
      : []),
    ...(removers.length > 0
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: ask('remove', removers) }]
      : []),
  ];
  if (coven.length === 0) return null;
  const choices = choicesFor({ compendium: [], coven }, 'compendium');

  return (
    <>
      <MoreMenu ref={trigger} name={name} {...choices} />
      {asking === 'stock' && (
        <EditStock
          places={stockers}
          ingredientId={id}
          ingredientName={label}
          defaultWorkspaceId={places[0].workspaceId}
          namesCoven
          onClose={settle}
          returnTo={back}
        />
      )}
      {asking === 'annotate' && (
        <AnnotatePicker
          places={annotators}
          defaultWorkspaceId={annotators[0].workspaceId}
          onClose={settle}
          returnTo={back}
        />
      )}
      {asking === 'own' && !gone && (
        <MakeItOursDialog
          name={label}
          write={writes.makeOurs}
          onClose={settle}
          returnTo={back}
          covens={choiceOf(owners)}
        />
      )}
      {asking === 'remove' && !gone && (
        <RemoveDialog
          name={label}
          write={writes.remove}
          onClose={settle}
          returnTo={back}
          covens={choiceOf(removers)}
        />
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
    </>
  );
}
