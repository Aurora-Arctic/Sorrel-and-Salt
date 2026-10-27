import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SpellCard, { spellTitleId } from '@/components/SpellCard';

// M10.11 (claude-docs/components/spell-card.md): the card is presentational, so each
// case is its props in and what rendered out. The spells are the test's own data.

const GROUP = { colorDark: '#7a5c99', colorLight: '#5b3f7a' };
const BASE = {
  id: 'spell-1',
  title: 'Fixture Working',
  intent: 'To keep the testwort fresh.',
  status: 'complete' as const,
  categories: [],
};

describe('SpellCard', () => {
  it('names the card by its title, under the id a list item points at', () => {
    render(<SpellCard {...BASE} />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    const heading = within(card).getByRole('heading', { name: 'Fixture Working' });
    expect(heading.id).toBe(spellTitleId('spell-1'));
  });

  it('calls a spell with no title Untitled Spell', () => {
    render(<SpellCard {...BASE} title={null} status="draft" />);
    expect(screen.getByRole('heading', { name: 'Untitled Spell' })).toBeInTheDocument();
  });

  it('calls a blank title Untitled Spell too', () => {
    render(<SpellCard {...BASE} title="   " status="draft" />);
    expect(screen.getByRole('heading', { name: 'Untitled Spell' })).toBeInTheDocument();
  });

  it('shows the intent, and no paragraph for a spell without one', () => {
    const { rerender } = render(<SpellCard {...BASE} />);
    expect(screen.getByText('To keep the testwort fresh.')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} intent={null} />);
    expect(screen.queryByText('To keep the testwort fresh.')).not.toBeInTheDocument();
  });

  // Complete is the default, so only a draft is marked (the owner, 2026-10-27).
  it('marks a draft with a Draft badge, and a complete spell with no status badge', () => {
    const { rerender } = render(<SpellCard {...BASE} status="draft" />);
    expect(within(screen.getByRole('article')).getByText('Draft')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} status="complete" />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    expect(within(card).queryByText('Draft')).not.toBeInTheDocument();
    expect(within(card).queryByText('Complete')).not.toBeInTheDocument();
  });

  it('lists the assigned categories as chips', () => {
    render(
      <SpellCard
        {...BASE}
        categories={[{ category: { id: 'c1', name: 'Testward' }, group: GROUP }]}
      />,
    );
    const chips = screen.getByRole('list', { name: 'Categories' });
    expect(within(chips).getByText('Testward')).toBeInTheDocument();
  });

  it('is not a link until the spell page exists (MB.6)', () => {
    render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
