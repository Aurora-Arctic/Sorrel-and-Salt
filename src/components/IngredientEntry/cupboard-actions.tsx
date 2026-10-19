'use client';

import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import CupboardEntryForm from '../CupboardEntryForm';
import { editHeading } from '../CompendiumList/heading';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import Modal, { RouteModal, useOpenModalClick } from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import Notice from '../Notice';
import { ANNOTATE_HEADING } from './annotate-heading';
import EditButton from './edit-button';
import type { CupboardActionsProps } from './types';

// What a compendium entry offers a coven's member beside its title (M12.17):
// Add to Cupboard while the coven does not hold it; Annotate, Make It Ours
// (M12.23) and Remove once it does; and a curator's Edit Entry. Two or more
// share one Edit menu, the owner's call of 2026-10-19, so the title keeps its
// line; one alone is a plain button. Make It Ours leads to the own entry it
// writes, since the compendium entry's page is no longer the coven's; every
// other write reads the page again, so the marks and the choices follow the
// cupboard. Which choices show is the page's, from the member's permissions;
// each is only the door, and the service is the guard. Every write goes
// through /api/graphql.

const AddCupboardEntryDocument = graphql(`
  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {
      id
    }
  }
`);

const RemoveCupboardEntryDocument = graphql(`
  mutation RemoveCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
    removeCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId)
  }
`);

const MakeItOursDocument = graphql(`
  mutation MakeItOurs($workspaceId: ID!, $ingredientId: ID!) {
    convertCompendiumEntryToLocal(workspaceId: $workspaceId, ingredientId: $ingredientId) {
      entry {
        id
      }
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
  edit,
}: CupboardActionsProps): ReactElement | null {
  const router = useRouter();
  const [alert, setAlert] = useState<string>();
  // Which of the two questions is open, one at a time. The Annotate dialog is
  // the address's instead (`annotate.opened`), as the curator's Edit is.
  const [asking, setAsking] = useState<'remove' | 'own'>();
  // The menu's button, or the one plain button: where the focus goes back to
  // once a question is cancelled or the dialog closes, since what took it is gone.
  const trigger = useRef<HTMLButtonElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const returning = useRef(false);
  const openEdit = useOpenModalClick(
    edit?.href ?? ('' as Route),
    editHeading(edit?.entry ?? { name: '', canonicalName: null, nomenclature: 'unknown' }),
  );

  const openAnnotate = useOpenModalClick(annotate.href, ANNOTATE_HEADING);

  useEffect(() => {
    if (asking === undefined && returning.current) {
      returning.current = false;
      (trigger.current ?? link.current)?.focus();
    }
  }, [asking]);

  // The Annotate dialog closes by the address dropping `?annotate`, so the
  // focus goes back once `opened` turns off, not when a question clears.
  const wasOpened = useRef(annotate.opened);
  useEffect(() => {
    if (wasOpened.current && !annotate.opened) (trigger.current ?? link.current)?.focus();
    wasOpened.current = annotate.opened;
  }, [annotate.opened]);

  // Edit's press shows its skeleton here too; this place leaves that one to it.
  const loading = useRouteModalOpener()?.loading;
  const annotating = annotate.opened || loading?.title === ANNOTATE_HEADING.title;

  const settle = (): void => {
    returning.current = true;
    setAsking(undefined);
  };

  const add = useMutation({
    mutationFn: () => graphqlRequest(AddCupboardEntryDocument, { workspaceId, ingredientId }),
    onSuccess: () => router.refresh(),
    onError: (error) => setAlert(readGraphqlFailure(error).alert),
  });
  const remove = useMutation({
    mutationFn: () => graphqlRequest(RemoveCupboardEntryDocument, { workspaceId, ingredientId }),
    onSuccess: () => router.refresh(),
    onError: (error) => {
      // The jar refusal names its remedy, so it is shown as the service wrote it.
      settle();
      setAlert(readGraphqlFailure(error).alert);
    },
  });
  const makeOurs = useMutation({
    mutationFn: () => graphqlRequest(MakeItOursDocument, { workspaceId, ingredientId }),
    onSuccess: ({ convertCompendiumEntryToLocal: { entry } }) =>
      router.push(`/coven/${covenSlug}/ingredients/${entry.id}` as Route),
    onError: (error) => {
      // A refusal names the own entry in the way, so it is shown as the service wrote it.
      settle();
      setAlert(readGraphqlFailure(error).alert);
    },
  });

  // The entry as the coven calls it, for the two questions.
  const name = overrides.label ?? compendium.name;
  const ask = (what: 'remove' | 'own') => () => {
    setAlert(undefined);
    setAsking(what);
  };
  const items: MenuButtonItem[] = [
    ...(edit ? [{ key: 'edit', label: 'Edit Entry', href: edit.href, onClick: openEdit }] : []),
    ...(!held && canAdd
      ? [
          {
            key: 'add',
            label: 'Add to Cupboard',
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
        <Modal title="Make It Ours" onClose={settle}>
          {(close) => (
            <>
              <p>
                Make <strong>{name}</strong> your coven's own?
              </p>
              <p>
                You get a copy with your annotations. Your jars and spells move to the copy. Updates
                in the Compendium won't affect it.
              </p>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--solid"
                  busy={makeOurs.isPending}
                  busyLabel="Making It Ours"
                  disabled={makeOurs.isPending}
                  onClick={() => makeOurs.mutate()}
                >
                  Make It Ours
                </BusyButton>
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={makeOurs.isPending}
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
        <Modal title="Remove from Cupboard" onClose={settle}>
          {(close) => (
            <>
              <p>
                Remove <strong>{name}</strong> from your cupboard? Your annotations get deleted too.
              </p>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--destructive"
                  busy={remove.isPending}
                  busyLabel="Removing"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Remove
                </BusyButton>
                <button
                  type="button"
                  className="btn btn--quiet"
                  disabled={remove.isPending}
                  onClick={close}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
      {annotating && (
        <RouteModal
          closeHref={annotate.closeHref}
          content={
            annotate.opened
              ? {
                  heading: ANNOTATE_HEADING,
                  body: (done) => (
                    <CupboardEntryForm
                      workspaceId={workspaceId}
                      ingredientId={ingredientId}
                      compendium={compendium}
                      overrides={overrides}
                      onDone={done}
                    />
                  ),
                }
              : undefined
          }
        />
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
    </div>
  );
}
