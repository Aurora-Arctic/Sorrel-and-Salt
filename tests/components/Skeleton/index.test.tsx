import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Skeleton from '@/components/Skeleton';
import type { SkeletonShape } from '@/components/Skeleton/types';

const SHAPES: SkeletonShape[] = ['table', 'cards', 'form', 'page', 'line'];

// A skeleton is announced once, as a status, whatever it draws; the shapes
// are for the eye and add nothing to the accessibility tree.
describe('Skeleton', () => {
  it.each(SHAPES)('the %s shape renders exactly one status', (shape) => {
    render(<Skeleton shape={shape} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('draws a filter row only when asked, for a list', () => {
    const { container, rerender } = render(<Skeleton shape="table" />);
    const before = container.querySelectorAll('span').length;
    rerender(<Skeleton shape="table" filter />);
    expect(container.querySelectorAll('span').length).toBeGreaterThan(before);
  });
});
