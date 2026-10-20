'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { useMutation } from '@tanstack/react-query';
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
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { editHeading } from '../CompendiumList/heading';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import { useOpenModalClick } from '../Modal';
import { AddCupboardEntryDocument } from './add-cupboard-entry';
import AnnotateDialog from './annotate-dialog';
import { MakeItOursDialog, RemoveDialog, useCupboardWrites } from './cupboard-writes';
import { ANNOTATE_HEADING } from './annotate-heading';
import EditButton from './edit-button';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import type { CupboardActionsProps } from './types';

// What a compendium entry offers a coven's member beside its title (M12.17):
// Add to Cupboard while the coven does not hold it; Annotate, Make It Ours
// (M12.23) and Remove once it does; and a curator's Edit Compendium Entry. Two or more
// share one Edit menu, the owner's call of 2026-10-19, so the title keeps its
// line; one alone is a plain button. Make It Ours leads to the own entry it
// writes, since the compendium entry's page is no longer the coven's; every
// other write reads the page again, so the marks and the choices follow the
// cupboard. Which choices show is the page's, from the member's permissions;
// each is only the door, and the service is the guard. Every write goes
// through /api/graphql. Make It Ours and Remove are `cupboard-writes.tsx`'s,
// shared with the Annotate dialog's More menu, which the page passes on (M8.17).
// A refusal of Add to Cupboard, Make It Ours or Remove is one callout under the
// button that keeps the focus, the Edit menu's or the lone button (M12.31's
// design F, `useClickFeedback`), which floats rather than taking room beside the
// title; the three share it, since one press at a time can fail.

const PLAIN = 'btn btn--quiet btn--medium';

const LABEL = {
  edit: 'Edit Compendium Entry',
  add: 'Add to Cupboard',
  annotate: 'Annotate',
  own: 'Make It Ours',
  remove: 'Remove',
} as const;

/**
 * What the failure badge calls the button that keeps the focus: the menu's
 * "Edit" when two or more choices share it, the lone button's own label
 * otherwise. Worked out from the same permissions as the choices, ahead of
 * them, since the hook that draws the badge is called before the choices'
 * handlers exist.
 */
function feedbackName(
  p: Pick<CupboardActionsProps, 'held' | 'canAdd' | 'canAnnotate' | 'canMakeOurs' | 'canRemove'> & {
    edit: boolean;
  },
): string {
  const keys = (
    [
      p.edit && 'edit',
      !p.held && p.canAdd && 'add',
      p.held && p.canAnnotate && 'annotate',
      p.held && p.canMakeOurs && 'own',
      p.held && p.canRemove && 'remove',
    ] as const
  ).filter((key): key is keyof typeof LABEL => key !== false);
  return keys.length === 1 ? LABEL[keys[0]] : 'Edit';
}

