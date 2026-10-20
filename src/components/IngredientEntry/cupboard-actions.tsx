'use client';

import type { Route } from 'next';
import Link from 'next/link';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import IconTip, { EditLink, PencilIcon } from '../IconTip';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import { useOpenModalClick } from '../Modal';
import AnnotateDialog from './annotate-dialog';
import { MakeItOursDialog, RemoveDialog, useCupboardWrites } from './cupboard-writes';
import { ANNOTATE_HEADING } from './annotate-heading';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import AnnotatePicker from './annotate-picker';
import PlusMark from './plus-mark';
import type {
  CupboardActionsProps,
  CupboardPlace,
  CupboardPlus,
  CupboardWrite,
  PublicCupboardActionsProps,
} from './types';

// What a compendium entry offers a coven's member beside its title (M12.17):
// Annotate, Make It Ours (M12.23) and Remove once the coven holds it, and a
// curator's Edit Compendium Entry; adding is the plus's (below). Two or more
// share one Edit menu, the owner's call of 2026-10-19, so the title keeps its
// line; one alone is a plain button. The menu's button is the pencil at the end
// of the name's row, named Edit and the entry (the owner's call, 2026-10-20). Make It Ours leads to the own entry it
// writes, since the compendium entry's page is no longer the coven's; every
// other write reads the page again, so the marks and the choices follow the
// cupboard. Which choices show is the page's, from the member's permissions;
// each is only the door, and the service is the guard. Every write goes
// through /api/graphql. Make It Ours and Remove are `cupboard-writes.tsx`'s,
// shared with the Annotate dialog's More menu, which the page passes on (M8.17).
// A refusal of Make It Ours or Remove is one callout under the button that
// keeps the focus, the Edit menu's or the lone button (M12.31's design F,
// `useClickFeedback`), which floats rather than taking room beside the title;
// the two share it, since one press at a time can fail.
//
// The public entry page offers the same (M9.12), across every coven the viewer
// may write in, but for Add, which on both pages is the compendium card's plus
// (AddIcon) just before the pencil and never one of its choices (the owner's
// calls, 2026-10-20), so a coven page given no `plus` offers no Add at all.
// And each held choice while one of the covens holding the entry
// permits it, acting at once where one does and asking which where several do.
// Make It Ours and Remove ask in their own confirmation, the dropdown above the
// question; Annotate asks in a picker of its own, then opens that coven's
// `?annotate=<covenSlug>`. A coven's page is the one-place case of the same list.

// The plus (the owner's calls, 2026-10-20) stands on the coven's page too, from the page's
// `plus` (every coven the viewer may add in, and which hold the entry), so Add leaves the Edit
// menu there as well; and once every one of them holds the entry, the card's check stands in
// its place, in the same pair, rather than leave the space empty.
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

const PLAIN = 'btn btn--quiet btn--medium';

const LABEL = {
  edit: 'Edit Compendium Entry',
  annotate: 'Annotate',
  own: 'Make It Ours',
  remove: 'Remove',
} as const;

type Asking = 'remove' | 'own' | 'annotate';

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

/**
 * What the failure badge calls the button that keeps the focus: the pencil's
 * "Edit" and the entry when two or more choices share it, the lone button's own label
 * otherwise. Worked out from the same permissions as the choices, ahead of
 * them, since the hook that draws the badge is called before the choices'
 * handlers exist.
 */
function feedbackName(places: readonly CupboardPlace[], edit: boolean, name: string): string {
  const keys = (
    [
      edit && 'edit',
      placesFor.annotate(places).length > 0 && 'annotate',
      placesFor.own(places).length > 0 && 'own',
      placesFor.remove(places).length > 0 && 'remove',
    ] as const
  ).filter((key): key is keyof typeof LABEL => key !== false);
  return keys.length === 1 ? LABEL[keys[0]] : editLabel(name);
}

/** The Edit menu's name, the pencil's: the verb and the entry, as the details modal's pencil has it. */
const editLabel = (name: string): string => `Edit ${name}`;

/** The coven a confirmation starts on: the default where it may, else the first that may. */
const startOn = (places: readonly CupboardPlace[], defaultWorkspaceId: string): string =>
  (places.find(({ workspaceId }) => workspaceId === defaultWorkspaceId) ?? places[0]).workspaceId;

