import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComparisonPanel } from '@/components/SpellBuilder/comparison-panel';
import type { SpellStepValue } from '@/components/SpellBuilder/steps/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The intent-against-ingredients panel: both gaps, named
// apart, and the ingredient with no reason to be in the jar singled out in
// words. The panel is drawn from what the builder holds now, saved or not.

const cat = (name: string) => ({ id: `c-${name}`, name });

function step(name: string, categories: string[], extra: Partial<SpellStepValue> = {}) {
  return {
    stepId: null,
    ingredientId: `i-${name}`,
    variantId: `v-${name}`,
    name,
    form: null,
    quantity: '',
    unit: '',
    savedUnit: null,
    body: null,
    icon: null,
    categories: categories.map(cat),
    jarUnit: null,
    safety: null,
    jar: null,
    ...extra,
  } satisfies SpellStepValue;
}

const groups = new Map(
  ['Prosperity', 'Love', 'Cleansing', 'Psychic Work'].map((name) => [
    `c-${name}`,
    { colorDark: '#8fb8de', colorLight: '#2f5d86' },
  ]),
);

const panel = () => screen.getByRole('region', { name: 'Category Match' });
/** The chips on one of the three rows (Carried, Missing, Extra), or null if the row is left out. */
const row = (label: 'Carried' | 'Missing' | 'Extra') => {
  const term = within(panel()).queryByText(label, { selector: 'dt' });
  return term ? (term.nextElementSibling as HTMLElement) : null;
};

describe('ComparisonPanel', () => {
  it('puts an intended category nothing in the jar carries on the Missing row', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Mugwort', [])]}
      />,
    );
    expect(row('Missing')).toHaveTextContent('Prosperity');
    expect(row('Carried')).toBeNull();
  });

  it('puts a category carried but not intended on the Extra row, as one chip', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Mugwort', ['Psychic Work'])]}
      />,
    );
    expect(row('Extra')).toHaveTextContent('Psychic Work');
    expect(within(row('Extra') as HTMLElement).getAllByRole('button')).toHaveLength(1);
  });

  describe('the Extra row past eight chips', () => {
    const many = (count: number) => {
      const names = Array.from({ length: count }, (_, i) => `Fixture Extra ${i + 1}`);
      const wide = new Map(
        names.map((name) => [`c-${name}`, { colorDark: '#8fb8de', colorLight: '#2f5d86' }]),
      );
      render(
        <ComparisonPanel
          groups={wide}
          intended={[cat('Prosperity')]}
          steps={[step('Fixture Mugwort', names)]}
        />,
      );
      return within(row('Extra') as HTMLElement);
    };

    it('draws eight chips and a +N for the rest at nine', () => {
      const extra = many(9);
      expect(
        extra.getAllByRole('button').filter((b) => b.textContent?.startsWith('Fixture Extra')),
      ).toHaveLength(8);
      expect(extra.getByRole('button', { name: /1 more category for Extra/ })).toHaveTextContent(
        '+1',
      );
    });

    it('counts every chip past eight in the +N', () => {
      expect(
        many(12).getByRole('button', { name: /4 more categories for Extra/ }),
      ).toHaveTextContent('+4');
    });

    it('draws no +N at eight', () => {
      const extra = many(8);
      expect(extra.getAllByRole('button')).toHaveLength(8);
      expect(extra.queryByRole('button', { name: /more categor/ })).toBeNull();
    });
  });

  it('shows an extra category once, however many ingredients carry it', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[
          step('Fixture Basil', ['Prosperity', 'Cleansing']),
          step('Fixture Mugwort', ['Cleansing']),
        ]}
      />,
    );
    const extra = row('Extra') as HTMLElement;
    expect(within(extra).getAllByRole('listitem')).toHaveLength(1);
    expect(within(extra).getByText('Cleansing')).toBeVisible();
    expect(within(extra).getAllByRole('button')).toHaveLength(1);
    expect(row('Carried')).toHaveTextContent('Prosperity');
  });

  it('tells every chip what it is from, to a screen reader, on focus, and on a tap', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity'), cat('Love')]}
        steps={[
          step('Fixture Basil (Dried)', ['Prosperity', 'Cleansing']),
          step('Fixture Mugwort', ['Prosperity']),
        ]}
      />,
    );
    const named = (name: string) => within(panel()).getByRole('button', { name });
    expect(named('Prosperity')).toHaveAccessibleDescription(
      'From Fixture Basil (Dried), Fixture Mugwort',
    );
    expect(named('Cleansing')).toHaveAccessibleDescription('From Fixture Basil (Dried)');
    expect(named('Love')).toHaveAccessibleDescription(
      'Assigned to this spell, and nothing in the jar carries it',
    );
    // The drawn tip is decoration (aria-hidden), so it is found by its role with hidden on.
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
    fireEvent.click(named('Prosperity'));
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent(
      'From Fixture Basil (Dried), Fixture Mugwort',
    );
  });

  it('draws every chip of a row, with no +N button', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Basil', ['Cleansing', 'Love', 'Psychic Work'])]}
      />,
    );
    const extra = row('Extra') as HTMLElement;
    expect(within(extra).getAllByRole('button')).toHaveLength(3);
    expect(within(extra).queryByRole('button', { name: /more categories/ })).toBeNull();
  });

  it('draws each row as category chips in the category group colours', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Basil', ['Prosperity'])]}
      />,
    );
    const chips = within(row('Carried') as HTMLElement).getByRole('list', { name: 'Categories' });
    const chip = within(chips).getByText('Prosperity');
    expect(chip).toHaveClass('chip');
    expect(chip).toHaveStyle({ '--chip-dark': '#8fb8de', '--chip-light': '#2f5d86' });
  });

  it('shows only Carried when the two agree, and leaves the other rows out', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Basil', ['Prosperity'])]}
      />,
    );
    expect(row('Carried')).toHaveTextContent('Prosperity');
    expect(row('Missing')).toBeNull();
    expect(row('Extra')).toBeNull();
  });

  it('asks for something to compare while there are no categories and no ingredients', () => {
    render(<ComparisonPanel groups={groups} intended={[]} steps={[]} />);
    expect(within(panel()).getByText('Nothing to compare yet.')).toBeVisible();
  });

  it('does not call every ingredient extra while no category is intended', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[]}
        steps={[step('Fixture Basil', ['Cleansing'])]}
      />,
    );
    expect(within(panel()).getByText('Assign categories to compare.')).toBeVisible();
    expect(row('Extra')).toBeNull();
  });

  it('ignores an instruction and a one-off', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[
          step('Fixture Oddment', ['Cleansing'], { ingredientId: null, variantId: null }),
          step('x', [], { name: null, body: 'Stir.', ingredientId: null }),
        ]}
      />,
    );
    expect(row('Extra')).toBeNull();
    expect(row('Missing')).toHaveTextContent('Prosperity');
  });
});

