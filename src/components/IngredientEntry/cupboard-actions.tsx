'use client';

import { useMutation } from '@tanstack/react-query';
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

// The three buttons a compendium entry offers a coven's member beside its
// title (M12.17): Add to Cupboard while the coven does not hold it; Annotate
// This Entry and Remove from Cupboard once it does. Which buttons show is the
// page's, from the member's permissions; each is only the door, and the
// service is the guard. Each write goes through /api/graphql and then reads
// the page again, so the marks and the buttons follow the cupboard.

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

export default function CupboardActions({
  workspaceId,
  ingredientId,
  held,
  canAdd,
  canAnnotate,
  canRemove,
  compendium,
  overrides,
}: CupboardActionsProps): ReactElement | null {
  const router = useRouter();
  const [alert, setAlert] = useState<string>();
  const [asking, setAsking] = useState(false);

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
      setAsking(false);
      setAlert(readGraphqlFailure(error).alert);
    },
  });

  if (!held && !canAdd) return null;
  if (held && !canAnnotate && !canRemove) return null;

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
      {held && canRemove && !asking && (
        <button
          type="button"
          className="btn btn--destructive btn--medium"
          onClick={() => {
            setAlert(undefined);
            setAsking(true);
          }}
        >
          Remove from Cupboard
        </button>
      )}
      {held && canRemove && asking && (
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
            onClick={() => setAsking(false)}
          >
            Keep It
          </button>
        </span>
      )}
      {alert && <Notice kind="error">{alert}</Notice>}
    </div>
  );
}
