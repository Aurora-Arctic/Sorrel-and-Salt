'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useContext, useState } from 'react';
import { graphql } from '../../gql';
import type { PromoteFolkNameMutation } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { ConfirmQuestion } from '../Modal';
import { DiscardAskingContext } from './remove-question';

// Making a folk name the ingredient's display name: the mutation, the hook that sends it and the
// question that always comes first, for either tier. The swap is the server's, in one transaction
// (claude-docs/components/ingredient-form.md, "Promoting a folk name").

const PromoteFolkNameDocument = graphql(`
  mutation PromoteFolkName($workspaceId: ID, $id: ID!, $folkNameId: ID!) {
    promoteFolkName(workspaceId: $workspaceId, id: $id, folkNameId: $folkNameId) {
      id
      name
      slug
      folkNames {
        id
        name
      }
    }
  }
`);

export type PromotedIngredient = PromoteFolkNameMutation['promoteFolkName'];

export interface PromotedName {
  id: string;
  value: string;
}

export function usePromoteFolkName(workspaceId: string | null, ingredientId: string) {
  return useMutation({
    mutationFn: async (folkNameId: string): Promise<PromotedIngredient> =>
      (
        await graphqlRequest(PromoteFolkNameDocument, {
          workspaceId,
          id: ingredientId,
          folkNameId,
        })
      ).promoteFolkName,
  });
}

export type Promotion = ReturnType<typeof usePromoteFolkName>;

export interface PromoteFolkNameQuestionProps {
  promotion: Promotion;
  folkName: PromotedName | null;
  displayName: string;
  tier: 'compendium' | 'coven';
  dirty: boolean;
  /** Saves the form's changes, true if they landed. On false the form has shown why and
   * closed the question. */
  saveFirst: () => Promise<boolean>;
  discardFirst: () => void;
  onPromoted: (ingredient: PromotedIngredient) => void;
  onKeep: () => void;
  /** The server refused: its first sentence, for the form's alert; the form closes the
   * question. */
  onRefused: (message: string) => void;
}

type Step = 'confirm' | 'also' | null;

export function PromoteFolkNameQuestion({
  promotion,
  folkName,
  displayName,
  tier,
  dirty,
  saveFirst,
  discardFirst,
  onPromoted,
  onKeep,
  onRefused,
}: PromoteFolkNameQuestionProps): ReactElement | null {
  const discardAsking = useContext(DiscardAskingContext);
  const [step, setStep] = useState<Step>(null);

  const promote = async (): Promise<void> => {
    if (!folkName) return;
    onPromoted(await promotion.mutateAsync(folkName.id));
  };
  const running = async (which: Exclude<Step, null>, action: () => Promise<void>) => {
    setStep(which);
    try {
      await action();
    } finally {
      setStep(null);
    }
  };

  return (
    <ConfirmQuestion
      asked={folkName !== null && !discardAsking}
      question={
        <span className="promote-question__title">Make this folk name the display name?</span>
      }
      details={
        <>
          <dl className="promote-question__swap">
            <div>
              <dt>New Display Name</dt>
              <dd>{folkName?.value}</dd>
            </div>
            <div>
              <dt>Becomes a Folk Name</dt>
              <dd>{displayName}</dd>
            </div>
          </dl>
          {tier === 'compendium' && (
            <p className="promote-question__aside">Every coven sees the change at once.</p>
          )}
          {dirty && (
            <p className="promote-question__unsaved">
              You have other unsaved changes. Save them, or discard them?
            </p>
          )}
        </>
      }
      tone="solid"
      confirmLabel={dirty ? 'Save & Promote' : 'Promote'}
      busyLabel="Promoting"
      busy={step === 'confirm'}
      onConfirm={() =>
        running('confirm', async () => {
          if (dirty && !(await saveFirst())) return;
          await promote();
        })
      }
      also={
        dirty
          ? {
              label: 'Discard & Promote',
              busyLabel: 'Promoting',
              busy: step === 'also',
              onClick: () =>
                running('also', async () => {
                  discardFirst();
                  await promote();
                }),
            }
          : undefined
      }
      onKeep={onKeep}
      onRefused={onRefused}
    />
  );
}