describe('the panel in the builder', () => {
  it('moves as an ingredient is removed, saved or not', async () => {
    const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
    const ward = { id: id(1), name: 'Testward' };
    const group = { id: id(2), name: 'Fixtures', colorDark: '#8fb8de', colorLight: '#2f5d86' };
    offerCategories([
      { ...ward, description: 'Keeps a fixture from harm.', group },
      { id: id(5), name: 'Calm', description: 'Settles a fixture.', group },
    ]);
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <SpellBuilder
          workspaceId="w1"
          spell={{
            id: 's9',
            revision: 1,
            title: 'Hedge Ward',
            intent: null,
            jarDescription: null,
            sealWaxColor: null,
            moonPhase: null,
            dayOfWeek: null,
            note: null,
            visibility: 'workspace',
            categoryIds: [ward.id],
            steps: [
              {
                id: id(3),
                name: 'Fixture Rosewort',
                form: 'dried leaf',
                quantity: null,
                unit: null,
                body: null,
                ingredient: {
                  id: id(4),
                  toxic: false,
                  safetyNotes: null,
                  categories: [{ id: id(5), name: 'Calm' }],
                  stock: [],
                },
                variant: {
                  id: id(6),
                  toxic: false,
                  safetyNotes: null,
                  categories: [],
                  formChoice: null,
                },
              },
            ],
          }}
        />
      </QueryClientProvider>,
    );
    // A saved spell opens with its sections shut; the panel is in the Jar's.
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
    await waitFor(() =>
      expect(
        within(row('Extra') as HTMLElement).getByRole('button', { name: 'Calm' }),
      ).toBeVisible(),
    );
    expect(row('Missing')).toHaveTextContent('Testward');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Fixture Rosewort' }));
    await waitFor(() => expect(row('Extra')).toBeNull());
    expect(row('Missing')).toHaveTextContent('Testward');
  });
});
