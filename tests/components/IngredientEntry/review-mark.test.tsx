import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewMark from '@/components/IngredientEntry/review-mark';
import type {
  SetCompendiumEntryReviewedMutation,
  SetCompendiumEntryReviewedMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The admin's review mark on a compendium entry's details: the switch that marks or
// clears it, in the details' foot; the badge is the entry's own mark (claude-docs/components/ingredient-entry.md).

const ID = '00000000-0000-4000-8000-000000000002';
const AT = '2026-10-01T09:30:00.000Z';

function renderMark(reviewedAt: string | null) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ReviewMark ingredientId={ID} reviewedAt={reviewedAt} />
    </QueryClientProvider>,
  );
}

const toggle = () => screen.getByRole('switch', { name: 'Reviewed By Curator' });

function acceptReview() {
  const calls: SetCompendiumEntryReviewedMutationVariables[] = [];
  mockGraphQLMutation<
    SetCompendiumEntryReviewedMutation,
    SetCompendiumEntryReviewedMutationVariables
  >('SetCompendiumEntryReviewed', (variables) => {
    calls.push(variables);
    return { setCompendiumEntryReviewed: { id: ID } };
  });
  return calls;
}

describe('ReviewMark', () => {
  beforeEach(() => {
    router.refresh.mockClear();
  });

  it('shows an unmarked entry as off', () => {
    renderMark(null);

    expect(toggle()).not.toBeChecked();
  });

  it('shows a marked entry as on', () => {
    renderMark(AT);

    expect(toggle()).toBeChecked();
  });

  it('marks the entry reviewed and reads the page again', async () => {
    const calls = acceptReview();
    renderMark(null);

    press(toggle());

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: ID, reviewed: true }]);
    // On while the page is read again, so the switch does not flick back.
    expect(toggle()).toBeChecked();
  });

  it('clears the mark, back to needing review', async () => {
    const calls = acceptReview();
    renderMark(AT);

    press(toggle());

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: ID, reviewed: false }]);
    expect(toggle()).not.toBeChecked();
  });

  it("shows the service's refusal and puts the switch back", async () => {
    mockGraphQLError('SetCompendiumEntryReviewed', {
      code: 'NOT_FOUND',
      message: 'No such compendium entry',
    });
    renderMark(null);

    press(toggle());

    expect(await screen.findByRole('alert')).toHaveTextContent('No such compendium entry');
    expect(toggle()).not.toBeChecked();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
