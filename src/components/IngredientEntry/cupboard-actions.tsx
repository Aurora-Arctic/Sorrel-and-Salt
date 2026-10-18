'use client';

import { useMutation } from '@tanstack/react-query';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import CupboardEntryForm from '../CupboardEntryForm';
import { ModalButton } from '../Modal';
import Notice from '../Notice';
import type { CupboardActionsProps } from './types';

// The buttons a compendium entry offers a coven's member beside its title
// (M12.17): Add to Cupboard while the coven does not hold it; Annotate This
// Entry, Remove from Cupboard and Make It Ours (M12.23) once it does. Make It
// Ours leads to the own entry it writes, since the compendium entry's page is
// no longer the coven's; every other write reads the page again, so the marks
// and the buttons follow the cupboard. Which buttons show is the page's, from
// the member's permissions; each is only the door, and the service is the
// guard. Every write goes through /api/graphql.

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
}: CupboardActionsProps): ReactElement | null {
  const router = useRouter();
  const [alert, setAlert] = useState<string>();
  // Which of the two confirms is open: one asks at a time.
  const [asking, setAsking] = useState<'remove' | 'own'>();

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
      setAsking(undefined);
      setAlert(readGraphqlFailure(error).alert);
    },
  });
  const makeOurs = useMutation({
    mutationFn: () => graphqlRequest(MakeItOursDocument, { workspaceId, ingredientId }),
    onSuccess: ({ convertCompendiumEntryToLocal: { entry } }) =>
      router.push(`/coven/${covenSlug}/ingredients/${entry.id}` as Route),
    onError: (error) => {
      // A refusal names the own entry in the way, so it is shown as the service wrote it.
      setAsking(undefined);
      setAlert(readGraphqlFailure(error).alert);
    },
  });

  if (!held && !canAdd) return null;
  if (held && !canAnnotate && !canRemove && !canMakeOurs) return null;

  return (
    <div className="ingredient-entry__cupboard">
      {!held && (
        <BusyButton
          className="btn btn--solid btn--medium"
          busy={add.isPending}
          busyLabel="Adding"
          disabled={add.isPending}
          onClick={() => {
            setAlert(undefined);
            add.mutate();
          }}
        >
          Add to Cupboard
        </BusyButton>
      )}
      {held && canAnnotate && (
        <ModalButton
          label="Annotate This Entry"
          className="btn btn--quiet btn--medium"
          title="Annotate This Entry"
        >
          {(close) => (
            <CupboardEntryForm
              workspaceId={workspaceId}
              ingredientId={ingredientId}
              compendium={compendium}
              overrides={overrides}
              onDone={close}
            />
          )}
        </ModalButton>
      )}
      {held && canMakeOurs && asking !== 'own' && (
        <button
          type="button"
          className="btn btn--quiet btn--medium"
          onClick={() => {
            setAlert(undefined);
            setAsking('own');
          }}
        >
          Make It Ours
        </button>
      )}
      {held && canMakeOurs && asking === 'own' && (
        <span role="group" aria-label="Make It Ours" className="ingredient-entry__ask">
          <span>
            Make this entry your coven's own? It takes a copy of the compendium's entry with your
            annotations, and your jars and spells move to it. Later compendium changes no longer
            reach it.
          </span>
          <BusyButton
            className="btn btn--solid btn--medium"
            busy={makeOurs.isPending}
            busyLabel="Making It Ours"
            disabled={makeOurs.isPending}
            onClick={() => makeOurs.mutate()}
          >
            Make It Ours
          </BusyButton>
          <button
            type="button"
            className="btn btn--quiet btn--medium"
            disabled={makeOurs.isPending}
            onClick={() => setAsking(undefined)}
          >
            Cancel
          </button>
        </span>
      )}
      {held && canRemove && asking !== 'remove' && (
        <button
          type="button"
          className="btn btn--destructive btn--medium"
          onClick={() => {
            setAlert(undefined);
            setAsking('remove');
          }}
        >
          Remove from Cupboard
        </button>
      )}
      {held && canRemove && asking === 'remove' && (
        <span role="group" aria-label="Remove from Cupboard" className="ingredient-entry__ask">
          <span>Remove this entry from your cupboard? Your annotations go with it.</span>
          <BusyButton
            className="btn btn--destructive btn--medium"
            busy={remove.isPending}
            busyLabel="Removing"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Remove
          </BusyButton>
          <button
            type="button"
            className="btn btn--quiet btn--medium"
            disabled={remove.isPending}
            onClick={() => setAsking(undefined)}
          >
            Cancel
          </button>
        </span>
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
    </div>
  );
}
