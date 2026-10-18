import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockBadge, stockState } from '@/components/StockBadge';
import { JAR_STATES } from '../../support/jar-states';

// M9.8, story 23 (claude-docs/components/stock-badge.md): the shared jar
// states (tests/support/jar-states.ts) give their badge, proven by the badge's presence or absence per
// state. The words are found by role-free text only because a badge is plain
// text with no role; what is asserted is which of the two shows, never copy
// around them.

const out = () => screen.queryByText('Out of Stock');

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
  it('shows Out of Stock, word only, for a jar at zero: not focusable, no tip', () => {
    const { container } = render(<StockBadge quantity={0} threshold={10} unit="g" />);
    expect(out()).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[role=tooltip]')).toBeNull();
    expect(container).not.toHaveTextContent(/\bg\b/);
  });

  it('shows Low Stock with the quantity, as a button described by the level', () => {
    render(<StockBadge quantity={6} threshold={10} unit="g" />);
    const badge = screen.getByRole('button', { name: /^Low Stock/ });
    expect(badge).toHaveAccessibleName(/6 g/);
    expect(badge).toHaveAccessibleDescription(/10 g/);
    expect(out()).toBeNull();
  });

  it('shows nothing above the threshold, for a zero threshold or for an unweighed jar', () => {
    const { container, rerender } = render(<StockBadge quantity={11} threshold={10} unit="g" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StockBadge quantity={5} threshold={0} unit="g" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StockBadge quantity={null} threshold={10} unit="g" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the tip on focus, on hover and on a tap, and closes it on Escape', () => {
    vi.useFakeTimers();
    try {
      render(<StockBadge quantity={6} threshold={10} unit="g" />);
      const badge = screen.getByRole('button', { name: /^Low Stock/ });
      const tip = () => screen.queryByRole('tooltip');
      expect(tip()).toBeNull();

      act(() => badge.focus());
      expect(tip()).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(tip()).toBeNull();
      act(() => badge.blur());

      fireEvent.mouseEnter(badge);
      expect(tip()).toBeInTheDocument();
      fireEvent.mouseLeave(badge);
      act(() => vi.advanceTimersByTime(200));
      expect(tip()).toBeNull();

      fireEvent.click(badge);
      expect(tip()).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('tells the two states apart without colour: a word and a drawing each', () => {
    const { container, rerender } = render(<StockBadge quantity={0} threshold={10} unit="g" />);
    const outDrawing = container.querySelector('svg')!.innerHTML;
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<StockBadge quantity={6} threshold={10} unit="g" />);
    expect(container.querySelector('svg')!.innerHTML).not.toBe(outDrawing);
  });
});
