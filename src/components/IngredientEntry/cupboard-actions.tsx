'use client';

import type { Route } from 'next';
import { type ReactElement, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import { AnnotateButton, AnnotateLink, BinButton, CompendiumEditLink, MoreMenu } from '../IconTip';
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

// What a compendium entry offers a viewer beside its title (M12.17), drawn as a list card's foot
// draws its actions (the owner's calls, 2026-10-20): icons, with the three dots only for what is
// left over. Up to three icons after the plus (below):
//
// 1. The main icon, never folded into the menu, for a viewer who may write there. On a coven's
//    page it is the card's own: Annotate, a link to the `?annotate` dialog where one coven may
//    annotate (a button asking which coven where several do, on the public page). On the
//    compendium's page (the public entry page, the admin page) it is Edit in Compendium, for an
//    admin or a curator, named and tipped as such so it is not taken for a coven's own. A viewer
//    with no write right there has none: signed out, a coven viewer, a member who is no curator
//    on the compendium's page. If the page's own main has no right behind it but the other side's
//    edit does (a curator in a coven that holds the entry, who may not annotate), the edit takes
//    the place, so a lone choice is never a menu of one.
// 2. More, the three dots, only when there is more than that: Make It Ours, Remove, and
//    whichever of Annotate and Edit in Compendium is not the main icon. Remove sits beside Make
//    It Ours as the coven card's CardMore has it (the owner's call, 2026-10-20). It always draws
//    its labelled sections (`choicesFor`): the coven's alone for a member, and for a curator who
//    is also a coven's member the compendium's too, the viewer's own side first, by the page and
//    not by the address (claude-docs/components/menu-button.md).
// 3. The bin, Remove, only where Remove is the one choice left and so would be a menu of one: a
//    member who may remove but not make it ours. A lone choice is its own icon (the owner's call,
//    2026-10-20), as the card's CardMore draws it.
//
// The plus is the compendium card's (AddIcon), just before them, and never one of the choices.
// Make It Ours leads to the own entry it writes, since the compendium entry's page is no longer
// the coven's; every other write reads the page again, so the marks and the choices follow the
// cupboard. Which choices show is the page's, from the member's permissions; each is only the
// door, and the service is the guard. Every write goes through /api/graphql. Make It Ours and
// Remove are `cupboard-writes.tsx`'s, shared with the Annotate dialog's More menu (M8.17). A
// refusal is one callout under the control that keeps the focus (M12.31's design F,
// `useClickFeedback`): the More's, or the bin's for a Remove that has the bin; it floats rather
// than taking room beside the title.
//
// The public entry page offers the same (M9.12), across every coven the viewer may write in,
// acting at once where one coven permits and asking which where several do. Make It Ours and
// Remove ask in their own confirmation; Annotate asks in a picker of its own, then opens that
// coven's `?annotate=<covenSlug>`. A coven's page is the one-place case of the same list. A page
// given no `plus` offers no Add at all; once every coven that may add holds the entry, the card's
// check stands in the plus's place. claude-docs/components/ingredient-entry.md.

/** The public page's plus, from its covens: those that may add, and which hold the entry. */
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

/** The covens a choice may act in: Add in those that lack the entry, the rest in those that hold it. */
const placesFor = {
  add: (places: readonly CupboardPlace[]) => places.filter(({ canAdd }) => canAdd),
  annotate: (places: readonly CupboardPlace[]) =>
    places.filter(({ held, canAnnotate }) => held && canAnnotate),
  own: (places: readonly CupboardPlace[]) =>
    places.filter(({ held, canMakeOurs }) => held && canMakeOurs),
  remove: (places: readonly CupboardPlace[]) =>
    places.filter(({ held, canRemove }) => held && canRemove),
};

/** The two shapes' props as one: the coven page's single place, or the public page's covens. */
function normalise(props: CupboardActionsProps | PublicCupboardActionsProps) {
  if ('covens' in props) {
    const { opened } = props.annotate;
    return {
      places: props.covens,
      defaultWorkspaceId: props.defaultWorkspaceId,
      closeHref: props.annotate.closeHref,
      opened,
      // No coven's label: the public page is the compendium's.
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
    // The entry as the coven calls it, for the two confirmations.
    name: props.overrides.label ?? props.compendium.name,
    removedHref: props.removedHref,
    plus: props.plus,
  };
}

/** The coven a confirmation starts on: the default where it may, else the first that may. */
const startOn = (places: readonly CupboardPlace[], defaultWorkspaceId: string): string =>
  (places.find(({ workspaceId }) => workspaceId === defaultWorkspaceId) ?? places[0]).workspaceId;

export default function CupboardActions(
  props: CupboardActionsProps | PublicCupboardActionsProps,
): ReactElement | null {
  const { ingredientId, compendium, edit } = props;
  const { places, defaultWorkspaceId, closeHref, opened, name, removedHref, plus } =
    normalise(props);
  // Where the viewer is, which puts a section first in More and decides the main icon: the
  // public page is the compendium's, the coven's own page the coven's. The page's shape says
  // so, so nothing here reads an address.
  const viewing = 'covens' in props ? 'compendium' : 'coven';
  // Which question is open, one at a time. The Annotate dialog is the
  // address's instead (`opened`), as the curator's Edit is.
  const [asking, setAsking] = useState<Asking>();
  // The coven Make It Ours or Remove acts in: one coven alone, or the
  // confirmation's choice where several hold the entry.
  const [target, setTarget] = useState(defaultWorkspaceId);
  const targetPlace = places.find(({ workspaceId }) => workspaceId === target) ?? places[0];
  const anyHeld = places.some(({ held }) => held);
  // The controls a dialog's focus goes back to once it closes, since the menu item that opened
  // it is gone with the menu: the annotate icon, the three dots and the bin. Once a remove has
  // taken the entry away they offer something else or nothing, so they name nowhere and Modal
  // gives the focus to the page's heading, as a row's Remove does (M8.17). Read as the dialog
  // closes, after this render's layout, so the refs are the commit's own.
  const annotateControl = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const moreControl = useRef<HTMLButtonElement | null>(null);
  const binControl = useRef<HTMLButtonElement | null>(null);
  // A refusal is a callout under the control the write came from: the three dots', or the
  // bin's where Remove is its own icon (`binOnly`, below, read as the refusal arrives).
  const binOnly = useRef(false);
  const binFeedback = useClickFeedback({ name: `Remove ${name}` });
  const moreFeedback = useClickFeedback({ name: `More for ${name}` });
  const lastAsked = useRef<Asking>(undefined);
  const binAnchor = binFeedback.anchorRef;
  const moreAnchor = moreFeedback.anchorRef;
  const binRef = useCallback(
    (node: HTMLButtonElement | null) => {
      binControl.current = node;
      binAnchor(node);
    },
    [binAnchor],
  );
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
  const reportRefusal = (message: string | undefined): void =>
    (lastAsked.current === 'remove' && binOnly.current ? binFeedback : moreFeedback).report(
      message,
    );
  // The remove's confirmation stays, busy, until the re-read drops the entry
  // from its coven; it closes in that render (below), and the choice is
  // forgotten here.
  const targetHeld = targetPlace.held;
  if (!targetHeld && (asking === 'remove' || asking === 'own')) setAsking(undefined);
  const openEdit = useOpenModalClick(
    edit?.href ?? ('' as Route),
    editHeading(
      edit?.entry ?? { name: '', canonicalName: null, nomenclature: 'unknown' },
      EDIT_ENTRY_EYEBROW,
    ),
  );

  // Edit Stock (M9.12), first in More on either page: a holding coven where the role may update
  // stock carries the stock the page read for it. A coven's own page has one coven, so the
  // dialog opens at once there; the public page asks which where there are several.
  const stockers = places.flatMap(({ workspaceId, name: coven, held, stock }): StockPlace[] =>
    held && stock ? [{ workspaceId, name: coven, stock }] : [],
  );
  const annotators = placesFor.annotate(places);
  const owners = placesFor.own(places);
  const removers = placesFor.remove(places);
  // One coven that may annotate: a link to its `?annotate`, as the coven page has it.
  const annotateHref = annotators.length === 1 ? annotators[0].annotateHref : ('' as Route);
  const openAnnotate = useOpenModalClick(annotateHref, ANNOTATE_HEADING);

  const settle = (): void => setAsking(undefined);
  // Make It Ours and Remove, shared with the Annotate dialog's More menu, in the target coven.
  const writes = useCupboardWrites({
    workspaceId: targetPlace.workspaceId,
    covenSlug: targetPlace.covenSlug,
    ingredientId,
    removedHref,
    onSettle: settle,
    onRefused: reportRefusal,
  });

  const ask = (what: Asking, among: readonly CupboardPlace[], write?: CupboardWrite) => {
    lastAsked.current = what;
    binFeedback.report(undefined);
    moreFeedback.report(undefined);
    write?.reset?.();
    setTarget(startOn(among, defaultWorkspaceId));
    setAsking(what);
  };
  /** Which coven, asked above a confirmation's question where two or more may. */
  const choiceOf = (among: readonly CupboardPlace[]) =>
    among.length > 1
      ? {
          options: among.map(({ workspaceId, name: coven }) => ({ id: workspaceId, name: coven })),
          chosen: targetPlace.workspaceId,
          onChoose: setTarget,
        }
      : undefined;

  // The main icon: the page's own side first, and the other side's edit when the page's has no
  // right behind it. Annotate is never main on the compendium's page, which the owner made the
  // compendium edit's alone.
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
    lastAsked.current = 'stock';
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
  // Remove is the one choice left in More: a lone choice is its own icon, so it is the bin.
  // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
  const bin = removeItem !== undefined && covenItems.length === 1 && editItem === undefined;
  useLayoutEffect(() => {
    binOnly.current = bin;
  }, [bin]);
  // Always labelled sections, the Coven one alone for a member (`choicesFor`).
  const moreChoices = choicesFor(
    { compendium: editItem ? [editItem] : [], coven: bin ? [] : covenItems },
    viewing,
  );
  const more = moreChoices.sections.length > 0;
  // The plus while some coven that may add lacks the entry, and the check once all hold it
  // (PlusMark), where Add is not one of the choices.
  const plusMark = plus ? <PlusMark plus={plus} ingredientId={ingredientId} name={name} /> : null;
  const icons = (plusMark ? 1 : 0) + (main ? 1 : 0) + (more ? 1 : 0) + (bin ? 1 : 0);
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
      {bin && (
        <BinButton
          ref={binRef}
          verb="Remove"
          name={name}
          onClick={() => ask('remove', removers, writes.remove)}
        />
      )}
      {binFeedback.feedback}
      {moreFeedback.feedback}
      {/* Asked in a dialog over the page, as Leave Coven asks (the owner's
          call, 2026-10-19), rather than in the title's row. */}
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
          returnTo={() => back(binControl, moreControl)}
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
