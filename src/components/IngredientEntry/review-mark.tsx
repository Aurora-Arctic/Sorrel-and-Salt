'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import Notice from '../Notice';
import ReviewRow from './review-row';
import type { ReviewMarkProps } from './types';
import './review-mark.scss';

// The curator's Reviewed switch on a compendium entry (M14.8). It saves the moment it is flipped,
// and stands, with the review day, as the last row of the Quick Look's head (admin and public) and
// of the public entry page's head. The edit and add modals do not use this component: there the switch is a field of
// the form, saved with Save (IngredientForm). It marks or clears the review. The badge saying where the entry stands is the
// entry's own mark, drawn for everyone (EntryMarks).
// A switch rather than a button that flips its label, so the state is the control's own to a
// screen reader.  The mark is the seed's: the seed never rewrites an entry a curator has reviewed
// (claude-docs/db/compendium-seed/README.md, "Write-once, and how a correction lands"). The
// service is the guard; this is only the control (claude-docs/components/ingredient-entry.md).

export const SetCompendiumEntryReviewedDocument = graphql(`
  mutation SetCompendiumEntryReviewed($id: ID!, $reviewed: Boolean!) {
    setCompendiumEntryReviewed(id: $id, reviewed: $reviewed) {
      id
    }
  }
`);

export default function ReviewMark({ ingredientId, reviewedAt }: ReviewMarkProps): ReactElement {
  const { refresh, pending } = usePendingNavigation();
  const announce = useAnnounce();
  // The switch's state from the flip until the page is read again and brings its own: kept past the
  // request so the switch does not flick back while the page reloads, dropped when the page's
  // answer changes. Whether a request is out is a separate flag, so the next flip is never refused.
  const [sent, setSent] = useState<boolean>();
  const [pageAnswer, setPageAnswer] = useState(reviewedAt);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string>();
  if (pageAnswer !== reviewedAt) {
    setPageAnswer(reviewedAt);
    setSent(undefined);
  }
  const reviewed = sent ?? reviewedAt !== null;
  // Busy from the flip until the page's new answer arrives (`sent` is dropped then), and while the
  // refresh shows as pending. The switch stays enabled: a flip while a request is out is ignored in
  // `change`, and a disabled switch would draw the dashed look, a different message.
  const waiting = busy || pending || sent !== undefined;

  async function change(next: boolean) {
    if (busy) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReviewRow
      standing={reviewedAt !== null}
      reviewedAt={reviewedAt}
      checked={reviewed}
      busy={waiting}
      onChange={(next) => void change(next)}
    >
      {refusal && <Notice kind="error">{refusal}</Notice>}
    </ReviewRow>
  );
}
