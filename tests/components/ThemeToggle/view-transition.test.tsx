import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';

// The theme swap: one cross-fade through `document.startViewTransition` where the browser has it, an instant
// swap where it does not or reduced motion is asked for (claude-docs/components/theme-toggle.md). happy-dom
// has no View Transitions API, so each test states which browser it stands for.

const toggle = () => screen.getByRole('button', { name: 'Toggle light and dark mode' });
const theme = () => document.documentElement.getAttribute('data-theme');

/** A `matchMedia` answering the reduced-motion query as given, and nothing else. */
const stubMotion = (reduce: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

/** A View Transitions API that holds the update until the test runs it, as a browser runs it later. */
const stubViewTransition = () => {
  const updates: Array<() => unknown> = [];
  const start = vi.fn((update?: (() => unknown) | StartViewTransitionOptions) => {
    if (typeof update === 'function') updates.push(update);
    const done = Promise.resolve();
    return {
      finished: done,
      ready: done,
      updateCallbackDone: done,
      skipTransition: vi.fn(),
      types: new Set<string>(),
    } as unknown as ViewTransition;
  });
  Object.defineProperty(document, 'startViewTransition', {
    value: start,
    configurable: true,
    writable: true,
  });
  return {
    start,
    runUpdates: () => {
      for (const update of updates.splice(0)) update();
    },
  };
};

beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'dark');
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'startViewTransition');
});

describe('ThemeToggle with the View Transitions API', () => {
  beforeEach(() => stubMotion(false));

  it('swaps the theme inside one view transition, and the theme ends up set', () => {
    const { start, runUpdates } = stubViewTransition();
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(start).toHaveBeenCalledTimes(1);
    // The swap is the transition's update: until the browser runs it, the page keeps its theme.
    expect(theme()).toBe('dark');
    runUpdates();
    expect(theme()).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('swaps back through a second view transition', () => {
    const { start, runUpdates } = stubViewTransition();
    render(<ThemeToggle />);

    fireEvent.click(toggle());
    runUpdates();
    fireEvent.click(toggle());
    runUpdates();

    expect(start).toHaveBeenCalledTimes(2);
    expect(theme()).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });
});

describe('ThemeToggle without the View Transitions API', () => {
  beforeEach(() => stubMotion(false));

  it('swaps the theme straight away, and the theme ends up set', () => {
    // Why the swap could have waited on a transition: there is none to wait on.
    expect('startViewTransition' in document).toBe(false);
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(theme()).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });
});

describe('ThemeToggle under reduced motion', () => {
  beforeEach(() => stubMotion(true));

  it('swaps the theme straight away with no cross-fade, though the browser has the API', () => {
    const { start } = stubViewTransition();
    // Why a cross-fade could have run: the browser offers one.
    expect('startViewTransition' in document).toBe(true);
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(start).not.toHaveBeenCalled();
    expect(theme()).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });
});
