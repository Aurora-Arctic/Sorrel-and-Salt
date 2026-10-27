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
  visibility: 'workspace' as const,
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

  // Only its author lists a private spell (M10.6), so the badge tells them it
  // is theirs alone (M10.13). A word, not a colour, so it reads without one.
  it('marks a private spell Private, and a spell shared with the coven with nothing', () => {
    const { rerender } = render(<SpellCard {...BASE} visibility="private" />);
    expect(within(screen.getByRole('article')).getByText('Private')).toBeInTheDocument();
    rerender(<SpellCard {...BASE} visibility="workspace" />);
    expect(within(screen.getByRole('article')).queryByText('Private')).not.toBeInTheDocument();
  });

  it('marks a private draft with both badges', () => {
    render(<SpellCard {...BASE} status="draft" visibility="private" />);
    const card = within(screen.getByRole('article'));
    expect(card.getByText('Draft')).toBeInTheDocument();
    expect(card.getByText('Private')).toBeInTheDocument();
  });

  // Who last changed the spell, drawn from what the caller hands in, as IngredientCard's.
  it('says who last edited the spell and when, given the edit', () => {
    render(<SpellCard {...BASE} lastEdit={{ by: 'Fixture A', at: '2026-09-01T12:00:00.000Z' }} />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    expect(within(card).getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      'Last edited by Fixture A on 1 September 2026',
    );
  });

  it('draws no edit line when it is given none', () => {
    render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('button', { name: /^Edited/ })).not.toBeInTheDocument();
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
