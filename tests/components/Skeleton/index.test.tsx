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

// A page's heading row, with its action where it has one, so a list's wait
// looks like the page that arrives (M12.33).
describe('Skeleton heading row', () => {
  const bars = (container: HTMLElement): number =>
    container.querySelectorAll('.skeleton__header > span').length;

  it.each(['table', 'cards'] as const)(
    'draws a heading on the %s shape only when asked',
    (shape) => {
      const { container, rerender } = render(<Skeleton shape={shape} />);
      expect(container.querySelector('.skeleton__header')).toBeNull();
      rerender(<Skeleton shape={shape} title />);
      expect(bars(container)).toBe(1);
    },
  );

  it('adds an action beside the heading only when asked', () => {
    const { container, rerender } = render(<Skeleton shape="table" title />);
    expect(bars(container)).toBe(1);
    rerender(<Skeleton shape="table" title action />);
    expect(bars(container)).toBe(2);
  });

  it('draws no action without a heading', () => {
    const { container } = render(<Skeleton shape="table" action />);
    expect(container.querySelector('.skeleton__header')).toBeNull();
  });

  it('puts the heading above the filter and the list', () => {
    const { container } = render(<Skeleton shape="table" title filter />);
    const order = [
      ...container.querySelectorAll('.skeleton__header, .skeleton__filter, .skeleton__table'),
    ];
    expect(order.map((node) => node.className)).toEqual([
      'page-header skeleton__header',
      'skeleton__filter',
      'skeleton__table',
    ]);
  });

  it('still announces once', () => {
    render(<Skeleton shape="table" title action filter />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});

// The tab row and the side menu are drawn where the page that arrives has them.
describe('Skeleton tabs and menu', () => {
  it('draws the tab track between the heading and the action, only when asked', () => {
    const { container, rerender } = render(<Skeleton shape="table" title action />);
    expect(container.querySelector('.skeleton__tabs')).toBeNull();
    rerender(<Skeleton shape="table" title action tabs />);
    const kids = [...container.querySelectorAll('.skeleton__header > span')];
    expect(kids.map((node) => node.className.split(' ')[0])).toEqual([
      'skeleton__title',
      'skeleton__tabs',
      'skeleton__action',
    ]);
  });

  it('draws no tabs without a heading', () => {
    const { container } = render(<Skeleton shape="table" tabs />);
    expect(container.querySelector('.skeleton__tabs')).toBeNull();
  });

  it('draws a menu column beside the page shape only when asked', () => {
    const { container, rerender } = render(<Skeleton shape="page" />);
    expect(container.querySelector('.skeleton__menu')).toBeNull();
    rerender(<Skeleton shape="page" menu />);
    expect(container.querySelector('.skeleton__with-menu .skeleton__menu')).not.toBeNull();
  });

  it('keeps the menu out of other shapes and still announces once', () => {
    const { container } = render(<Skeleton shape="table" menu />);
    expect(container.querySelector('.skeleton__menu')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});
