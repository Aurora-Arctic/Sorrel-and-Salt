'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactElement, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { editHeading } from '../CompendiumList/heading';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import Modal, { useOpenModalClick } from '../Modal';
import Notice from '../Notice';
import AnnotateDialog from './annotate-dialog';
import {
  MAKE_IT_OURS_DETAILS,
  MakeItOursQuestion,
  RemoveQuestion,
  useCupboardWrites,
} from './cupboard-writes';
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

const AddCupboardEntryDocument = graphql(`
  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {
      id
    }
  }
`);

const PLAIN = 'btn btn--quiet btn--medium';

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
  const [alert, setAlert] = useState<string>();
  // Which of the two questions is open, one at a time. The Annotate dialog is
  // the address's instead (`annotate.opened`), as the curator's Edit is.
  const [asking, setAsking] = useState<'remove' | 'own'>();
  // The menu's button, or the one plain button: where the focus goes back to
  // once a question or the dialog closes, since the menu item that opened it
  // is gone with the menu. Modal gives it there itself.
  const trigger = useRef<HTMLButtonElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const back = () => trigger.current ?? link.current;
  const openEdit = useOpenModalClick(
    edit?.href ?? ('' as Route),
    editHeading(
      edit?.entry ?? { name: '', canonicalName: null, nomenclature: 'unknown' },
      EDIT_ENTRY_EYEBROW,
    ),
  );

  const openAnnotate = useOpenModalClick(annotate.href, ANNOTATE_HEADING);

  const settle = (): void => setAsking(undefined);

  const add = useMutation({
    mutationFn: () => graphqlRequest(AddCupboardEntryDocument, { workspaceId, ingredientId }),
    onSuccess: () => refresh(),
    onError: (error) => setAlert(readGraphqlFailure(error).alert),
  });
  // Make It Ours and Remove, shared with the Annotate dialog's More menu.
  const writes = useCupboardWrites({
    workspaceId,
    covenSlug,
    ingredientId,
    removedHref,
    onSettle: settle,
    onRefused: setAlert,
  });

  // The entry as the coven calls it, for the two questions.
  const name = overrides.label ?? compendium.name;
  const ask = (what: 'remove' | 'own') => () => {
    setAlert(undefined);
    setAsking(what);
  };
  const items: MenuButtonItem[] = [
    ...(edit
      ? [{ key: 'edit', label: 'Edit Compendium Entry', href: edit.href, onClick: openEdit }]
      : []),
    ...(!held && canAdd
      ? [
          {
            key: 'add',
            label: 'Add to Cupboard',
            constructive: true,
            onSelect: () => {
              setAlert(undefined);
              add.mutate();
            },
          },
        ]
      : []),
    ...(held && canAnnotate
      ? [{ key: 'annotate', label: 'Annotate', href: annotate.href, onClick: openAnnotate }]
      : []),
    ...(held && canMakeOurs ? [{ key: 'own', label: 'Make It Ours', onSelect: ask('own') }] : []),
    ...(held && canRemove
      ? [{ key: 'remove', label: 'Remove', destructive: true, onSelect: ask('remove') }]
      : []),
  ];
  if (items.length === 0) return null;

  // One choice is a plain button, as Add Ingredient is with one place to go.
  const only = items.length === 1 ? items[0] : undefined;

  return (
    <div className="ingredient-entry__cupboard">
      {only === undefined ? (
        <MenuButton
          ref={trigger}
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
          ref={trigger}
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
          ref={trigger}
          type="button"
          className={only.destructive ? 'btn btn--destructive btn--medium' : PLAIN}
          onClick={() => only.href === undefined && only.onSelect()}
        >
          {only.label}
        </button>
      )}
      {asking === 'own' && (
        // Asked in a modal over the page, as Leave Coven asks (the owner's
        // call, 2026-10-19), rather than in the title's row.
        <Modal title="Make It Ours" onClose={settle} returnTo={back}>
          {(close) => (
            <>
              <p>
                <MakeItOursQuestion name={name} />
              </p>
              <p>{MAKE_IT_OURS_DETAILS}</p>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--solid"
                  busy={writes.makeOurs.pending}
                  busyLabel="Making It Ours"
                  disabled={writes.makeOurs.pending}
                  onClick={() => writes.makeOurs.run()}
                >
                  Make It Ours
                </BusyButton>
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={writes.makeOurs.pending}
                  onClick={close}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
      {asking === 'remove' && (
        <Modal title="Remove from Cupboard" onClose={settle} returnTo={back}>
          {(close) => (
            <>
              <p>
                <RemoveQuestion name={name} />
              </p>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--destructive"
                  busy={writes.remove.pending}
                  busyLabel="Removing"
                  disabled={writes.remove.pending}
                  onClick={() => writes.remove.run()}
                >
                  Remove
                </BusyButton>
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={writes.remove.pending}
                  onClick={close}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
      <AnnotateDialog
        closeHref={annotate.closeHref}
        returnTo={back}
        opened={annotate.opened ? { workspaceId, ingredientId, compendium, overrides } : undefined}
        more={{ covenSlug, canMakeOurs, canRemove, removedHref }}
      />
      {alert && <Notice kind="error">{alert}</Notice>}
    </div>
  );
}
