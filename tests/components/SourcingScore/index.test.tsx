import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SourcingScore from '@/components/SourcingScore';
import type { SourcingScore as Score } from '@/modules/ingredients';

const SCORE: Score = {
  score: 7,
  facts: [
    { fact: 'curatorReviewed', label: 'Curator Review: Not Yet', points: 0 },
    { fact: 'noLocator', label: 'Citations with No Locator: 1', points: -3 },
    { fact: 'sources', label: '1 Source', points: 10 },
    { fact: 'safetyUnsourced', label: 'Safety Note: None', points: 0 },
    { fact: 'formCitesNothing', label: 'Forms Citing Nothing: 1', points: -5 },
    { fact: 'bestSource', label: 'Best Source: Book', points: 18 },
  ],
};

const rows = (section: HTMLElement): string[][] =>
  within(section)
    .getAllByRole('listitem')
    .map((item) => Array.from(item.querySelectorAll('span')).map((cell) => cell.textContent ?? ''));

describe('SourcingScore', () => {
  it('names the region by a heading carrying the total', () => {
    render(<SourcingScore sourcing={SCORE} />);

    const section = screen.getByRole('region', { name: 'Sourcing Score: 7' });
    expect(within(section).getByRole('heading', { name: 'Sourcing Score: 7' })).toBeInTheDocument();
    expect(
      within(section).getByRole('button', { name: 'About Sourcing Score' }),
    ).toBeInTheDocument();
  });

  it('lists gains, then costs, then zeros, each group in its given order, with a signed number on every row', () => {
    render(<SourcingScore sourcing={SCORE} />);

    const section = screen.getByRole('region', { name: 'Sourcing Score: 7' });
    expect(rows(section)).toEqual([
      ['1 Source', '+10'],
      ['Best Source: Book', '+18'],
      ['Citations with No Locator: 1', '−3'],
      ['Forms Citing Nothing: 1', '−5'],
      ['Curator Review: Not Yet', '0'],
      ['Safety Note: None', '0'],
    ]);
  });

  it('states the gained and cost numbers in the bar’s accessible name', () => {
    render(<SourcingScore sourcing={SCORE} />);

    expect(screen.getByRole('img', { name: 'Gained 28, cost 8, out of 100' })).toBeInTheDocument();
  });

  it('states the numbers of a negative total', () => {
    render(
      <SourcingScore
        sourcing={{
          score: -10,
          facts: [{ fact: 'nomenclatureUnknown', label: 'Nomenclature: Unknown', points: -10 }],
        }}
      />,
    );

    expect(screen.getByRole('region', { name: 'Sourcing Score: -10' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gained 0, cost 10, out of 100' })).toBeInTheDocument();
  });

  it('never draws the bar past its track when gains pass the maximum', () => {
    render(
      <SourcingScore
        sourcing={{
          score: 110,
          facts: [
            { fact: 'sources', label: 'Many Sources', points: 120 },
            { fact: 'formCitesNothing', label: 'Forms Citing Nothing: 2', points: -10 },
          ],
        }}
      />,
    );

    const bar = screen.getByRole('img', { name: 'Gained 120, cost 10, out of 100' });
    const widths = Array.from(bar.querySelectorAll('span')).map((part) =>
      parseFloat((part as HTMLElement).style.width),
    );
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeLessThanOrEqual(100);
  });
});

describe('SourcingScore on the entry page', () => {
  it('names its region by an h3 carrying the total and still shows the bar and every fact', () => {
    render(<SourcingScore sourcing={SCORE} headingLevel={3} />);

    const section = screen.getByRole('region', { name: 'Sourcing Score: 7' });
    expect(
      within(section).getByRole('heading', { level: 3, name: 'Sourcing Score: 7' }),
    ).toBeInTheDocument();
    expect(within(section).getByRole('img')).toBeInTheDocument();
    expect(within(section).getAllByRole('listitem')).toHaveLength(SCORE.facts.length);
  });
});
