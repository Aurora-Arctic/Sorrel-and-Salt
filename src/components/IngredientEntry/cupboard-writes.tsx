'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import ConfirmDialog from '../ConfirmDialog';
import { graphqlRequest, useRefusableMutation } from '../../lib/graphql-client';
import { failureMessage } from '../../lib/graphql-failure';
import CovenChoice from './lazy-coven-choice';
import type { CupboardQuestionProps, CupboardWritesOptions, CupboardWrites } from './types';
import { covenPath } from '@/lib/coven-path';

// Make It Ours and Remove, the two writes a coven's member makes to a compendium entry it holds,
// shared by the entry page and the Annotate dialog so the two ask the same confirmation and land in
// the same place (claude-docs/components/ingredient-entry.md, "What the cupboard actions draw").

/** The Annotate dialog's menu of further cupboard writes, named "More" because its foot already says Save and Cancel (claude-docs/components/ingredient-entry.md, "What the cupboard actions draw"). */
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

export function MakeItOursQuestion({ name }: { name: string }): ReactElement {
  return (
    <>
      Make <strong>{name}</strong> your coven's own?
    </>
  );
}

export const MAKE_IT_OURS_DETAILS =
  "You get a copy with your annotations. Your jars and spells move to the copy. Updates in the Compendium won't affect it.";

export function RemoveFromCupboardQuestion({ name }: { name: string }): ReactElement {
  return (
    <>
      Remove <strong>{name}</strong> from your cupboard? Your annotations get deleted too.
    </>
  );
}

export function MakeItOursDialog({
  name,
  write,
  onClose,
  returnTo,
  covens,
}: CupboardQuestionProps): ReactElement {
  return (
    <ConfirmDialog
      title="Make It Ours"
      question={<MakeItOursQuestion name={name} />}
      confirmLabel="Make It Ours"
      busyLabel="Making It Ours"
      busy={write.pending}
      tone="solid"
      onConfirm={() => write.run()}
      onClose={onClose}
      returnTo={returnTo}
    >
      {covens && (
        <div className="form">
          <CovenChoice {...covens} />
        </div>
      )}
      <p>{MAKE_IT_OURS_DETAILS}</p>
    </ConfirmDialog>
  );
}

export function RemoveDialog({
  name,
  write,
  onClose,
  returnTo,
  covens,
}: CupboardQuestionProps): ReactElement {
  return (
    <ConfirmDialog
      title="Remove from Cupboard"
      question={<RemoveFromCupboardQuestion name={name} />}
      confirmLabel="Remove"
      busyLabel="Removing"
      busy={write.pending}
      onConfirm={() => write.run()}
      onClose={onClose}
      returnTo={returnTo}
    >
      {covens && (
        <div className="form">
          <CovenChoice {...covens} />
        </div>
      )}
    </ConfirmDialog>
  );
}

/** The two writes with what follows each: a remove leads to `removedHref` or reads the page again, a refusal goes to `onRefused` (claude-docs/components/ingredient-entry.md, "What the cupboard actions draw"). */
export function useCupboardWrites({
  workspaceId,
  covenSlug,
  ingredientId,
  removedHref,
  onSettle,
  onRefused,
}: CupboardWritesOptions): CupboardWrites {
  const { navigate, refresh } = usePendingNavigation();
  const refused = (message: string): void => {
    onSettle();
    onRefused(message);
  };
  const remove = useRefusableMutation({
    request: () => graphqlRequest(RemoveCupboardEntryDocument, { workspaceId, ingredientId }),
    onDone: () => {
      if (removedHref) navigate(removedHref, { replace: true });
      else refresh();
    },
    onRefused: refused,
  });
  const makeOurs = useMutation({
    mutationFn: () => graphqlRequest(MakeItOursDocument, { workspaceId, ingredientId }),
    onSuccess: ({ convertCompendiumEntryToLocal: { entry } }) => {
      const href = covenPath(covenSlug, 'ingredients', entry.id);
      navigate(href as Route);
    },
    onError: (error) => refused(failureMessage(error)),
  });
  return {
    remove: {
      run: () => remove.run(),
      pending: remove.pending,
      reset: remove.reset,
    },
    makeOurs: { run: () => makeOurs.mutate(), pending: makeOurs.isPending, reset: makeOurs.reset },
  };
}
