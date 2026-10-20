import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Skeleton from '@/components/Skeleton';
import type { SkeletonShape } from '@/components/Skeleton/types';

const SHAPES: SkeletonShape[] = ['table', 'cards', 'form', 'page', 'contents', 'line'];

// A skeleton is announced once, as a status, whatever it draws; the shapes
// are for the eye and add nothing to the accessibility tree. What each shape
// draws is presentation, owned by the workshop story (layer-ownership.md,
// "What a test may assert", rule 4).
describe('Skeleton', () => {
  it.each(SHAPES)('the %s shape renders exactly one status', (shape) => {
    render(<Skeleton shape={shape} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it.each([
    ['table', { title: true, action: true, tabs: true, filter: true }],
    ['cards', { title: true, filter: true }],
    ['page', { menu: true, entry: true, head: 'eyebrow' as const }],
    ['page', { menu: true, head: 'title' as const }],
  ] as const)('keeps every %s shape out of the accessibility tree', (shape, options) => {
    const { container } = render(<Skeleton shape={shape} {...options} />);
    const status = screen.getByRole('status');
    const drawn = [...container.querySelectorAll('span, div')].filter(
      (node) => !node.contains(status),
    );
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((node) => node.closest('[aria-hidden="true"]'))).toBe(true);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});
