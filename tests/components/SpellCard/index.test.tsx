import type { Route } from 'next';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SpellCard, { SpellCardFilters, spellTitleId } from '@/components/SpellCard';

// The title link navigates through the shared hook (M12.33), so the App Router is mocked.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/here',
}));

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
  it('draws an Edit link named for the spell only when given the address', () => {
    const { rerender } = render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('link', { name: /^Edit / })).not.toBeInTheDocument();
    rerender(<SpellCard {...BASE} editHref={'/here?edit=spell-1' as Route} />);
    expect(screen.getByRole('link', { name: 'Edit Fixture Working' })).toHaveAttribute(
      'href',
      '/here?edit=spell-1',
    );
  });

  it('draws a Quick Look eye named for the spell only when given the address, apart from the title link', () => {
    const href = '/coven/x/grimoire/spell-1' as Route;
    const { rerender } = render(<SpellCard {...BASE} href={href} />);
    expect(screen.queryByRole('link', { name: /^Quick Look / })).not.toBeInTheDocument();
    rerender(
      <SpellCard
        {...BASE}
        href={href}
        lookHref={'/here?spell=spell-1' as Route}
        editHref={'/here?edit=spell-1' as Route}
      />,
    );
    const eye = screen.getByRole('link', { name: 'Quick Look Fixture Working' });
    expect(eye).toHaveAttribute('href', '/here?spell=spell-1');
    expect(screen.getByRole('link', { name: /^Fixture Working/ }).contains(eye)).toBe(false);
    expect(screen.getByRole('link', { name: 'Edit Fixture Working' })).toBeInTheDocument();
  });

  it('keeps the Edit link out of the title link, so the stretched title link never swallows it', () => {
    render(
      <SpellCard
        {...BASE}
        href={'/coven/x/grimoire/spell-1' as Route}
        editHref={'/here?edit=spell-1' as Route}
      />,
    );
    const title = screen.getByRole('link', { name: /^Fixture Working/ });
    const edit = screen.getByRole('link', { name: 'Edit Fixture Working' });
    expect(title).not.toBe(edit);
    expect(title.contains(edit)).toBe(false);
    expect(edit.contains(title)).toBe(false);
  });

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
  // The smouldering edge (spell-card.md): layers drawn on hover, which a screen reader must
  // not meet. Hidden layers have no role, so they are found by the attribute that hides them.
  it('draws the smoulder as hidden decoration, leaving the card named by its title alone', () => {
    render(<SpellCard {...BASE} />);
    const card = screen.getByRole('article', { name: 'Fixture Working' });
    const layers = card.querySelectorAll(':scope > [aria-hidden="true"]');
    expect(layers).toHaveLength(3);
    layers.forEach((layer) => expect(layer).toHaveTextContent(/^$/));
  });

  it('renders the burn filter the stylesheet names, hidden from assistive technology', () => {
    const { container } = render(<SpellCardFilters />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelector('filter#spell-card-burn')).not.toBeNull();
  });
});

// MB.6: the title links to the spell's recipe page, through the shared navigation hook.
describe('SpellCard link', () => {
  it('makes the title a link to the recipe page when given an address', () => {
    render(<SpellCard {...BASE} href={'/coven/fixture-coven/grimoire/spell-1' as Route} />);
    const link = screen.getByRole('link', { name: 'Fixture Working' });
    expect(link).toHaveAttribute('href', '/coven/fixture-coven/grimoire/spell-1');
    expect(within(screen.getByRole('heading')).getByRole('link')).toBe(link);
  });

  it('leaves the title plain text with no address', () => {
    render(<SpellCard {...BASE} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
