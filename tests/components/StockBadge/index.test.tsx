import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockBadge, stockState } from '@/components/StockBadge';
import { JAR_STATES } from '../../support/jar-states';

// M9.8, story 23 (claude-docs/components/stock-badge.md): the shared jar
// states (tests/support/jar-states.ts) give their badge, proven by the badge's presence or absence per
// state. Each badge is an icon alone, so it is found by its name as a screen
// reader hears it; what is asserted is which of the two shows, never copy
// around them.

const out = () => screen.queryByRole('button', { name: 'Out of Stock' });
const low = () => screen.queryByRole('button', { name: /^Low Stock/ });

describe('stockState: the shared table of jar states', () => {
  it.each(JAR_STATES)('$label', ({ quantity, threshold, expected }) => {
    expect(stockState(quantity, threshold)).toBe(expected);
  });

  // Not in the shared list, which is also written to the database, where a
  // missing value is null: a caller may pass undefined for a field not loaded.
  it('reads undefined as null', () => {
    expect(stockState(undefined, undefined)).toBe('ok');
  });
});

describe('StockBadge', () => {
  it('draws its icon alone for each state: the words are in the name and the tip, not on the badge', () => {
    const { container, rerender } = render(<StockBadge quantity={0} threshold={10} unit="g" />);
    expect(container.querySelector('button')).toHaveTextContent('');
    rerender(<StockBadge quantity={6} threshold={10} unit="g" />);
    expect(container.querySelector('button')).toHaveTextContent('');
  });

  it('shows Out of Stock for a jar at zero: a focusable button, named in full, with nothing to add to its name', () => {
    render(<StockBadge quantity={0} threshold={10} unit="g" />);
    const badge = out()!;
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAccessibleName('Out of Stock');
    expect(badge).toHaveAccessibleDescription('');
    expect(low()).toBeNull();
    act(() => badge.focus());
    expect(badge).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Out of Stock');
  });

  it('shows Low Stock with the quantity in its name, and the level as its description', () => {
    render(<StockBadge quantity={6} threshold={10} unit="g" />);
    const badge = screen.getByRole('button', { name: 'Low Stock, 6 g' });
    expect(badge).toHaveAccessibleDescription('Low at 10 g or less');
    expect(out()).toBeNull();
  });

  it('writes a quantity with no unit as a plain number', () => {
    render(<StockBadge quantity={6} threshold={10} unit={null} />);
    expect(screen.getByRole('button', { name: 'Low Stock, 6' })).toHaveAccessibleDescription(
      'Low at 10 or less',
    );
  });

  it('shows nothing above the threshold, for a zero threshold or for an unweighed jar', () => {
    const { container, rerender } = render(<StockBadge quantity={11} threshold={10} unit="g" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StockBadge quantity={5} threshold={0} unit="g" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StockBadge quantity={null} threshold={10} unit="g" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['Low', 6, 'Low Stock, 6 g', /Low Stock · 6 g.*Low at 10 g or less/],
    ['Out of Stock', 0, 'Out of Stock', /^Out of Stock$/],
  ])(
    'opens the %s tip on focus, on hover and on a tap, and closes it on Escape',
    (_, quantity, name, words) => {
      vi.useFakeTimers();
      try {
        render(<StockBadge quantity={quantity} threshold={10} unit="g" />);
        const badge = screen.getByRole('button', { name });
        const tip = () => screen.queryByRole('tooltip');
        expect(tip()).toBeNull();

        act(() => badge.focus());
        expect(tip()).toHaveTextContent(words);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(tip()).toBeNull();
        act(() => badge.blur());

        fireEvent.mouseEnter(badge);
        act(() => vi.advanceTimersByTime(300));
        expect(tip()).toBeInTheDocument();
        fireEvent.mouseLeave(badge);
        act(() => vi.advanceTimersByTime(200));
        expect(tip()).toBeNull();

        fireEvent.click(badge);
        expect(tip()).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it('lets the pointer rest on the tip: moving from the badge onto it keeps it open', () => {
    vi.useFakeTimers();
    try {
      render(<StockBadge quantity={6} threshold={10} unit="g" />);
      const badge = screen.getByRole('button', { name: /^Low Stock/ });
      fireEvent.mouseEnter(badge);
      act(() => vi.advanceTimersByTime(300));
      const tip = screen.getByRole('tooltip');
      // Leaving the badge for the tip: the wrapper holds both, so the pointer
      // enters again before the close delay is up.
      fireEvent.mouseLeave(badge);
      fireEvent.mouseEnter(tip);
      act(() => vi.advanceTimersByTime(500));
      expect(screen.queryByRole('tooltip')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('tells the two states apart without colour: a drawing each', () => {
    const { container, rerender } = render(<StockBadge quantity={0} threshold={10} unit="g" />);
    const outDrawing = container.querySelector('svg')!.innerHTML;
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<StockBadge quantity={6} threshold={10} unit="g" />);
    expect(container.querySelector('svg')!.innerHTML).not.toBe(outDrawing);
  });
});
