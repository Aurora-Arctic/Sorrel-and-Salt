import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComparisonPanel } from '@/components/SpellBuilder/comparison-panel';
import type { SpellStepValue } from '@/components/SpellBuilder/steps/types';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { renderWithQuery } from '../../support/render-with-query';
import {
  RANKED_EXTRAS,
  categoryNamed as cat,
  colouredGroups,
  stepValue as step,
} from '../../support/spell-step-values';

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

const groups = colouredGroups(['Prosperity', 'Love', 'Cleansing', 'Psychic Work']);

const panel = () => screen.getByRole('region', { name: 'Category Match' });
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
      render(
        <ComparisonPanel
          groups={colouredGroups(names)}
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

  describe('the Extra row’s order', () => {
    // Each case is built so the steps' first-met order, and plain name order, differ from the order asked for.
    const extraOrder = () =>
      within(row('Extra') as HTMLElement)
        .getAllByRole('button')
        .map((chip) => chip.textContent);
    const drawn = (steps: readonly SpellStepValue[], names: readonly string[]) =>
      render(
        <ComparisonPanel
          groups={colouredGroups(names)}
          intended={[cat('Prosperity')]}
          steps={steps}
        />,
      );

    it('puts the category the most ingredients add first', () => {
      drawn(RANKED_EXTRAS.steps, RANKED_EXTRAS.names);
      expect(extraOrder()).toEqual(RANKED_EXTRAS.order);
    });

    it('counts an ingredient laid in two steps once', () => {
      // Fixture Basil is laid three times, in two forms: counted by steps Testbane would lead, counted by ingredients it trails.
      const basil = (variantId: string) => step('Fixture Basil', ['Testbane'], { variantId });
      drawn(
        [
          basil('v-dried'),
          basil('v-fresh'),
          basil('v-dried'),
          step('Fixture Mugwort', ['Testcalm']),
          step('Fixture Rue', ['Testcalm']),
        ],
        ['Testbane', 'Testcalm'],
      );
      expect(extraOrder()).toEqual(['Testcalm', 'Testbane']);
    });

    it('orders categories added by as many ingredients by name', () => {
      drawn(
        [
          step('Fixture Basil', ['Testzephyr', 'Testmoss']),
          step('Fixture Mugwort', ['Testamber', 'Testmoss']),
        ],
        ['Testzephyr', 'Testamber', 'Testmoss'],
      );
      expect(extraOrder()).toEqual(['Testmoss', 'Testamber', 'Testzephyr']);
    });

    it('folds the categories the fewest ingredients add, past eight chips', () => {
      const names = Array.from({ length: 9 }, (_, i) => `Fixture Extra ${i + 1}`);
      // Fixture Extra 1 is met first and sorts first by name, but one ingredient adds it and two add each of the rest.
      drawn([step('Fixture Basil', names), step('Fixture Mugwort', names.slice(1))], names);
      const extra = within(row('Extra') as HTMLElement);
      expect(extra.getByRole('button', { name: /1 more category for Extra/ })).toBeVisible();
      expect(extraOrder().filter((text) => text?.startsWith('Fixture Extra'))).toEqual(
        names.slice(1),
      );
    });
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
      'Assigned to this spell, and nothing in the jar carries it.',
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

  it('draws each row’s categories in their group colours', () => {
    render(
      <ComparisonPanel
        groups={groups}
        intended={[cat('Prosperity')]}
        steps={[step('Fixture Basil', ['Prosperity'])]}
      />,
    );
    const chips = within(row('Carried') as HTMLElement).getByRole('list', { name: 'Categories' });
    const chip = within(chips).getByText('Prosperity');
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
    renderWithQuery(
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
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
    await waitFor(() =>
      expect(
        within(row('Extra') as HTMLElement).getByRole('button', { name: 'Calm' }),
      ).toBeVisible(),
    );
    expect(row('Missing')).toHaveTextContent('Testward');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Fixture Rosewort (Dried Leaf)' }));
    await waitFor(() => expect(row('Extra')).toBeNull());
    expect(row('Missing')).toHaveTextContent('Testward');
  });

  it('orders the Extra row by how many ingredients add each category, as the spell page does', async () => {
    // RANKED_EXTRAS laid as a saved spell, the jar the spell page's side column is tested with too.
    const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
    const group = { id: id(1), name: 'Fixtures', colorDark: '#8fb8de', colorLight: '#2f5d86' };
    const [intent, bane, calm, ward] = ['Testintent', 'Testbane', 'Testcalm', 'Testward'].map(
      (name, i) => ({ id: id(10 + i), name }),
    );
    offerCategories(
      [intent, bane, calm, ward].map((c) => ({ ...c, description: 'A fixture.', group })),
    );
    const laid = (n: number, name: string, categories: { id: string; name: string }[]) => ({
      id: id(20 + n),
      name,
      form: null,
      quantity: null,
      unit: null,
      body: null,
      ingredient: { id: id(30 + n), toxic: false, safetyNotes: null, categories, stock: [] },
      variant: {
        id: id(40 + n),
        toxic: false,
        safetyNotes: null,
        categories: [],
        formChoice: null,
      },
    });
    renderWithQuery(
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
          categoryIds: [intent.id],
          steps: [
            laid(1, 'Fixture Basil', [bane, calm]),
            laid(2, 'Fixture Mugwort', [ward, calm]),
            laid(3, 'Fixture Rue', [ward]),
            laid(4, 'Fixture Sage', [ward]),
          ],
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
    await waitFor(() =>
      expect(
        within(row('Extra') as HTMLElement).getByRole('button', { name: 'Testbane' }),
      ).toBeVisible(),
    );
    expect(
      within(row('Extra') as HTMLElement)
        .getAllByRole('button')
        .map((chip) => chip.textContent),
    ).toEqual(RANKED_EXTRAS.order);
  });
});
