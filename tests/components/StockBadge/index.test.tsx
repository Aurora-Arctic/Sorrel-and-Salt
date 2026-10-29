import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockBadge, stockState } from '@/components/StockBadge';
import { JAR_STATES } from '../../support/jar-states';

// Story 23 (claude-docs/components/stock-badge.md): the shared jar
// states (tests/support/jar-states.ts) give their badge, proven by the badge's presence or absence per
// state. Each badge is an icon alone, so it is found by its name as a screen
// reader hears it; what is asserted is which of the two shows, never copy
// around them.

const out = () => screen.queryByRole('button', { name: 'Out of Stock' });
// An icon tip's bubble is decoration, kept out of the accessibility tree, so it is found with `hidden`.
const tipEl = () => screen.queryByRole('tooltip', { hidden: true });
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
  it('shows Out of Stock for a jar at zero: a focusable button, named in full, with nothing to add to its name', () => {
    render(<StockBadge quantity={0} threshold={10} unit="g" />);
    const badge = out()!;
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAccessibleName('Out of Stock');
    expect(badge).toHaveAccessibleDescription('');
    expect(low()).toBeNull();
    act(() => badge.focus());
    expect(badge).toHaveFocus();
    expect(tipEl()).toHaveTextContent('Out of Stock');
  });

  it('shows Low Stock, named without the amount, with the level as its description', () => {
    render(<StockBadge quantity={6} threshold={10} unit="g" />);
    const badge = screen.getByRole('button', { name: 'Low Stock' });
    expect(badge).toHaveAccessibleDescription('Low Stock at 10 g or less');
    act(() => badge.focus());
    expect(tipEl()).toHaveTextContent('Low Stock at 10 g or less');
    expect(out()).toBeNull();
  });

  it('writes a quantity with no unit as a plain number', () => {
    render(<StockBadge quantity={6} threshold={10} unit={null} />);
    expect(screen.getByRole('button', { name: 'Low Stock' })).toHaveAccessibleDescription(
      'Low Stock at 10 or less',
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

  it('tells the two states apart without colour: a drawing each', () => {
    const { container, rerender } = render(<StockBadge quantity={0} threshold={10} unit="g" />);
    const outDrawing = container.querySelector('svg')!.innerHTML;
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<StockBadge quantity={6} threshold={10} unit="g" />);
    expect(container.querySelector('svg')!.innerHTML).not.toBe(outDrawing);
  });
});
