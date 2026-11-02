import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SourcingScore from '@/components/SourcingScore';
import type { SourcingScore as Score } from '@/modules/ingredients';

// The admin entry dialog's sourcing score: the total, then every fact that made it, each with its points.
const SCORE: Score = {
  score: 7,
  facts: [
    { fact: 'sources', label: '1 Source', points: 10 },
    { fact: 'curatorReviewed', label: 'Curator Review: Not Yet', points: 0 },
    { fact: 'noLocator', label: 'Citations with No Locator: 1', points: -3 },
  ],
};

describe('SourcingScore', () => {
  it('heads the facts with the total and lists each with its signed points, in order', () => {
    render(<SourcingScore sourcing={SCORE} />);

    const section = screen.getByRole('region', { name: 'Sourcing Score: 7' });
    const items = within(section).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '1 Source: +10',
      'Curator Review: Not Yet: 0',
      'Citations with No Locator: 1: −3',
    ]);
  });
});
