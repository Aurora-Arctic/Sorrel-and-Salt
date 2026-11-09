'use client';

import type { Route } from 'next';
import { type ReactElement, useRef, useState } from 'react';
import { preloadOnIntent, usePreloadWhenIdle } from '../../lib/use-lazy-module';
import { MoreMenu } from '../IconTip';
import { covenChoiceModule } from '../IngredientEntry/lazy-coven-choice';
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

// The three dots on a compendium card: Edit Stock, Annotate, Make It Ours and Remove, in the dialogs
// the entry page shares. Drawn only when it holds a choice; Quick Look carries `leaveHref`, where a
// remove leads (claude-docs/components/compendium-cards.md, "The three dots").

type Asking = 'stock' | 'annotate' | 'own' | 'remove';
type Can = 'canAnnotate' | 'canMakeOurs' | 'canRemove';

const among = (places: readonly CompendiumCardPlace[], can: Can) =>
  places.filter((place) => place[can]);

export default function CompendiumCardMore({
  id,
  label,
  name,
  places,
  leaveHref,
}: CompendiumCardMoreProps): ReactElement | null {
  usePreloadWhenIdle(covenChoiceModule);
  const [asking, setAsking] = useState<Asking>();
  const [alert, setAlert] = useState<string>();
  const [target, setTarget] = useState(places[0]?.workspaceId);
  const trigger = useRef<HTMLButtonElement>(null);
  const back = () => (trigger.current?.isConnected ? trigger.current : null);
  const settle = () => setAsking(undefined);

  const stockers = places.flatMap(({ workspaceId, name: coven, stock }): StockPlace[] =>
    stock ? [{ workspaceId, name: coven, stock }] : [],
  );
  const annotators = among(places, 'canAnnotate');
  const owners = among(places, 'canMakeOurs');
  const removers = among(places, 'canRemove');
  const targetPlace = places.find(({ workspaceId }) => workspaceId === target) ?? places[0];
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
      <MoreMenu
        ref={trigger}
        name={name}
        preload={preloadOnIntent(covenChoiceModule)}
        {...choices}
      />
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
