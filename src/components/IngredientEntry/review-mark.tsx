'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import { SwitchField } from '../Field';
import Notice from '../Notice';
import type { ReviewMarkProps } from './types';
import './review-mark.scss';

// The admin's review switch on a compendium entry, in the foot of the entry's details on the admin
// list; the badge saying where the entry stands is drawn for everyone (EntryMarks)
// (claude-docs/components/ingredient-entry.md, "Structure").

const SetCompendiumEntryReviewedDocument = graphql(`
  mutation SetCompendiumEntryReviewed($id: ID!, $reviewed: Boolean!) {
    setCompendiumEntryReviewed(id: $id, reviewed: $reviewed) {
      id
    }
  }
`);

export default function ReviewMark({ ingredientId, reviewedAt }: ReviewMarkProps): ReactElement {
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();
  // The switch's state while a change is out and the page is read again; the page's own after.
  const [sent, setSent] = useState<boolean>();
  const [refusal, setRefusal] = useState<string>();
  const reviewed = sent ?? reviewedAt !== null;

  async function change(next: boolean) {
    if (sent !== undefined) return;
    setSent(next);
    setRefusal(undefined);
    try {
      await graphqlRequest(SetCompendiumEntryReviewedDocument, {
        id: ingredientId,
        reviewed: next,
      });
      announce(next ? 'Marked reviewed.' : 'Marked as needing review.');
      refresh();
    } catch (error) {
      setSent(undefined);
      setRefusal(readGraphqlFailure(error).alert);
    }
  }

  return (
    <div className="review-mark">
      <SwitchField
        label="Reviewed By Curator"
        name="reviewed"
        value="1"
        checked={reviewed}
        onChange={(next) => void change(next)}
      />
      {refusal && <Notice kind="error">{refusal}</Notice>}
    </div>
  );
}
