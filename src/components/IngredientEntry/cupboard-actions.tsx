'use client';

import type { Route } from 'next';
import { type ReactElement, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import { AnnotateButton, AnnotateLink, CompendiumEditLink, MoreMenu } from '../IconTip';
import { choicesFor } from '../MenuButton/sections';
import type { MenuButtonItem } from '../MenuButton/types';
import { useOpenModalClick } from '../Modal';
import AnnotateDialog from './annotate-dialog';
import { MakeItOursDialog, RemoveDialog, useCupboardWrites } from './cupboard-writes';
import { ANNOTATE_HEADING } from './annotate-heading';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import AnnotatePicker from './annotate-picker';
import EditStock, { type StockPlace } from './edit-stock';
import PlusMark from './plus-mark';
import type {
  CupboardActionsProps,
  CupboardPlace,
  CupboardPlus,
  CupboardWrite,
  PublicCupboardActionsProps,
} from './types';

// The icons beside a compendium entry's title: a main icon and More, after the plus
// (claude-docs/components/ingredient-entry.md, "What the cupboard actions draw").

const plusOfPlaces = (
  places: readonly CupboardPlace[],
  defaultWorkspaceId: string,
): CupboardPlus | undefined => {
  const adders = placesFor.add(places);
  return adders.length > 0
    ? {
        workspaceId: startOn(adders, defaultWorkspaceId),
        covens: adders.map(({ workspaceId, name }) => ({ id: workspaceId, name })),
        heldIn: adders.filter(({ held }) => held).map(({ workspaceId }) => workspaceId),
      }
    : undefined;
};

type Asking = 'remove' | 'own' | 'annotate' | 'stock';

const placesFor = {
  add: (places: readonly CupboardPlace[]) => places.filter(({ canAdd }) => canAdd),
  annotate: (places: readonly CupboardPlace[]) =>
    places.filter(({ held, canAnnotate }) => held && canAnnotate),
  own: (places: readonly CupboardPlace[]) =>
    places.filter(({ held, canMakeOurs }) => held && canMakeOurs),
  remove: (places: readonly CupboardPlace[]) =>
    places.filter(({ held, canRemove }) => held && canRemove),
};

function normalise(props: CupboardActionsProps | PublicCupboardActionsProps) {
  if ('covens' in props) {
    const { opened } = props.annotate;
    return {
      places: props.covens,
      defaultWorkspaceId: props.defaultWorkspaceId,
      closeHref: props.annotate.closeHref,
      opened,
      name: props.compendium.name,
      removedHref: undefined,
      plus: plusOfPlaces(props.covens, props.defaultWorkspaceId),
    };
  }
  const { workspaceId, covenSlug, held, canAdd, canAnnotate, canRemove, canMakeOurs } = props;
  return {
    places: [
      {
        workspaceId,
        covenSlug,
        name: '',
        held,
        canAdd,
        canAnnotate,
        canRemove,
        canMakeOurs,
        annotateHref: props.annotate.href,
        stock: props.stock,
      },
    ],
    defaultWorkspaceId: workspaceId,
    closeHref: props.annotate.closeHref,
    opened: props.annotate.opened ? { workspaceId, overrides: props.overrides } : undefined,
    name: props.overrides.label ?? props.compendium.name,
    removedHref: props.removedHref,
    plus: props.plus,
  };
}

const startOn = (places: readonly CupboardPlace[], defaultWorkspaceId: string): string =>
  (places.find(({ workspaceId }) => workspaceId === defaultWorkspaceId) ?? places[0]).workspaceId;

export default function CupboardActions(
  props: CupboardActionsProps | PublicCupboardActionsProps,
): ReactElement | null {
  const { ingredientId, compendium, edit } = props;
  const { places, defaultWorkspaceId, closeHref, opened, name, removedHref, plus } =
    normalise(props);
  const viewing = 'covens' in props ? 'compendium' : 'coven';
  const [asking, setAsking] = useState<Asking>();
  const [target, setTarget] = useState(defaultWorkspaceId);
  const targetPlace = places.find(({ workspaceId }) => workspaceId === target) ?? places[0];
  const anyHeld = places.some(({ held }) => held);
  // The controls a dialog's focus returns to, read as it closes so the refs are the commit's own
  // (claude-docs/components/ingredient-entry.md, "What the cupboard actions draw").
  const annotateControl = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const moreControl = useRef<HTMLButtonElement | null>(null);
  const moreFeedback = useClickFeedback({ name: `More for ${name}` });
  const moreAnchor = moreFeedback.anchorRef;
  const moreRef = useCallback(
    (node: HTMLButtonElement | null) => {
      moreControl.current = node;
      moreAnchor(node);
    },
    [moreAnchor],
  );
  const heldNow = useRef(anyHeld);
  useLayoutEffect(() => {
    heldNow.current = anyHeld;
  }, [anyHeld]);
  const back = (...controls: { current: HTMLElement | null }[]) => {
    if (!heldNow.current) return null;
    return controls.map(({ current }) => current).find((node) => node?.isConnected) ?? null;
  };
  const reportRefusal = (message: string | undefined): void => moreFeedback.report(message);
  // The remove's confirmation stays busy until the re-read drops the entry; the choice is then
  // forgotten.
  const targetHeld = targetPlace.held;
  if (!targetHeld && (asking === 'remove' || asking === 'own')) setAsking(undefined);
  const openEdit = useOpenModalClick(
    edit?.href ?? ('' as Route),
    editHeading(
      edit?.entry ?? { name: '', canonicalName: null, nomenclature: 'unknown' },
      EDIT_ENTRY_EYEBROW,
    ),
  );

  // Edit Stock, first in More on either page (claude-docs/components/ingredient-entry.md, "What the cupboard actions draw").
  const stockers = places.flatMap(({ workspaceId, name: coven, held, stock }): StockPlace[] =>
    held && stock ? [{ workspaceId, name: coven, stock }] : [],
  );
  const annotators = placesFor.annotate(places);
  const owners = placesFor.own(places);
  const removers = placesFor.remove(places);
  const annotateHref = annotators.length === 1 ? annotators[0].annotateHref : ('' as Route);
  const openAnnotate = useOpenModalClick(annotateHref, ANNOTATE_HEADING);

  const settle = (): void => setAsking(undefined);
  const writes = useCupboardWrites({
    workspaceId: targetPlace.workspaceId,
    covenSlug: targetPlace.covenSlug,
    ingredientId,
    removedHref,
    onSettle: settle,
    onRefused: reportRefusal,
  });

  const ask = (what: Asking, among: readonly CupboardPlace[], write?: CupboardWrite) => {
    moreFeedback.report(undefined);
    write?.reset?.();
    setTarget(startOn(among, defaultWorkspaceId));
    setAsking(what);
  };
  const choiceOf = (among: readonly CupboardPlace[]) =>
    among.length > 1
      ? {
          options: among.map(({ workspaceId, name: coven }) => ({ id: workspaceId, name: coven })),
          chosen: targetPlace.workspaceId,
          onChoose: setTarget,
        }
      : undefined;

  // The main icon: the page's own side first, else the other side's edit; Annotate is never main on
  // the compendium's page.
  const mayAnnotate = annotators.length > 0;
  const main: 'edit' | 'annotate' | undefined =
    viewing === 'compendium'
      ? edit
        ? 'edit'
        : undefined
      : mayAnnotate
        ? 'annotate'
        : edit
          ? 'edit'
          : undefined;

  const askStock = (): void => {
    moreFeedback.report(undefined);
    setAsking('stock');
  };
  const stockItem: MenuButtonItem | undefined =
    stockers.length > 0 ? { key: 'stock', label: 'Edit Stock', onSelect: askStock } : undefined;
  const annotateItem: MenuButtonItem | undefined =
    main !== 'annotate' && mayAnnotate
      ? annotators.length === 1
        ? { key: 'annotate', label: 'Annotate', href: annotateHref, onClick: openAnnotate }
        : { key: 'annotate', label: 'Annotate', onSelect: () => ask('annotate', annotators) }
      : undefined;
  const editItem: MenuButtonItem | undefined =
    main !== 'edit' && edit
      ? { key: 'edit', label: 'Edit in Compendium', href: edit.href, onClick: openEdit }
      : undefined;
  const ownItem: MenuButtonItem | undefined =
    owners.length > 0
      ? { key: 'own', label: 'Make It Ours', onSelect: () => ask('own', owners, writes.makeOurs) }
      : undefined;
  const removeItem: MenuButtonItem | undefined =
    removers.length > 0
      ? {
          key: 'remove',
          label: 'Remove',
          destructive: true,
          onSelect: () => ask('remove', removers, writes.remove),
        }
      : undefined;
  // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
  const covenItems = [stockItem, annotateItem, ownItem, removeItem].filter(
    (item): item is MenuButtonItem => item !== undefined,
  );
  const moreChoices = choicesFor(
    { compendium: editItem ? [editItem] : [], coven: covenItems },
    viewing,
  );
  const more = moreChoices.sections.length > 0;
  const plusMark = plus ? <PlusMark plus={plus} ingredientId={ingredientId} name={name} /> : null;
  const icons = (plusMark ? 1 : 0) + (main ? 1 : 0) + (more ? 1 : 0);
  if (icons === 0) return null;
  const openedPlace =
    opened && places.find(({ workspaceId }) => workspaceId === opened.workspaceId);

  return (
    <div
      className="ingredient-entry__cupboard ingredient-entry__cupboard--icons"
      data-icons={icons}
    >
      {plusMark}
      {main === 'edit' && edit && (
        <CompendiumEditLink
          href={edit.href}
          name={name}
          heading={editHeading(edit.entry, EDIT_ENTRY_EYEBROW)}
        />
      )}
      {main === 'annotate' &&
        (annotators.length === 1 ? (
          <AnnotateLink
            ref={annotateControl}
            href={annotateHref}
            name={name}
            heading={ANNOTATE_HEADING}
          />
        ) : (
          <AnnotateButton
            ref={annotateControl}
            name={name}
            onClick={() => ask('annotate', annotators)}
          />
        ))}
      {more && <MoreMenu ref={moreRef} name={name} {...moreChoices} />}
      {moreFeedback.feedback}
      {/* Asked in a dialog over the page, as Leave Coven asks, rather than in the title's row. */}
      {asking === 'stock' && (
        <EditStock
          places={stockers}
          ingredientId={ingredientId}
          ingredientName={name}
          defaultWorkspaceId={defaultWorkspaceId}
          namesCoven={viewing === 'compendium'}
          onClose={settle}
          returnTo={() => back(moreControl)}
        />
      )}
      {asking === 'annotate' && (
        <AnnotatePicker
          places={annotators}
          defaultWorkspaceId={defaultWorkspaceId}
          onClose={settle}
          returnTo={() => back(annotateControl, moreControl)}
        />
      )}
      {asking === 'own' && targetPlace.held && (
        <MakeItOursDialog
          name={name}
          write={writes.makeOurs}
          onClose={settle}
          returnTo={() => back(moreControl)}
          covens={choiceOf(owners)}
        />
      )}
      {asking === 'remove' && targetPlace.held && (
        <RemoveDialog
          name={name}
          write={writes.remove}
          onClose={settle}
          returnTo={() => back(moreControl)}
          covens={choiceOf(removers)}
        />
      )}
      <AnnotateDialog
        closeHref={closeHref}
        returnTo={() => back(annotateControl, moreControl)}
        opened={
          openedPlace && opened
            ? {
                workspaceId: openedPlace.workspaceId,
                ingredientId,
                compendium,
                overrides: opened.overrides,
              }
            : undefined
        }
        more={{
          covenSlug: (openedPlace ?? targetPlace).covenSlug,
          canMakeOurs: (openedPlace ?? targetPlace).canMakeOurs,
          canRemove: (openedPlace ?? targetPlace).canRemove,
          removedHref,
        }}
      />
    </div>
  );
}
