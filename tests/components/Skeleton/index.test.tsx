import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Skeleton from '@/components/Skeleton';

// A skeleton is announced once, as a status, whatever it draws; its bars are for the eye and add nothing to the accessibility tree.
describe('Skeleton', () => {
  it.each(['line', 'block'] as const)('the %s shape renders exactly one status', (shape) => {
    render(<Skeleton shape={shape} count={3} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('keeps every bar out of the accessibility tree', () => {
    const { container } = render(<Skeleton shape="block" count={3} />);
    const status = screen.getByRole('status');
    const drawn = [...container.querySelectorAll('span, div')].filter(
      (node) => !node.contains(status),
    );
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((node) => node.closest('[aria-hidden="true"]'))).toBe(true);
  });

  it('leaves out the status when quiet', () => {
    render(<Skeleton shape="line" quiet />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
