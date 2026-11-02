import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Skeleton from '@/components/Skeleton';

// A skeleton is announced once, as a status, whatever it draws; its shapes are for the eye and add nothing to the accessibility tree.
// What each shape draws is presentation, owned by the workshop (layer-ownership.md, "What a test may assert", rule 4).
describe('Skeleton', () => {
  it.each(['table'] as const)('the %s shape renders exactly one status', (shape) => {
    render(<Skeleton shape={shape} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it.each([['table', { title: true, action: true, tabs: true, filter: true }]] as const)(
    'keeps every %s shape out of the accessibility tree',
    (shape, options) => {
      const { container } = render(<Skeleton shape={shape} {...options} />);
      const status = screen.getByRole('status');
      const drawn = [...container.querySelectorAll('span, div')].filter(
        (node) => !node.contains(status),
      );
      expect(drawn.length).toBeGreaterThan(0);
      expect(drawn.every((node) => node.closest('[aria-hidden="true"]'))).toBe(true);
      expect(screen.getAllByRole('status')).toHaveLength(1);
    },
  );
});

describe('Skeleton for the support pages', () => {
  it('renders one status for the detail shape, with and without the side column', () => {
    for (const side of [true, false]) {
      const { unmount } = render(<Skeleton shape="detail" side={side} />);
      expect(screen.getAllByRole('status')).toHaveLength(1);
      unmount();
    }
  });
});
