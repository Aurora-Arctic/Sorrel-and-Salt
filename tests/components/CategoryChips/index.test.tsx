import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CategoryChips from '@/components/CategoryChips';
import { CATEGORY_CHIP_LIMIT } from '@/components/CategoryChips/constants';

// The chip row the ingredient card and the admin compendium list share: the first few chips, the rest behind a +N toggletip (claude-docs/components/category-chips.md).
// The row measures nothing, so jsdom is enough here; where the panel lands is proved in a browser (tests/e2e/admin-compendium.spec.ts).

const GROUP = { colorDark: '#112233', colorLight: '#445566' };
const many = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    category: { id: `c${i}`, name: `Fixture Category ${i + 1}` },
    group: GROUP,
  }));
const more = () => screen.queryByRole('button', { name: /more categories?/i });
const panel = () => screen.queryByRole('group', { name: /more categories/i });
const chips = () =>
  within(screen.getByRole('list', { name: 'Categories' }))
    .getAllByRole('listitem')
    // The More item holds a button, and the chips it opens sit in its panel.
    .filter((item) => !within(item).queryByRole('button') && !panel()?.contains(item));

describe('CategoryChips', () => {
  it('lists each category as plain text, not a link or a button', () => {
    render(<CategoryChips categories={many(2)} label="Testwort" />);

    const list = screen.getByRole('list', { name: 'Categories' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Fixture Category 1')).toBeInTheDocument();
    expect(within(list).queryByRole('link')).toBeNull();
    expect(within(list).queryByRole('button')).toBeNull();
  });

  it('draws no row for an entry with none', () => {
    render(<CategoryChips categories={[]} label="Testwort" />);

    expect(screen.queryByRole('list', { name: 'Categories' })).toBeNull();
  });

  it('shows the first few chips and counts the rest on the button', () => {
    render(<CategoryChips categories={many(8)} label="Testwort" />);

    expect(chips()).toHaveLength(CATEGORY_CHIP_LIMIT);
    expect(more()).toHaveTextContent(`+${8 - CATEGORY_CHIP_LIMIT}`);
    expect(more()).toHaveAccessibleName(`${8 - CATEGORY_CHIP_LIMIT} more categories for Testwort`);
    expect(more()).toHaveAttribute('aria-expanded', 'false');
  });

  it('has no button when every chip is within the limit', () => {
    render(<CategoryChips categories={many(CATEGORY_CHIP_LIMIT)} label="Testwort" />);

    expect(more()).toBeNull();
    expect(chips()).toHaveLength(CATEGORY_CHIP_LIMIT);
  });

  it('keeps the rest out of reach until the button is used, then lists them', () => {
    render(<CategoryChips categories={many(CATEGORY_CHIP_LIMIT + 2)} label="Testwort" />);

    expect(panel()).toBeNull();
    fireEvent.click(more()!);

    const open = screen.getByRole('group', { name: /more categories/i });
    expect(more()).toHaveAttribute('aria-expanded', 'true');
    expect(more()).toHaveAttribute('aria-controls', open.id);
    expect(within(open).getByText(`Fixture Category ${CATEGORY_CHIP_LIMIT + 1}`)).toBeVisible();
    expect(within(open).getByText(`Fixture Category ${CATEGORY_CHIP_LIMIT + 2}`)).toBeVisible();
    expect(within(open).queryByText(`Fixture Category ${CATEGORY_CHIP_LIMIT}`)).toBeNull();
  });

  it('closes on a second click, and on Escape with focus back on the button', () => {
    render(<CategoryChips categories={many(CATEGORY_CHIP_LIMIT + 2)} label="Testwort" />);

    fireEvent.click(more()!);
    fireEvent.click(more()!);
    expect(panel()).toBeNull();

    fireEvent.click(more()!);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(panel()).toBeNull();
    expect(more()).toHaveFocus();
  });

  describe('hover', () => {
    afterEach(() => vi.useRealTimers());

    it('opens after the pointer rests 300ms, as every tip does', () => {
      vi.useFakeTimers();
      render(<CategoryChips categories={many(CATEGORY_CHIP_LIMIT + 2)} label="Testwort" />);

      fireEvent.mouseEnter(more()!.parentElement!);
      act(() => vi.advanceTimersByTime(299));
      expect(more()).toHaveAttribute('aria-expanded', 'false');
      act(() => vi.advanceTimersByTime(1));
      expect(more()).toHaveAttribute('aria-expanded', 'true');
    });

    it('opens nothing for a pointer that leaves before 300ms', () => {
      vi.useFakeTimers();
      render(<CategoryChips categories={many(CATEGORY_CHIP_LIMIT + 2)} label="Testwort" />);

      fireEvent.mouseEnter(more()!.parentElement!);
      act(() => vi.advanceTimersByTime(200));
      fireEvent.mouseLeave(more()!.parentElement!);
      // Never open at any point, not merely closed once the leave's grace has run.
      expect(more()).toHaveAttribute('aria-expanded', 'false');
      act(() => vi.advanceTimersByTime(1000));
      expect(more()).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('opens at once on focus and on a tap, and a press elsewhere closes it', () => {
    render(<CategoryChips categories={many(CATEGORY_CHIP_LIMIT + 2)} label="Testwort" />);

    fireEvent.click(more()!);
    expect(more()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.pointerDown(document.body);
    expect(more()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(more()!);
    expect(more()).toHaveAttribute('aria-expanded', 'true');
  });
  it('shows every chip and no +N button when asked to show them all', () => {
    render(<CategoryChips categories={many(CATEGORY_CHIP_LIMIT + 3)} label="Testwort" showAll />);

    expect(chips()).toHaveLength(CATEGORY_CHIP_LIMIT + 3);
    expect(more()).toBeNull();
  });
});

describe('a category only a form carries', () => {
  const own = (name: string) => ({ category: { id: name, name }, group: GROUP });
  const carried = (name: string, forms: string[]) => ({ ...own(name), forms });

  it('follows the own chips, and is a button whose tip names each form that carries it', () => {
    render(
      <CategoryChips
        categories={[own('Testward'), carried('Testcharm', ['Testoil', 'Dried Testleaf'])]}
        label="Testwort"
      />,
    );

    const items = within(screen.getByRole('list', { name: 'Categories' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // The own chip comes first, as plain text; the form's follows, a button carrying its tip.
    expect(within(items[0]).getByText('Testward')).toBeInTheDocument();
    expect(within(items[0]).queryByRole('button')).toBeNull();
    const chip = within(items[1]).getByRole('button', { name: 'Testcharm' });
    expect(chip).toHaveAccessibleDescription(expect.stringContaining('Testoil, Dried Testleaf'));
  });

  it('keeps its tip behind the +N button', () => {
    render(
      <CategoryChips
        categories={[...many(CATEGORY_CHIP_LIMIT + 1), carried('Testcharm', ['Testoil'])]}
        label="Testwort"
      />,
    );
    fireEvent.click(more()!);

    const chip = within(panel()!).getByRole('button', { name: 'Testcharm' });
    expect(chip).toHaveAccessibleDescription(expect.stringContaining('Testoil'));
  });
});
