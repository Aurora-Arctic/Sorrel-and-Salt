import { act, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PageNav from '@/components/PageNav';

let callback: IntersectionObserverCallback;

const entries = [
  { href: '#one', label: 'First' },
  { href: '#two', label: 'Second' },
] as const;

function enter(id: string, isIntersecting: boolean) {
  act(() =>
    callback(
      [
        {
          target: document.getElementById(id),
          isIntersecting,
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    ),
  );
}

describe('PageNav', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => {
    document.body.innerHTML = '<section id="one"></section><section id="two"></section>';
  });

  it('is a named navigation of links to the sections, the first current', () => {
    render(<PageNav label="On this page" entries={[...entries]} />, {
      container: document.body.appendChild(document.createElement('div')),
    });

    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'First' })).toHaveAttribute('href', '#one');
    expect(screen.getByRole('link', { name: 'Second' })).toHaveAttribute('href', '#two');
    expect(screen.getByRole('link', { name: 'First' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: 'Second' })).not.toHaveAttribute('aria-current');
  });

  it('moves the current mark to the section that comes into view', () => {
    render(<PageNav label="On this page" entries={[...entries]} />, {
      container: document.body.appendChild(document.createElement('div')),
    });

    enter('two', true);
    enter('one', false);

    expect(screen.getByRole('link', { name: 'Second' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(screen.getByRole('link', { name: 'First' })).not.toHaveAttribute('aria-current');
  });
});
