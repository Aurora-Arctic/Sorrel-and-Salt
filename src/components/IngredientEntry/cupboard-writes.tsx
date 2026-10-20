'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import BusyButton from '../BusyButton';
import Modal from '../Modal';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import CovenChoice from './coven-choice';
import type { CupboardQuestionProps, CupboardWritesOptions, CupboardWrites } from './types';

// Make It Ours (M12.23) and Remove (M12.17), the two writes a coven's member
// makes to a compendium entry it holds, shared by the entry page's Edit menu
// and the Annotate dialog's More menu (M8.17), so the two ask the same
// confirmation and land in the same place. The entry page asks in a dialog; the
// Annotate dialog asks in its form's own confirmation card, as its Delete and Link
// do, rather than a dialog inside a dialog (the owner's call, 2026-10-20).

/**
 * The Annotate dialog's menu of further cupboard writes. "More", the owner's
 * call of 2026-10-19: the dialog's foot already says Save and Cancel, and the
 * entry page's "Edit" would name the dialog itself.
 */
export const CUPBOARD_MENU_LABEL = 'More';

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

/** Make It Ours's confirmation, naming the entry as the coven calls it. */
export function MakeItOursQuestion({ name }: { name: string }): ReactElement {
  return (
    <>
      Make <strong>{name}</strong> your coven's own?
    </>
  );
}

/** What Make It Ours changes, beneath its confirmation. */
export const MAKE_IT_OURS_DETAILS =
  "You get a copy with your annotations. Your jars and spells move to the copy. Updates in the Compendium won't affect it.";

/** Remove's confirmation, which says what goes with the entry. */
export function RemoveQuestion({ name }: { name: string }): ReactElement {
  return (
    <>
      Remove <strong>{name}</strong> from your cupboard? Your annotations get deleted too.
    </>
  );
}

/**
 * Make It Ours asked in a dialog, as Leave Coven asks (the owner's call,
 * 2026-10-19), on the entry page. With `covens`, the dialog first asks which
 * coven, in the dropdown Add's picker uses, above the question (M9.12), inside
 * the `.form` stack that spaces the picker's field.
 */
export function MakeItOursDialog({
  name,
  write,
  onClose,
  returnTo,
  covens,
}: CupboardQuestionProps): ReactElement {
  return (
    <Modal title="Make It Ours" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <div className={covens ? 'form' : undefined}>
          {covens && <CovenChoice {...covens} />}
          <p>
            <MakeItOursQuestion name={name} />
          </p>
          <p>{MAKE_IT_OURS_DETAILS}</p>
          <div className="modal__actions">
            <BusyButton
              className="btn btn--solid"
              busy={write.pending}
              busyLabel="Making It Ours"
              disabled={write.pending}
              onClick={() => write.run()}
            >
              Make It Ours
            </BusyButton>
            <button
              type="button"
              className="btn btn--quiet"
              disabled={write.pending}
              onClick={close}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Remove asked in a dialog, the same way, asking which coven the same way too. */
export function RemoveDialog({
  name,
  write,
  onClose,
  returnTo,
  covens,
}: CupboardQuestionProps): ReactElement {
  return (
    <Modal title="Remove from Cupboard" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <div className={covens ? 'form' : undefined}>
          {covens && <CovenChoice {...covens} />}
          <p>
            <RemoveQuestion name={name} />
          </p>
          <div className="modal__actions">
            <BusyButton
              className="btn btn--destructive"
              busy={write.pending}
              busyLabel="Removing"
              disabled={write.pending}
              onClick={() => write.run()}
            >
              Remove
            </BusyButton>
            <button
              type="button"
              className="btn btn--quiet"
              disabled={write.pending}
              onClick={close}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * The two writes, with what follows each: a remove leads to `removedHref`,
 * replacing the history entry so Back does not return to what is gone; where
 * there is none it reads the page again. Either way it stays busy, as
 * ConfirmedAction does, and its confirmation closes with what the remove
 * changed (the page it leaves, or the re-read that says the coven no longer
 * holds the entry), so the focus goes to the heading of the page then showing
 * in that one step. Closed before, it would give the focus to Edit, which the
 * change then takes away with it. Make It Ours
 * leads to the own entry it wrote. A refusal, which names its remedy, closes
 * the confirmation and goes to `onRefused` as the service wrote it.
 */
export function useCupboardWrites({
  workspaceId,
  covenSlug,
  ingredientId,
  removedHref,
  onSettle,
  onRefused,
}: CupboardWritesOptions): CupboardWrites {
  const { navigate, refresh } = usePendingNavigation();
  const refused = (error: unknown): void => {
    onSettle();
    onRefused(readGraphqlFailure(error).alert ?? GENERIC_FAILURE);
  };
  const remove = useMutation({
    mutationFn: () => graphqlRequest(RemoveCupboardEntryDocument, { workspaceId, ingredientId }),
    onSuccess: () => {
      if (removedHref) navigate(removedHref, { replace: true });
      else refresh();
    },
    onError: refused,
  });
  const makeOurs = useMutation({
    mutationFn: () => graphqlRequest(MakeItOursDocument, { workspaceId, ingredientId }),
    onSuccess: ({ convertCompendiumEntryToLocal: { entry } }) => {
      const href = `/coven/${covenSlug}/ingredients/${entry.id}`;
      navigate(href as Route, { target: ingredientLinkTarget(href) });
    },
    onError: refused,
  });
  return {
    remove: {
      run: () => remove.mutate(),
      // Busy past the write too, until the page it changed arrives (above).
      pending: remove.isPending || remove.isSuccess,
      reset: remove.reset,
    },
    makeOurs: { run: () => makeOurs.mutate(), pending: makeOurs.isPending, reset: makeOurs.reset },
  };
}
