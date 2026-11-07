import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmptyState from '@/components/EmptyState';

// What a list draws with nothing in it, in one of two sizes: a status region holding the sentence
// and, where there is one, the one thing to do next (claude-docs/components/empty-state.md).

describe('EmptyState', () => {
  it('says its sentence in a status region named by its label', () => {
    render(<EmptyState label="No Spells">There are no spells yet.</EmptyState>);

    expect(screen.getByRole('status', { name: 'No Spells' })).toHaveTextContent(/\S/);
  });

  it('holds the action it is given inside the same region', () => {
    render(
      <EmptyState
        label="No Matches"
        action={<a href="/coven/fixture-coven/ingredients">Clear Filters</a>}
      >
        Nothing matches.
      </EmptyState>,
    );

    const region = screen.getByRole('status', { name: 'No Matches' });
    expect(within(region).getByRole('link', { name: 'Clear Filters' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients',
    );
  });

  it('draws no action where it is given none', () => {
    render(<EmptyState label="No Ingredients">There are no ingredients yet.</EmptyState>);

    const region = screen.getByRole('status', { name: 'No Ingredients' });
    expect(within(region).queryByRole('link')).toBeNull();
    expect(within(region).queryByRole('button')).toBeNull();
  });

  // A table's empty line is the compact size and has no name of its own.
  it('is still a status region in its compact size with no label', () => {
    render(<EmptyState size="compact">There are no keeper invitations yet.</EmptyState>);

    expect(screen.getByRole('status')).toHaveTextContent(/\S/);
  });
});
