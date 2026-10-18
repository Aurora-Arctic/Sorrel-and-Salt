import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockBadge, ThresholdReadout, stockState } from '@/components/StockBadge';

// M9.8, story 23 (claude-docs/components/stock-badge.md): each row of the
// badge table gives its badge, proven by the badge's presence or absence per
// state. The words are found by role-free text only because a badge is plain
// text with no role; what is asserted is which of the two shows, never copy
// around them.

const out = () => screen.queryByText('Out of Stock');
const low = () => screen.queryByText('Low Stock');

describe('stockState: the table, row by row', () => {
  it.each([
    ['zero, whatever the threshold', 0, 10, 'out'],
    ['zero with a threshold of zero', 0, 0, 'out'],
    ['zero with no threshold', 0, null, 'out'],
    ['above zero and below the threshold', 6, 10, 'low'],
    ['exactly at the threshold', 10, 10, 'low'],
    ['above the threshold', 11, 10, 'ok'],
    ['above zero with a threshold of zero', 5, 0, 'ok'],
    ['above zero with no threshold', 5, null, 'ok'],
    ['held but not weighed', null, 10, 'ok'],
    ['not weighed and no threshold', undefined, undefined, 'ok'],
  ] as const)('%s', (_label, quantity, threshold, expected) => {
    expect(stockState(quantity, threshold)).toBe(expected);
  });
});

describe('StockBadge', () => {
  it('shows Out of Stock, and not Low Stock, for a jar at zero', () => {
    render(<StockBadge quantity={0} threshold={10} />);
    expect(out()).toBeInTheDocument();
    expect(low()).toBeNull();
  });

  it('shows Low Stock, and not Out of Stock, at or under the threshold', () => {
    render(<StockBadge quantity={10} threshold={10} />);
    expect(low()).toBeInTheDocument();
    expect(out()).toBeNull();
  });

  it('shows nothing above the threshold, for a zero threshold or for an unweighed jar', () => {
    const { container, rerender } = render(<StockBadge quantity={11} threshold={10} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StockBadge quantity={5} threshold={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StockBadge quantity={null} threshold={10} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('still reads Out of Stock at zero when the threshold is zero', () => {
    render(<StockBadge quantity={0} threshold={0} />);
    expect(out()).toBeInTheDocument();
  });

  it('tells the two states apart without colour: a word and a drawing each', () => {
    const { container, rerender } = render(<StockBadge quantity={0} threshold={10} />);
    const outDrawing = container.querySelector('svg')!.innerHTML;
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<StockBadge quantity={6} threshold={10} />);
    expect(container.querySelector('svg')!.innerHTML).not.toBe(outDrawing);
  });
});

describe('ThresholdReadout', () => {
  it('states the level the member set, in the jar unit', () => {
    render(<ThresholdReadout threshold={15} unit="ml" />);
    expect(screen.getByText(/15/)).toHaveTextContent('ml');
  });

  it('reads a threshold of zero as the warning being off, not as a level', () => {
    const { container, rerender } = render(<ThresholdReadout threshold={0} unit="g" />);
    expect(container).not.toBeEmptyDOMElement();
    expect(container).not.toHaveTextContent(/\bg\b/);
    rerender(<ThresholdReadout threshold={10} unit="g" />);
    expect(container).toHaveTextContent('10');
  });

  it('draws nothing when no threshold is set', () => {
    const { container } = render(<ThresholdReadout threshold={null} unit="g" />);
    expect(container).toBeEmptyDOMElement();
  });
});