export default function CupboardActions({
  workspaceId,
  covenSlug,
  ingredientId,
  held,
  canAdd,
  canAnnotate,
  canRemove,
  canMakeOurs,
  compendium,
  overrides,
  annotate,
  removedHref,
  edit,
}: CupboardActionsProps): ReactElement | null {
  const { refresh } = usePendingNavigation();
  // Which of the two confirmations is open, one at a time. The Annotate dialog
  // is the address's instead (`annotate.opened`), as the curator's Edit is.
  const [asking, setAsking] = useState<'remove' | 'own'>();
  // The menu's button, or the one plain button: where the focus goes back to
  // once a confirmation or the dialog closes, since the menu item that opened
  // it is gone with the menu. Modal gives it there itself. Once a remove has
  // taken the entry away, the button left offers something else (Add to
  // Cupboard), so it names nowhere and Modal gives the focus to the page's
  // heading, as a row's Remove does (M8.17). Read as the dialog closes, after
  // this render's layout, so the ref is the commit's own.
  const trigger = useRef<HTMLButtonElement | null>(null);
  // The callout hangs from the same button, named as the badge says it: the
  // menu's "Edit", or the lone button's own label.
  const feedback = useClickFeedback({
    name: feedbackName({ edit: !!edit, held, canAdd, canAnnotate, canMakeOurs, canRemove }),
  });
  const { anchorRef } = feedback;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      trigger.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const link = useRef<HTMLAnchorElement>(null);
  const heldNow = useRef(held);
  useLayoutEffect(() => {
    heldNow.current = held;
  }, [held]);
  const back = () => (heldNow.current ? (trigger.current ?? link.current) : null);
  // The remove's confirmation stays, busy, until the re-read drops the entry;
  // it closes in that render (below), and the choice is forgotten here.
  useEffect(() => {
    if (!held) setAsking(undefined);
  }, [held]);
  const openEdit = useOpenModalClick(
    edit?.href ?? ('' as Route),
    editHeading(
      edit?.entry ?? { name: '', canonicalName: null, nomenclature: 'unknown' },
      EDIT_ENTRY_EYEBROW,
    ),
  );

  const openAnnotate = useOpenModalClick(annotate.href, ANNOTATE_HEADING);

  const settle = (): void => setAsking(undefined);

  // The entry as the coven calls it, for the two confirmations.
  const name = overrides.label ?? compendium.name;

  const add = useMutation({
    mutationFn: () => graphqlRequest(AddCupboardEntryDocument, { workspaceId, ingredientId }),
    onSuccess: () => {
      refresh();
      feedback.announce(`Added ${name} to your cupboard.`);
    },
    onError: (error) => feedback.report(readGraphqlFailure(error).alert),
  });
  // Make It Ours and Remove, shared with the Annotate dialog's More menu.
  const writes = useCupboardWrites({
    workspaceId,
    covenSlug,
    ingredientId,
    removedHref,
    onSettle: settle,
    onRefused: feedback.report,
  });

  const ask = (what: 'remove' | 'own') => () => {
    feedback.report(undefined);
    setAsking(what);
  };
  const items: MenuButtonItem[] = [
    ...(edit ? [{ key: 'edit', label: LABEL.edit, href: edit.href, onClick: openEdit }] : []),
    ...(!held && canAdd
      ? [
          {
            key: 'add',
            label: LABEL.add,
            constructive: true,
            onSelect: () => {
              feedback.report(undefined);
              add.mutate();
            },
          },
        ]
      : []),
    ...(held && canAnnotate
      ? [{ key: 'annotate', label: LABEL.annotate, href: annotate.href, onClick: openAnnotate }]
      : []),
    ...(held && canMakeOurs ? [{ key: 'own', label: LABEL.own, onSelect: ask('own') }] : []),
    ...(held && canRemove
      ? [{ key: 'remove', label: LABEL.remove, destructive: true, onSelect: ask('remove') }]
      : []),
  ];
  if (items.length === 0) return null;

  // One choice is a plain button, as Add Ingredient is with one place to go.
  const only = items.length === 1 ? items[0] : undefined;

  return (
    <div className="ingredient-entry__cupboard">
      {only === undefined ? (
        <MenuButton
          ref={triggerRef}
          label="Edit"
          className={PLAIN}
          items={items}
          busy={add.isPending}
          busyLabel="Adding"
        />
      ) : only.key === 'edit' && edit ? (
        <EditButton href={edit.href} entry={edit.entry} />
      ) : only.key === 'add' ? (
        <BusyButton
          ref={triggerRef}
          className="btn btn--solid btn--medium"
          busy={add.isPending}
          busyLabel="Adding"
          disabled={add.isPending}
          onClick={() => only.href === undefined && only.onSelect()}
        >
          {only.label}
        </BusyButton>
      ) : only.key === 'annotate' ? (
        <Link ref={link} className={PLAIN} href={annotate.href} onClick={openAnnotate}>
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
      {asking === 'own' && (
        <MakeItOursDialog name={name} write={writes.makeOurs} onClose={settle} returnTo={back} />
      )}
      {asking === 'remove' && held && (
        <RemoveDialog name={name} write={writes.remove} onClose={settle} returnTo={back} />
      )}
      <AnnotateDialog
        closeHref={annotate.closeHref}
        returnTo={back}
        opened={annotate.opened ? { workspaceId, ingredientId, compendium, overrides } : undefined}
        more={{ covenSlug, canMakeOurs, canRemove, removedHref }}
      />
    </div>
  );
}
