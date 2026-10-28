import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComparisonPanel } from '@/components/SpellBuilder/comparison-panel';
import type { SpellStepValue } from '@/components/SpellBuilder/steps/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The intent-against-ingredients panel (M10.17, story 52): both gaps, named
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
    note: null,
    icon: null,
    categories: categories.map(cat),
    jarUnit: null,
    safety: null,
    jar: null,
    ...extra,
  } satisfies SpellStepValue;
}

const panel = () => screen.getByRole('complementary', { name: 'Intent Against Ingredients' });

describe('ComparisonPanel', () => {
  it('names an intended category nothing in the jar carries', () => {
    render(
      <ComparisonPanel intended={[cat('Prosperity')]} steps={[step('Fixture Mugwort', [])]} />,
    );
    const list = within(panel()).getByRole('list', { name: 'Intended, Not Carried' });
    expect(list).toHaveTextContent('Prosperity');
    expect(list).toHaveTextContent('nothing in the jar carries it');
  });

  it('names a category carried but not intended, with the ingredient that brings it', () => {
    render(
      <ComparisonPanel
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Mugwort', ['Psychic Work'])]}
      />,
    );
    const list = within(panel()).getByRole('list', { name: 'Carried, Not Intended' });
    expect(list).toHaveTextContent('Fixture Mugwort');
    expect(list).toHaveTextContent('Psychic Work');
  });

  it('says in words which ingredient carries nothing intended, and lists it first', () => {
    render(
      <ComparisonPanel
        intended={[cat('Prosperity')]}
        steps={[
          step('Fixture Basil', ['Prosperity', 'Cleansing']),
          step('Fixture Mugwort', ['Psychic Work']),
        ]}
      />,
    );
    const items = within(
      within(panel()).getByRole('list', { name: 'Carried, Not Intended' }),
    ).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Fixture Mugwort');
    expect(items[0]).toHaveTextContent('Carries nothing you intended');
    expect(items[1]).toHaveTextContent('Fixture Basil');
    expect(items[1]).toHaveTextContent('Also carries Prosperity');
    expect(items[1]).not.toHaveTextContent('nothing you intended');
  });

  it('draws the matched state when the two agree', () => {
    render(
      <ComparisonPanel
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Basil', ['Prosperity'])]}
      />,
    );
    expect(within(panel()).getByText('Intent and ingredients match.')).toBeVisible();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('asks for something to compare while there are no categories and no ingredients', () => {
    render(<ComparisonPanel intended={[]} steps={[]} />);
    expect(within(panel()).getByText(/Nothing to compare yet/)).toBeVisible();
  });

  it('does not call every ingredient stray while no category is intended', () => {
    render(<ComparisonPanel intended={[]} steps={[step('Fixture Basil', ['Cleansing'])]} />);
    expect(within(panel()).getByText(/Pick categories above/)).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Carried, Not Intended' })).toBeNull();
  });

  it('ignores an instruction and a one-off', () => {
    render(
      <ComparisonPanel
        intended={[cat('Prosperity')]}
        steps={[
          step('Fixture Oddment', ['Cleansing'], { ingredientId: null, variantId: null }),
          step('x', [], { name: null, body: 'Stir.', ingredientId: null }),
        ]}
      />,
    );
    expect(screen.queryByRole('list', { name: 'Carried, Not Intended' })).toBeNull();
    expect(screen.getByRole('list', { name: 'Intended, Not Carried' })).toBeVisible();
  });
});

describe('the panel in the builder', () => {
  it('moves as an ingredient is removed, saved or not', async () => {
    const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
    const ward = { id: id(1), name: 'Testward' };
    offerCategories([
      {
        ...ward,
        description: 'Keeps a fixture from harm.',
        group: { id: id(2), name: 'Fixtures', colorDark: '#8fb8de', colorLight: '#2f5d86' },
      },
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
                note: null,
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
    const list = await screen.findByRole('list', { name: 'Carried, Not Intended' });
    expect(list).toHaveTextContent('Fixture Rosewort');
    expect(screen.getByRole('list', { name: 'Intended, Not Carried' })).toHaveTextContent(
      'Testward',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove Fixture Rosewort' }));
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: 'Carried, Not Intended' })).toBeNull(),
    );
  });
});
