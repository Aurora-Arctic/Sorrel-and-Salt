import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ flip: [] as unknown[], shift: [] as unknown[] }));

vi.mock('@floating-ui/react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@floating-ui/react-dom')>();
  return {
    ...actual,
    flip: (options: unknown) => {
      captured.flip.push(options);
      return actual.flip(options as never);
    },
    shift: (options: unknown) => {
      captured.shift.push(options);
      return actual.shift(options as never);
    },
  };
});

import InfoTip from '@/components/InfoTip';

// claude-docs/components/info-tip.md, "Placement"

type Edges = { top?: number; left?: number; right?: number; bottom?: number } | number;

function resolve(options: unknown, reference: Element): { padding?: Edges } {
  const fn = options as (state: { elements: { reference: Element } }) => { padding?: Edges };
  return fn({ elements: { reference } });
}

function topPadding(padding: Edges | undefined): number {
  if (typeof padding === 'number') return padding;
  return padding?.top ?? 0;
}

afterEach(() => {
  captured.flip.length = 0;
  captured.shift.length = 0;
  document.documentElement.style.fontSize = '';
});

describe('a tip under a sticky top bar', () => {
  it('keeps clear of the bar the frame publishes as --sticky-top, so the tip flips before it goes under it', () => {
    document.documentElement.style.fontSize = '16px';
    render(
      <InfoTip id="t" label="Name">
        Text
      </InfoTip>,
    );
    const reference = screen.getByRole('button', { name: 'About Name' }).parentElement as Element;
    // jsdom does not inherit custom properties as a browser does, so the frame's value is set on the reference.
    (reference as HTMLElement).style.setProperty('--sticky-top', '3.25rem');

    for (const list of [captured.flip, captured.shift]) {
      const { padding } = resolve(list[list.length - 1], reference);
      // The bar is 52px tall; the tip must stay at least that far from the top edge.
      expect(topPadding(padding)).toBeGreaterThanOrEqual(52);
    }
  });

  it('keeps only the screen-edge gap where no bar is published', () => {
    render(
      <InfoTip id="t" label="Name">
        Text
      </InfoTip>,
    );
    const reference = screen.getByRole('button', { name: 'About Name' }).parentElement as Element;
    expect(topPadding(resolve(captured.flip[captured.flip.length - 1], reference).padding)).toBe(8);
  });
});
