import { act, render, screen, within } from '@testing-library/react';
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
    render(<PageNav label="On This Page" entries={[...entries]} />, {
      container: document.body.appendChild(document.createElement('div')),
    });

    expect(screen.getByRole('navigation', { name: 'On This Page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'First' })).toHaveAttribute('href', '#one');
    expect(screen.getByRole('link', { name: 'Second' })).toHaveAttribute('href', '#two');
    expect(screen.getByRole('link', { name: 'First' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: 'Second' })).not.toHaveAttribute('aria-current');
  });

  it('draws one flat list when no entry names a group', () => {
    render(<PageNav label="On This Page" entries={[...entries]} />, {
      container: document.body.appendChild(document.createElement('div')),
    });

    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('nests a run of entries sharing a group in a list named by the group', () => {
    document.body.innerHTML += '<section id="three"></section>';
    render(
      <PageNav
        label="On This Page"
        entries={[
          { href: '#one', label: 'First' },
          { href: '#two', label: 'Second', group: 'Parts' },
          { href: '#three', label: 'Third', group: 'Parts' },
        ]}
      />,
      { container: document.body.appendChild(document.createElement('div')) },
    );

    const group = screen.getByRole('list', { name: 'Parts' });
    expect(
      within(group)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#two', '#three']);
    expect(group).not.toContainElement(screen.getByRole('link', { name: 'First' }));
    // The label is not an entry.
    expect(screen.getAllByRole('link')).toHaveLength(3);

    // The observer still reaches an entry inside the group.
    enter('three', true);
    expect(screen.getByRole('link', { name: 'Third' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: 'First' })).not.toHaveAttribute('aria-current');
  });

  it('moves the current mark to the section that comes into view', () => {
    render(<PageNav label="On This Page" entries={[...entries]} />, {
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
