import type { Route } from 'next';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SpellRecipe from '@/components/SpellRecipe';
import type { RecipeStep, SpellRecipeProps } from '@/components/SpellRecipe';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/here',
}));

// MB.6 (claude-docs/components/spell-recipe.md): the page body is presentational, so each
// case is props in and what rendered out. The spells are the test's own data.

const instruction = (id: string, body: string): RecipeStep => ({ kind: 'instruction', id, body });
const ingredient = (
  id: string,
  over: Partial<Extract<RecipeStep, { kind: 'ingredient' }>> = {},
): RecipeStep => ({
  kind: 'ingredient',
  id,
  name: 'Testwort',
  form: null,
  formal: null,
  quantity: null,
  unit: null,
  href: null,
  oneOff: false,
  deleted: false,
  body: null,
  ...over,
});

const props = (over: Partial<SpellRecipeProps> = {}): SpellRecipeProps => ({
  title: 'Fixture Working',
  intent: 'To keep the testwort fresh.',
  status: 'complete',
  visibility: 'workspace',
  categories: [],
  lastEdit: null,
  note: null,
  steps: [],
  back: { href: '/coven/fixture-coven/grimoire' as Route, label: 'Grimoire' },
  ...over,
});

describe('SpellRecipe', () => {
  it('names the page by the title and links back to the grimoire', () => {
    render(<SpellRecipe {...props()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fixture Working' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Grimoire/ })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/grimoire',
    );
  });

  it('calls a spell with no title Untitled Spell', () => {
    render(<SpellRecipe {...props({ title: null, status: 'draft' })} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Untitled Spell' })).toBeInTheDocument();
  });

  it('numbers the steps in the order given, with the amount on an ingredient step', () => {
    render(
      <SpellRecipe
        {...props({
          steps: [
            instruction('a', 'Light the candle.'),
            ingredient('b', { quantity: '2', unit: 'tsp' }),
          ],
        })}
      />,
    );
    const items = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Light the candle.');
    expect(items[1]).toHaveTextContent('2 tsp');
    expect(items[1]).toHaveTextContent('Testwort');
  });

  it('summarises the ingredients above the steps, leaving out instructions', () => {
    render(
      <SpellRecipe
        {...props({ steps: [instruction('a', 'Stir.'), ingredient('b', { quantity: '1' })] })}
      />,
    );
    const list = screen.getByRole('list', { name: 'Ingredients' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows the formal name beside a label two ingredients share', () => {
    render(
      <SpellRecipe {...props({ steps: [ingredient('a', { formal: 'Testus officinalis' })] })} />,
    );
    expect(
      within(screen.getByRole('list', { name: 'Steps' })).getByText(/Testus officinalis/),
    ).toBeInTheDocument();
  });

  it('links an ingredient to its page and a one-off to nothing, marking it One-Off', () => {
    render(
      <SpellRecipe
        {...props({
          steps: [
            ingredient('a', { href: '/coven/fixture-coven/ingredients/i1' as Route }),
            ingredient('b', { name: 'Fixture Moss', form: 'fresh', oneOff: true }),
          ],
        })}
      />,
    );
    const steps = screen.getByRole('list', { name: 'Steps' });
    expect(within(steps).getAllByRole('link')).toHaveLength(1);
    expect(within(steps).getByRole('link')).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients/i1',
    );
    expect(within(steps).getByText(/Fixture Moss \(Fresh\)/)).toBeInTheDocument();
    expect(within(steps).getByText(/One-Off/)).toBeInTheDocument();
  });

  it('shows the note under its own heading, and none when blank', () => {
    const { rerender } = render(<SpellRecipe {...props({ note: 'Best at dusk.' })} />);
    expect(screen.getByRole('heading', { name: 'Note' })).toBeInTheDocument();
    expect(screen.getByText('Best at dusk.')).toBeInTheDocument();
    rerender(<SpellRecipe {...props({ note: '  ' })} />);
    expect(screen.queryByRole('heading', { name: 'Note' })).toBeNull();
  });

  it('draws no Edit or Delete control of its own, and draws the action it is given', () => {
    const { rerender } = render(<SpellRecipe {...props()} />);
    expect(screen.queryByRole('link', { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
    rerender(<SpellRecipe {...props({ action: <a href="/x">Edit Spell</a> })} />);
    expect(screen.getByRole('link', { name: 'Edit Spell' })).toBeInTheDocument();
  });

  it('badges a draft and a private spell', () => {
    render(<SpellRecipe {...props({ status: 'draft', visibility: 'private' })} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });
});
