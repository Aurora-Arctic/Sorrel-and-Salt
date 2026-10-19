'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import BusyButton from '../BusyButton';
import Modal from '../Modal';
import { UNSAVED_CHANGES_NOT_KEPT } from './link-confirm';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import type {
  CupboardQuestionProps,
  CupboardWritesOptions,
  CupboardWrites,
  MakeItOursDialogProps,
} from './types';

// Make It Ours (M12.23) and Remove (M12.17), the two writes a coven's member
// makes to a compendium entry it holds, shared by the entry page's Edit menu
// and the Annotate dialog's More menu (M8.17), so the two ask the same
// question, in the same confirmation dialog, and land in the same place. The
// Annotate dialog opens it over itself, a dialog inside a dialog, as the owner
// asked on 2026-10-19 (Modal answers only its own Escape).

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

/** Make It Ours's question, naming the entry as the coven calls it. */
export function MakeItOursQuestion({ name }: { name: string }): ReactElement {
  return (
    <>
      Make <strong>{name}</strong> your coven's own?
    </>
  );
}

/** What Make It Ours changes, beneath its question. */
export const MAKE_IT_OURS_DETAILS =
  "You get a copy with your annotations. Your jars and spells move to the copy. Updates in the Compendium won't affect it.";

/** Remove's question, which says what goes with the entry. */
export function RemoveQuestion({ name }: { name: string }): ReactElement {
  return (
    <>
      Remove <strong>{name}</strong> from your cupboard? Your annotations get deleted too.
    </>
  );
}

/**
 * Make It Ours asked in a dialog, as Leave Coven asks (the owner's call,
 * 2026-10-19). Over the Annotate form with unsaved changes it adds Link to the
 * Compendium's sentence: the copy takes the saved annotations alone.
 */
export function MakeItOursDialog({
  name,
  write,
  unsaved = false,
  onClose,
  returnTo,
}: MakeItOursDialogProps): ReactElement {
  return (
    <Modal title="Make It Ours" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <>
          <p>
            <MakeItOursQuestion name={name} />
          </p>
          <p>{MAKE_IT_OURS_DETAILS}</p>
          {unsaved && <p>{UNSAVED_CHANGES_NOT_KEPT}</p>}
          <div className="modal__actions">
            <BusyButton
              className="btn btn--solid"
              busy={write.pending}
              busyLabel="Making It Ours"
              disabled={write.pending}
              onClick={write.run}
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
        </>
      )}
    </Modal>
  );
}

/** Remove asked in a dialog, the same way. */
export function RemoveDialog({
  name,
  write,
  onClose,
  returnTo,
}: CupboardQuestionProps): ReactElement {
  return (
    <Modal title="Remove from Cupboard" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <>
          <p>
            <RemoveQuestion name={name} />
          </p>
          <div className="modal__actions">
            <BusyButton
              className="btn btn--destructive"
              busy={write.pending}
              busyLabel="Removing"
              disabled={write.pending}
              onClick={write.run}
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
        </>
      )}
    </Modal>
  );
}

/**
 * The two writes, with what follows each: a remove leads to `removedHref`,
 * replacing the history entry so Back does not return to what is gone, or
 * reads the page again where there is none; Make It Ours leads to the own entry
 * it wrote. Either way the question closes first (`onSettle`), and a refusal,
 * which names its remedy, goes to `onRefused` as the service wrote it.
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
      // The page stays mounted as it reads again, so the question has to close.
      onSettle();
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
    remove: { run: () => remove.mutate(), pending: remove.isPending },
    makeOurs: { run: () => makeOurs.mutate(), pending: makeOurs.isPending },
  };
}
