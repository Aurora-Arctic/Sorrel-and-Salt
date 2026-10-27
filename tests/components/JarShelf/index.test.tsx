import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JarShelf from '@/components/JarShelf';
import { fillOf } from '@/components/JarShelf/level';
import { LIQUID, pick } from '@/components/JarShelf/pick';
import { BOTTLES, JARS } from '@/components/JarShelf/shapes';
import type { ShelfForm } from '@/components/JarShelf/types';

// The shelf of drawn jars on the entry page (M12.29): which vessel a form gets, how full it
// stands, and what the shelf says for a form with a jar and one without. The press that opens
// Edit Stock is proved with the entry, in tests/components/IngredientEntry.

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('the vessel pick', () => {
  it('draws the same vessel for the same name and form, whatever the case or spacing', () => {
    expect(pick('Testwort', 'dried leaf')).toBe(pick('Testwort', 'dried leaf'));
    expect(pick('Testwort', 'dried leaf')).toBe(pick('  TESTWORT ', ' Dried Leaf '));
  });

  it('gives a poured form a bottle and any other form a jar', () => {
    for (const seed of ['Testwort', 'Mockbane', 'Examplewort', 'a-uuid-like-id']) {
      expect(BOTTLES).toContain(pick(seed, 'oil'));
      expect(BOTTLES).toContain(pick(seed, 'Tincture'));
      expect(JARS).toContain(pick(seed, 'dried leaf'));
      expect(JARS).toContain(pick(seed, 'powder'));
    }
    expect(LIQUID.test('essential oil')).toBe(true);
    expect(LIQUID.test('powder')).toBe(false);
  });

  it('is not one vessel for everything: the name and the form both move it', () => {
    const names = ['Testwort', 'Mockbane', 'Examplewort', 'Sampleroot', 'Dummybloom', 'Fakeleaf'];
    const forms = ['powder', 'resin', 'dried leaf', 'fresh herb', 'seed'];
    const drawn = new Set(names.flatMap((name) => forms.map((form) => pick(name, form))));
    expect(drawn.size).toBeGreaterThan(2);
  });
});

describe('fillOf', () => {
  it('stands a jar at its threshold half full, with the mark half way', () => {
    expect(fillOf({ quantity: 50, threshold: 50 })).toEqual({ level: 0.5, mark: 0.5 });
  });

  it('stands a jar of twice its threshold or more full, the mark moving down as it does', () => {
    expect(fillOf({ quantity: 100, threshold: 50 })).toEqual({ level: 1, mark: 0.5 });
    expect(fillOf({ quantity: 200, threshold: 50 })).toEqual({ level: 1, mark: 0.25 });
  });

  it('draws a jar of nothing empty, though its threshold still shows', () => {
    expect(fillOf({ quantity: 0, threshold: 20 })).toEqual({ level: 0, mark: 0.5 });
    expect(fillOf({ quantity: 0, threshold: null })).toEqual({ level: 0, mark: null });
  });

  it('stands a jar with no threshold at a steady height with no mark', () => {
    expect(fillOf({ quantity: 12, threshold: null })).toEqual({ level: 0.7, mark: null });
    expect(fillOf({ quantity: 12, threshold: 0 })).toEqual({ level: 0.7, mark: null });
  });

  it('stands an unmeasured jar at that height too, not empty', () => {
    expect(fillOf({ quantity: null, threshold: null })).toEqual({ level: 0.7, mark: null });
    expect(fillOf({ quantity: null, threshold: 30 })).toEqual({ level: 0.7, mark: null });
  });
});

const FORMS: ShelfForm[] = [
  {
    variantId: 'v1',
    form: 'dried leaf',
    jar: { id: 'j1', quantity: 250, unit: 'g', threshold: 30 },
  },
  { variantId: 'v2', form: 'oil', jar: { id: 'j2', quantity: 0, unit: 'ml', threshold: 10 } },
  {
    variantId: 'v3',
    form: 'resin',
    jar: { id: 'j3', quantity: null, unit: null, threshold: null },
  },
  { variantId: 'v4', form: 'powder', jar: null },
];

