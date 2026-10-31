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

/** What a promotion answers: the ingredient with its new name, and every folk name it now holds. */
export type PromotedIngredient = PromoteFolkNameMutation['promoteFolkName'];

/** The folk name a question asks about: its saved row's id, and the text on its chip. */
export interface PromotedName {
  id: string;
  value: string;
}

/**
 * Sends the promotion of one of an ingredient's folk names. A null
 * `workspaceId` names a compendium entry, as the mutation reads it.
 */
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

/** The hook's result, handed to the question and read by the chip's control for its busy state. */
export type Promotion = ReturnType<typeof usePromoteFolkName>;

export interface PromoteFolkNameQuestionProps {
  promotion: Promotion;
  /** The name asked about; null while nothing asks. */
  folkName: PromotedName | null;
  /** The ingredient's display name now, which becomes a folk name. */
  displayName: string;
  /** The compendium's swap is global, and says so; a coven's does not. */
  tier: 'compendium' | 'coven';
  /** The form holds changes: offer to save or drop them first. */
  dirty: boolean;
  /**
   * Saves the form's changes, answering whether they landed. When it answers
   * false the form has shown why and closed the question itself.
   */
  saveFirst: () => Promise<boolean>;
  /** Puts the form back to its saved values. */
  discardFirst: () => void;
  /** The swap was made: the form takes the answer in. */
  onPromoted: (ingredient: PromotedIngredient) => void;
  /** Cancel: nothing sent. */
  onKeep: () => void;
  /** The server refused: its first sentence, for the form's alert; the form closes the question. */
  onRefused: (message: string) => void;
}

type Step = 'confirm' | 'also' | null;

/**
 * Always asks before a folk name becomes the display name. With changes unsaved it offers Save &
 * Promote (the form's own save first, promoting only if that landed) and Discard & Promote;
 * Cancel sends nothing. Steps aside while the unsaved-changes question asks, as a removal's does.
 */
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
      // Four tiers, told apart by type as well as space: the question as the card's heading; the
      // swap on a tinted panel; the compendium's reach as a muted aside; and, ruled off above the
      // buttons, the question they answer.
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