export default function CupboardActions(
  props: CupboardActionsProps | PublicCupboardActionsProps,
): ReactElement | null {
  const { ingredientId, compendium, edit } = props;
  const { places, defaultWorkspaceId, closeHref, opened, name, removedHref, plus } =
    normalise(props);
  // Which question is open, one at a time. The Annotate dialog is the
  // address's instead (`opened`), as the curator's Edit is.
  const [asking, setAsking] = useState<Asking>();
  // The coven Make It Ours or Remove acts in: one coven alone, or the
  // confirmation's choice where several hold the entry.
  const [target, setTarget] = useState(defaultWorkspaceId);
  const targetPlace = places.find(({ workspaceId }) => workspaceId === target) ?? places[0];
  const anyHeld = places.some(({ held }) => held);
  // The menu's button, or the one plain button: where the focus goes back to
  // once a confirmation or the dialog closes, since the menu item that opened
  // it is gone with the menu. Modal gives it there itself. Once a remove has
  // taken the entry away, the button left offers something else (the
  // plus), so it names nowhere and Modal gives the focus to the page's
  // heading, as a row's Remove does (M8.17). Read as the dialog closes, after
  // this render's layout, so the ref is the commit's own.
  const trigger = useRef<HTMLButtonElement | null>(null);
  // The callout hangs from the same button, named as the badge says it: the
  // pencil's Edit and the entry, or the lone button's own label.
  const feedback = useClickFeedback({ name: feedbackName(places, !!edit, name) });
  const { anchorRef } = feedback;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const link = useRef<HTMLAnchorElement>(null);
  const heldNow = useRef(anyHeld);
  useLayoutEffect(() => {
    heldNow.current = anyHeld;
  }, [anyHeld]);
  const back = () => (heldNow.current ? (trigger.current ?? link.current) : null);
  // The remove's confirmation stays, busy, until the re-read drops the entry
  // from its coven; it closes in that render (below), and the choice is
  // forgotten here.
  const targetHeld = targetPlace.held;
  useEffect(() => {
    if (!targetHeld) setAsking((was) => (was === 'remove' || was === 'own' ? undefined : was));
  }, [targetHeld]);
  const openEdit = useOpenModalClick(
    edit?.href ?? ('' as Route),
    editHeading(
      edit?.entry ?? { name: '', canonicalName: null, nomenclature: 'unknown' },
      EDIT_ENTRY_EYEBROW,
    ),
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
    onRefused: feedback.report,
  });

  const ask = (what: Asking, among: readonly CupboardPlace[], write?: CupboardWrite) => () => {
    feedback.report(undefined);
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

  const items: MenuButtonItem[] = [
    ...(edit ? [{ key: 'edit', label: LABEL.edit, href: edit.href, onClick: openEdit }] : []),
    ...(annotators.length === 1
      ? [{ key: 'annotate', label: LABEL.annotate, href: annotateHref, onClick: openAnnotate }]
      : annotators.length > 1
        ? [{ key: 'annotate', label: LABEL.annotate, onSelect: ask('annotate', annotators) }]
        : []),
    ...(owners.length > 0
      ? [{ key: 'own', label: LABEL.own, onSelect: ask('own', owners, writes.makeOurs) }]
      : []),
    ...(removers.length > 0
      ? [
          {
            key: 'remove',
            label: LABEL.remove,
            destructive: true,
            onSelect: ask('remove', removers, writes.remove),
          },
        ]
      : []),
  ];
  // The plus while some coven that may add lacks the entry, and the check once all hold it
  // (PlusMark), where Add is not one of the choices.
  const plusMark = plus ? <PlusMark plus={plus} ingredientId={ingredientId} /> : null;
  if (items.length === 0 && !plusMark) return null;

  // One choice is a plain button, as Add Ingredient is with one place to go.
  const only = items.length === 1 ? items[0] : undefined;
  // Icons alone, the plus and the pencil, as one pair that sits where the pencil sits.
  const icons = items.length !== 1 || only?.key === 'edit';
  const openedPlace =
    opened && places.find(({ workspaceId }) => workspaceId === opened.workspaceId);

  return (
    <div
      className={
        icons
          ? plusMark && items.length > 0
            ? 'ingredient-entry__cupboard ingredient-entry__cupboard--pencil ingredient-entry__cupboard--pair'
            : 'ingredient-entry__cupboard ingredient-entry__cupboard--pencil'
          : 'ingredient-entry__cupboard'
      }
    >
      {plusMark}
      {items.length === 0 ? null : only === undefined ? (
        <IconTip tip="Edit">
          <MenuButton
            ref={triggerRef}
            label={editLabel(name)}
            className="icon-tip__edit"
            icon={<PencilIcon />}
            items={items}
          />
        </IconTip>
      ) : only.key === 'edit' && edit ? (
        // Edit alone: the pencil still, as a link straight into the edit dialog rather than a
        // menu of one (the owner's call, 2026-10-20).
        <EditLink
          href={edit.href}
          name={name}
          heading={editHeading(edit.entry, EDIT_ENTRY_EYEBROW)}
        />
      ) : only.key === 'annotate' && only.href !== undefined ? (
        <Link ref={link} className={PLAIN} href={only.href} onClick={openAnnotate}>
          {only.label}
        </Link>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className={only.destructive ? 'btn btn--destructive btn--medium' : PLAIN}
          onClick={() => only.href === undefined && only.onSelect()}
        >
          {only.label}
        </button>
      )}
      {/* Asked in a dialog over the page, as Leave Coven asks (the owner's
          call, 2026-10-19), rather than in the title's row. */}
      {feedback.feedback}
      {asking === 'annotate' && (
        <AnnotatePicker
          places={annotators}
          defaultWorkspaceId={defaultWorkspaceId}
          onClose={settle}
          returnTo={back}
        />
      )}
      {asking === 'own' && targetPlace.held && (
        <MakeItOursDialog
          name={name}
          write={writes.makeOurs}
          onClose={settle}
          returnTo={back}
          covens={choiceOf(owners)}
        />
      )}
      {asking === 'remove' && targetPlace.held && (
        <RemoveDialog
          name={name}
          write={writes.remove}
          onClose={settle}
          returnTo={back}
          covens={choiceOf(removers)}
        />
      )}
      <AnnotateDialog
        closeHref={closeHref}
        returnTo={back}
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
