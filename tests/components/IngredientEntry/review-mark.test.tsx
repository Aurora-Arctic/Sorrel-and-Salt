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
// clears it, in the details' head; the badge is the entry's own mark (claude-docs/components/ingredient-entry.md).

const ID = '00000000-0000-4000-8000-000000000002';
const AT = '2026-10-01T09:30:00.000Z';

function renderMark(reviewedAt: string | null) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ReviewMark ingredientId={ID} reviewedAt={reviewedAt} />
    </QueryClientProvider>,
  );
}

const toggle = () => screen.getByRole('switch', { name: 'Reviewed' });

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

  it('says where the entry stands, with its day, and "Needs Review" without one', () => {
    const { container, unmount } = renderMark(AT);
    expect(screen.getByRole('button', { name: 'Reviewed By Curator' })).toHaveAccessibleDescription(
      'Reviewed 1 Oct 2026',
    );
    expect(container.querySelector('time')).toBeNull();
    unmount();

    const unreviewed = renderMark(null);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(unreviewed.container.querySelector('time')).toBeNull();
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

// The Control row of claude-docs/loading.md: the switch answers at once, carries aria-busy and a
// spinner from the flip until the page's new answer arrives, and is never disabled.
describe('ReviewMark, while a flip is pending', () => {
  it('is busy with a spinner until the new answer arrives, and not disabled', async () => {
    acceptReview();
    const client = makeQueryClient();
    const mark = (at: string | null) => (
      <QueryClientProvider client={client}>
        <ReviewMark ingredientId={ID} reviewedAt={at} />
      </QueryClientProvider>
    );
    const { container, rerender } = render(mark(null));
    expect(toggle()).not.toHaveAttribute('aria-busy');
    expect(container.querySelector('.spinner')).toBeNull();

    press(toggle());

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toggle()).toBeChecked();
    expect(toggle()).toBeEnabled();
    expect(toggle()).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.spinner')).not.toBeNull();

    rerender(mark(AT));

    expect(toggle()).not.toHaveAttribute('aria-busy');
    expect(container.querySelector('.spinner')).toBeNull();
  });

  it('is not busy after a refusal', async () => {
    mockGraphQLError('SetCompendiumEntryReviewed', { code: 'NOT_FOUND', message: 'Gone' });
    const { container } = renderMark(null);

    press(toggle());

    await screen.findByRole('alert');
    expect(toggle()).not.toHaveAttribute('aria-busy');
    expect(container.querySelector('.spinner')).toBeNull();
  });
});

// A flip, once answered, must not latch the switch: the curator can flip it back.
describe('ReviewMark, flipped twice', () => {
  it('sends the second flip too, and shows it', async () => {
    const calls = acceptReview();
    renderMark(null);

    press(toggle());
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(toggle()).toBeChecked();

    press(toggle());
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toEqual({ id: ID, reviewed: false });
    expect(toggle()).not.toBeChecked();
  });
});
