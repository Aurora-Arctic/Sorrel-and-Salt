'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import type { CupboardWritesOptions, CupboardWrites } from './types';

// Make It Ours (M12.23) and Remove (M12.17), the two writes a coven's member
// makes to a compendium entry it holds, shared by the entry page's Edit menu
// and the Annotate dialog's More menu (M8.17), so the two ask the same
// question and land in the same place. Each caller draws the question its own
// way: the page in a modal over itself, the dialog as a question over its form,
// since a second native dialog inside the first would take its Escape.

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