describe('JarShelf', () => {
  it('lists one jar per form, in the order given, under the name Jars', () => {
    render(<JarShelf forms={FORMS} seed="Testwort" />);

    const shelf = screen.getByRole('list', { name: 'Jars' });
    const jars = within(shelf).getAllByRole('listitem');
    expect(jars).toHaveLength(4);
    expect(
      jars.map((jar) => /^(Dried Leaf|Oil|Resin|Powder)/.exec(jar.textContent ?? '')?.[0]),
    ).toEqual(['Dried Leaf', 'Oil', 'Resin', 'Powder']);
  });

  it('writes each held jar’s amount, with Unmeasured for one with none, and No Jar for a form without', () => {
    render(<JarShelf forms={FORMS} seed="Testwort" />);

    const [leaf, oil, resin, powder] = screen.getAllByRole('listitem');
    expect(leaf).toHaveTextContent('250 g');
    expect(oil).toHaveTextContent('0 ml');
    expect(resin).toHaveTextContent('Unmeasured');
    expect(powder).toHaveTextContent('No Jar');
  });

  it('tells a jar that is out or low by a button on its amount, and only that one', () => {
    render(
      <JarShelf
        forms={[
          ...FORMS,
          {
            variantId: 'v5',
            form: 'seed',
            jar: { id: 'j5', quantity: 4, unit: 'g', threshold: 10 },
          },
        ]}
        seed="Testwort"
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).queryByRole('button', { name: /Stock/ })).toBeNull();
    expect(within(items[1]!).getByRole('button', { name: '0 ml, Out of Stock' })).toHaveTextContent(
      '0 ml',
    );
    expect(within(items[4]!).getByRole('button', { name: '4 g, Low Stock' })).toHaveTextContent(
      '4 g',
    );
    // Unmeasured and empty jars have nothing to flag, so their text stays plain.
    expect(within(items[2]!).queryByRole('button')).toBeNull();
    expect(within(items[3]!).queryByRole('button')).toBeNull();
  });

  it('describes a low jar by the level it is low at, and an out jar by its name alone', () => {
    render(
      <JarShelf
        forms={[
          {
            variantId: 'v1',
            form: 'seed',
            jar: { id: 'j1', quantity: 4, unit: 'g', threshold: 10 },
          },
          {
            variantId: 'v2',
            form: 'oil',
            jar: { id: 'j2', quantity: 0, unit: 'ml', threshold: 10 },
          },
          {
            variantId: 'v3',
            form: 'resin',
            jar: { id: 'j3', quantity: 3, unit: null, threshold: 5 },
          },
        ]}
        seed="Testwort"
      />,
    );

    expect(screen.getByRole('button', { name: '4 g, Low Stock' })).toHaveAccessibleDescription(
      'Low Stock at 10 g or less',
    );
    expect(screen.getByRole('button', { name: '0 ml, Out of Stock' })).toHaveAccessibleDescription(
      '',
    );
    expect(screen.getByRole('button', { name: '3, Low Stock' })).toHaveAccessibleDescription(
      'Low Stock at 5 or less',
    );
  });

  it('hides every drawing from a screen reader and gives each its own clip', () => {
    const { container } = render(<JarShelf forms={FORMS} seed="Testwort" />);

    // Four jars, and the Out of Stock symbol beside the oil's amount.
    const drawings = container.querySelectorAll('svg');
    expect(drawings).toHaveLength(5);
    for (const drawing of drawings) expect(drawing).toHaveAttribute('aria-hidden', 'true');
    const ids = [...container.querySelectorAll('clipPath')].map((clip) => clip.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws plain figures, with no button for a jar, when nothing may be edited', () => {
    render(<JarShelf forms={FORMS} seed="Testwort" />);

    expect(screen.queryByRole('button', { name: /^Edit Stock/ })).toBeNull();
  });

  it('draws a button for every jar, an empty one too, named for the ingredient and form, when it may', () => {
    render(
      <JarShelf
        forms={FORMS}
        seed="Testwort"
        edit={{
          workspaceId: 'w1',
          ingredientId: 'i1',
          ingredientName: 'Testwort',
          forms: FORMS.map(({ variantId, form }) => ({ variantId, label: form })),
          jars: [],
        }}
      />,
    );

    for (const form of ['Dried Leaf', 'Oil', 'Resin', 'Powder']) {
      expect(
        screen.getByRole('button', { name: `Edit Stock, Testwort, ${form}` }),
      ).toBeInTheDocument();
    }
    // The amount of a flagged jar is its own button, beside the jar's and not inside it.
    const amount = screen.getByRole('button', { name: '0 ml, Out of Stock' });
    expect(amount.closest('button[aria-label^="Edit Stock"]')).toBeNull();
  });
});
