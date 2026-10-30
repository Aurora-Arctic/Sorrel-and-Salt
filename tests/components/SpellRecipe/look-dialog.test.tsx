import { render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/here',
}));

const { RouteModalProvider } = await import('@/components/Modal');
const { default: SpellLookDialog } = await import('@/components/SpellRecipe/look-dialog');

// The Quick Look modal a grimoire card's eye opens (
// claude-docs/components/spell-recipe.md, "Quick Look"): a spell read over the list,
// a way through to its recipe page, and, for a role that may update it, an Edit.

const LIST = '/coven/fixture-coven/grimoire' as Route;
const RECIPE = '/coven/fixture-coven/grimoire/s1' as Route;
const EDIT = '/coven/fixture-coven/grimoire?edit=s1' as Route;
const OPENED = {
  title: 'Fixture Working',
  lastEdit: { by: 'Fixture A', at: '2026-09-01T10:30:00.000Z' },
  recipeHref: RECIPE,
  status: 'complete' as const,
  visibility: 'workspace' as const,
  children: <p>The recipe body</p>,
};

const dialog = () => screen.getByRole('dialog', { name: 'Fixture Working' });

describe('SpellLookDialog', () => {
  it('opens nothing while its address asks for nothing', () => {
    render(
      <RouteModalProvider>
        <SpellLookDialog closeHref={LIST} />
      </RouteModalProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is named by the spell, holds the shared body and the last edit, and links to the recipe page', () => {
    render(
      <RouteModalProvider>
        <SpellLookDialog closeHref={LIST} opened={OPENED} />
      </RouteModalProvider>,
    );
    expect(within(dialog()).getByText('The recipe body')).toBeInTheDocument();
    expect(within(dialog()).getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      /Fixture A/,
    );
    expect(within(dialog()).getByRole('link', { name: 'See Full Recipe' })).toHaveAttribute(
      'href',
      RECIPE,
    );
  });

  it('marks a draft and a private spell in its head, as the recipe page does, and a complete shared one not at all', () => {
    const { rerender } = render(
      <RouteModalProvider>
        <SpellLookDialog closeHref={LIST} opened={OPENED} />
      </RouteModalProvider>,
    );
    expect(within(dialog()).queryByText('Draft')).not.toBeInTheDocument();
    expect(within(dialog()).queryByText('Private')).not.toBeInTheDocument();
    rerender(
      <RouteModalProvider>
        <SpellLookDialog
          closeHref={LIST}
          opened={{ ...OPENED, status: 'draft', visibility: 'private' }}
        />
      </RouteModalProvider>,
    );
    expect(within(dialog()).getByText('Draft')).toBeInTheDocument();
    expect(within(dialog()).getByText('Private')).toBeInTheDocument();
  });

  it('calls a spell with no title Untitled Spell', () => {
    render(
      <RouteModalProvider>
        <SpellLookDialog closeHref={LIST} opened={{ ...OPENED, title: null }} />
      </RouteModalProvider>,
    );
    expect(screen.getByRole('dialog', { name: 'Untitled Spell' })).toBeInTheDocument();
  });

  it('draws Edit, linking to the same address with ?edit, only when given one', () => {
    const { rerender } = render(
      <RouteModalProvider>
        <SpellLookDialog closeHref={LIST} opened={OPENED} />
      </RouteModalProvider>,
    );
    expect(within(dialog()).queryByRole('link', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(within(dialog()).getByRole('link', { name: 'See Full Recipe' })).toBeInTheDocument();
    rerender(
      <RouteModalProvider>
        <SpellLookDialog closeHref={LIST} opened={{ ...OPENED, editHref: EDIT }} />
      </RouteModalProvider>,
    );
    // The pencil is in the head, by the title; the foot holds See Full Recipe alone.
    const edit = within(dialog()).getByRole('link', { name: 'Edit Fixture Working' });
    expect(edit).toHaveAttribute('href', EDIT);
    const foot = within(dialog()).getByRole('link', { name: 'See Full Recipe' }).parentElement!;
    expect(within(foot).getAllByRole('link')).toHaveLength(1);
    expect(foot).not.toContainElement(edit);
    expect(within(dialog()).queryByRole('link', { name: 'Edit Spell' })).toBeNull();
  });

  it('says the spell could not be read, in a Notice under the title Spell Recipe, when the read failed', () => {
    render(
      <RouteModalProvider>
        <SpellLookDialog closeHref={LIST} failed />
      </RouteModalProvider>,
    );
    expect(
      within(screen.getByRole('dialog', { name: 'Spell Recipe' })).getByRole('alert'),
    ).toHaveTextContent(/could not be read/);
  });
});
