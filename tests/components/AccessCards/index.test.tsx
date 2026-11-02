import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccessCards from '@/components/AccessCards';
import type { AccessRole, AccessRow } from '@/components/AccessCards/types';

// The privacy policy's "Who Can See What" cards (claude-docs/components/access-cards.md): one closed
// card per kind of data, six marks on its summary line, and every role's full wording once opened.

const ROLES: AccessRole[] = [
  { name: 'Fixture Owner', short: 'Own' },
  { name: 'Fixture Reader', short: 'Rdr' },
];

const ROWS: AccessRow[] = [
  {
    data: 'Your fixture name',
    cells: [
      { mark: 'yes', text: 'Yes, for everyone in the fixture' },
      { mark: 'no', text: 'No' },
    ],
  },
  {
    data: 'Your fixture secret',
    cells: [
      { mark: 'part', text: 'Only in a locked form' },
      { mark: 'no', text: 'No' },
    ],
  },
];

describe('AccessCards', () => {
  it('draws one closed card per kind of data, named by it', () => {
    render(<AccessCards roles={ROLES} rows={ROWS} />);
    const cards = screen.getAllByRole('group');
    expect(cards).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Your fixture name' })).not.toHaveAttribute('open');
    expect(screen.getByRole('group', { name: 'Your fixture secret' })).not.toHaveAttribute('open');
  });

  it("reads each mark to a screen reader as the role's name and its reading, on the summary line", () => {
    render(<AccessCards roles={ROLES} rows={ROWS} />);
    const card = screen.getByRole('group', { name: 'Your fixture secret' });
    const summary = card.querySelector('summary')!;
    expect(within(summary).getByText('Fixture Owner: In Part.')).toBeTruthy();
    expect(within(summary).getByText('Fixture Reader: No.')).toBeTruthy();
    expect(
      within(
        screen.getByRole('group', { name: 'Your fixture name' }).querySelector('summary')!,
      ).getByText('Fixture Owner: Yes.'),
    ).toBeTruthy();
  });

  it("holds every role's full wording in the card, as a term and its definition", () => {
    render(<AccessCards roles={ROLES} rows={ROWS} />);
    const card = screen.getByRole('group', { name: 'Your fixture secret' });
    const terms = within(card).getAllByRole('term');
    expect(terms.map((term) => term.textContent)).toEqual(['Fixture Owner', 'Fixture Reader']);
    const definitions = within(card).getAllByRole('definition');
    expect(definitions.map((definition) => definition.textContent)).toEqual([
      'Only in a locked form',
      'No',
    ]);
  });

  it('labels each column with its role, in the roles’ order', () => {
    render(<AccessCards roles={ROLES} rows={ROWS} />);
    const labels = screen.getAllByTitle(/Fixture (Owner|Reader)/);
    expect(labels.map((label) => label.getAttribute('title'))).toEqual([
      'Fixture Owner',
      'Fixture Reader',
    ]);
    expect(labels.map((label) => label.textContent)).toEqual(['Own', 'Rdr']);
  });

  it('explains the three marks and names the roles in column order', () => {
    render(<AccessCards roles={ROLES} rows={ROWS} />);
    const key = screen.getByRole('list', { name: 'How to read the marks' });
    expect(
      within(key)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Yes', 'In Part', 'No']);
    expect(screen.getByText(/Fixture Owner, Fixture Reader/)).toBeTruthy();
  });
});
