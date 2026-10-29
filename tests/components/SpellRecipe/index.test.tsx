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
  look: null,
  safety: null,
  oneOff: false,
  deleted: false,
  note: null,
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
    expect(items[0]).toHaveTextContent('1.');
    expect(items[0]).toHaveTextContent('Light the candle.');
    expect(items[1]).toHaveTextContent('2.');
    expect(items[1]).toHaveTextContent('2 tsp');
    expect(items[1]).toHaveTextContent('Testwort');
  });

  it('draws no Ingredients section, the steps carrying the amounts', () => {
    render(
      <SpellRecipe
        {...props({ steps: [instruction('a', 'Stir.'), ingredient('b', { quantity: '1' })] })}
      />,
    );
    expect(screen.queryByRole('heading', { name: 'Ingredients' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Ingredients' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Steps' })).toBeNull();
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('draws the facts that are set as a strip, and leaves out blank ones', () => {
    render(
      <SpellRecipe
        {...props({
          jarDescription: '4 oz jar',
          sealWaxColor: '  ',
          moonPhase: 'Waxing Crescent',
          dayOfWeek: null,
        })}
      />,
    );
    const terms = screen.getAllByRole('term').map((term) => term.textContent);
    expect(terms).toEqual(['Jar', 'Moon Phase']);
    expect(screen.getByText('4 oz jar')).toBeInTheDocument();
    expect(screen.getByText('Waxing Crescent')).toBeInTheDocument();
  });

  it('draws the moon phase with its drawing, and a phase with no drawing as its text alone', () => {
    const { rerender } = render(<SpellRecipe {...props({ moonPhase: 'Waxing Crescent' })} />);
    const phase = () => screen.getByText(/Waxing Crescent|Blue Moon/).closest('dd')!;
    expect(phase().querySelector('svg[aria-hidden="true"]')).not.toBeNull();

    rerender(<SpellRecipe {...props({ moonPhase: 'Blue Moon' })} />);
    expect(phase().querySelector('svg')).toBeNull();
  });

  it('shows every category as a chip, with none folded behind a +N button', () => {
    const categories = Array.from({ length: 4 }, (_, i) => ({
      category: { id: `c${i}`, name: `Fixture Category ${i + 1}` },
      group: { colorDark: '#112233', colorLight: '#445566' },
    }));
    render(<SpellRecipe {...props({ categories })} />);

    const list = screen.getByRole('list', { name: 'Categories' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /more categories/i })).toBeNull();
  });

  it("draws an ingredient step's note, or its body where the note has moved there, and an instruction step's text", () => {
    render(
      <SpellRecipe
        {...props({
          steps: [
            ingredient('a', { body: 'Crush it first', note: 'The base' }),
            ingredient('b', { name: 'Fixture Moss', body: 'From the wall', note: null }),
            instruction('c', 'Stir.'),
          ],
        })}
      />,
    );

    expect(screen.getByText('The base')).toBeInTheDocument();
    expect(screen.queryByText('Crush it first')).toBeNull();
    expect(screen.getByText('From the wall')).toBeInTheDocument();
    expect(screen.getByText('Stir.')).toBeInTheDocument();
  });

  it('draws no facts strip when none is set', () => {
    render(<SpellRecipe {...props()} />);
    expect(screen.queryByRole('term')).toBeNull();
  });

  it('shows the formal name beside a label two ingredients share', () => {
    render(
      <SpellRecipe {...props({ steps: [ingredient('a', { formal: 'Testus officinalis' })] })} />,
    );
    expect(
      within(screen.getByRole('list', { name: 'Steps' })).getByText(/Testus officinalis/),
    ).toBeInTheDocument();
  });

  it('gives an ingredient a Quick Look eye, not a link on its name, and a one-off neither, marking it One-Off', () => {
    render(
      <SpellRecipe
        {...props({
          steps: [
            ingredient('a', {
              look: {
                href: '/coven/fixture-coven/ingredients?entry=i1' as Route,
                name: 'Testwort',
                canonicalName: null,
                nomenclature: 'none',
              },
            }),
            ingredient('b', { name: 'Fixture Moss', form: 'fresh', oneOff: true }),
          ],
        })}
      />,
    );
    const steps = screen.getByRole('list', { name: 'Steps' });
    expect(within(steps).getAllByRole('link')).toHaveLength(1);
    expect(within(steps).getByRole('link', { name: /Quick Look Testwort/ })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients?entry=i1',
    );
    expect(within(steps).getByText('Testwort').closest('a')).toBeNull();
    expect(within(steps).getByText(/Fixture Moss \(Fresh\)/)).toBeInTheDocument();
    const oneOff = within(steps).getByRole('button', { name: 'One-Off' });
    expect(oneOff).toHaveAccessibleDescription(
      'Used in this spell only; not kept in your cupboard.',
    );
  });

  it('marks a toxic ingredient Toxic and one with safety notes Caution, and a one-off neither', () => {
    render(
      <SpellRecipe
        {...props({
          steps: [
            ingredient('a', { safety: { toxic: true } }),
            ingredient('b', { name: 'Fixture Rue', safety: { safetyNotes: 'Wash hands.' } }),
            ingredient('c', { name: 'Fixture Moss', oneOff: true }),
          ],
        })}
      />,
    );
    const steps = screen.getByRole('list', { name: 'Steps' });
    const rows = within(steps).getAllByRole('listitem');
    expect(within(rows[0]!).getByText('Toxic')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Caution')).toBeInTheDocument();
    expect(within(rows[2]!).queryByText(/Toxic|Caution/)).toBeNull();
  });

  it('shows the note, with no heading, and none when blank', () => {
    const { rerender } = render(<SpellRecipe {...props({ note: 'Best at dusk.' })} />);
    expect(screen.getByText('Best at dusk.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Note' })).toBeNull();
    rerender(<SpellRecipe {...props({ note: '  ' })} />);
    expect(screen.queryByText('Best at dusk.')).toBeNull();
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

  it('says who last edited the spell above the title (the owner, 2026-10-29)', () => {
    render(
      <SpellRecipe
        {...props({ lastEdit: { by: 'Fixture Author', at: '2026-10-01T12:00:00.000Z' } })}
      />,
    );
    const edited = screen.getByText(/Fixture Author/);
    const title = screen.getByRole('heading', { level: 1, name: 'Fixture Working' });
    expect(edited.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws the aside it is given after the body, and none otherwise', () => {
    const { rerender } = render(<SpellRecipe {...props({ note: 'Best at dusk.' })} />);
    expect(screen.queryByRole('complementary')).toBeNull();
    rerender(
      <SpellRecipe
        {...props({
          note: 'Best at dusk.',
          aside: <section aria-label="Fixture Aside">Beside</section>,
        })}
      />,
    );
    const aside = screen.getByRole('complementary');
    expect(within(aside).getByRole('region', { name: 'Fixture Aside' })).toBeInTheDocument();
    const note = screen.getByText('Best at dusk.');
    expect(note.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
