import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(screen.getAllByRole('link')).toHaveLength(3);

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

  const show = (collapsible?: boolean) => {
    render(<PageNav label="On This Page" entries={[...entries]} collapsible={collapsible} />, {
      container: document.body.appendChild(document.createElement('div')),
    });
    return screen.getByRole('navigation', { name: 'On This Page' });
  };

  // On a phone a collapsible menu folds into a disclosure, closed so the page lands with its text in
  // view; wider, it stands open with no toggle. happy-dom keeps a closed disclosure's content in the
  // accessibility tree, so the fold's state is its `open` attribute, read from the group it is.
  describe('collapsible', () => {
    const toggleOf = (fold: HTMLElement) => fold.querySelector(':scope > summary') as HTMLElement;

    afterEach(() => vi.restoreAllMocks());

    function wideViewport() {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches:
              query.includes('min-width') || query.includes('prefers-reduced-motion: reduce'),
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
          }) as unknown as MediaQueryList,
      );
    }

    it('folds the menu into a closed disclosure inside the named navigation on a narrow viewport', () => {
      const nav = show(true);

      const fold = within(nav).getByRole('group');
      expect(fold).not.toHaveAttribute('open');
      expect(toggleOf(fold)).not.toBeNull();
      expect(within(fold).getAllByRole('link')).toHaveLength(2);
    });

    it('opens the disclosure when its summary is activated, and closes it when activated again', () => {
      const nav = show(true);
      const fold = within(nav).getByRole('group');
      // Precondition: closed before the press.
      expect(fold).not.toHaveAttribute('open');
      // happy-dom toggles a disclosure as the click bubbles past it, before React's root listener can
      // cancel that; a browser toggles only after dispatch, which the component cancels. Cancelling
      // here at the summary leaves `open` to the component's own state, as in a browser.
      toggleOf(fold).addEventListener('click', (event) => event.preventDefault());

      fireEvent.click(toggleOf(fold));
      expect(fold).toHaveAttribute('open');
      expect(within(fold).getByRole('link', { name: 'First' })).toHaveAttribute('href', '#one');

      fireEvent.click(toggleOf(fold));
      expect(fold).not.toHaveAttribute('open');
      expect(screen.getByRole('navigation', { name: 'On This Page' })).toBe(nav);
    });

    it('stands open with no press on a wide viewport, inside the named navigation', () => {
      wideViewport();
      const nav = show(true);

      const fold = within(nav).getByRole('group');
      expect(fold).toHaveAttribute('open');
      expect(within(fold).getAllByRole('link')).toHaveLength(2);
    });

    it('draws no disclosure without collapsible, on a narrow viewport', () => {
      const nav = show();

      expect(within(nav).queryByRole('group')).toBeNull();
      expect(nav.querySelector('summary')).toBeNull();
      expect(within(nav).getAllByRole('link')).toHaveLength(2);
    });
  });

  describe('scroll-edge attributes', () => {
    let frames: FrameRequestCallback[] = [];

    beforeEach(() => {
      frames = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    function scroll(el: HTMLElement, box: { top: number; height: number; client: number }) {
      Object.defineProperty(el, 'scrollHeight', { configurable: true, value: box.height });
      Object.defineProperty(el, 'clientHeight', { configurable: true, value: box.client });
      Object.defineProperty(el, 'scrollTop', { configurable: true, value: box.top });
      fireEvent.scroll(el);
      act(() => {
        const queued = frames;
        frames = [];
        for (const cb of queued) cb(0);
      });
    }

    it('sets data-more-below alone at the top of a menu taller than its box', () => {
      const nav = show();
      scroll(nav, { top: 0, height: 600, client: 200 });

      expect(nav).not.toHaveAttribute('data-more-above');
      expect(nav).toHaveAttribute('data-more-below');
    });

    it('sets both data-more-above and data-more-below part-way down', () => {
      const nav = show();
      scroll(nav, { top: 200, height: 600, client: 200 });

      expect(nav).toHaveAttribute('data-more-above');
      expect(nav).toHaveAttribute('data-more-below');
    });

    it('sets data-more-above alone at the bottom, dropping data-more-below', () => {
      const nav = show();
      scroll(nav, { top: 0, height: 600, client: 200 });
      // Precondition: the bottom mark was set, so its removal is the scroll's doing.
      expect(nav).toHaveAttribute('data-more-below');

      scroll(nav, { top: 400, height: 600, client: 200 });
      expect(nav).toHaveAttribute('data-more-above');
      expect(nav).not.toHaveAttribute('data-more-below');
    });

    it('sets neither data-more-above nor data-more-below once every entry fits', () => {
      const nav = show(true);
      scroll(nav, { top: 200, height: 600, client: 200 });
      // Precondition: both marks were set, so their removal is the fit's doing.
      expect(nav).toHaveAttribute('data-more-above');
      expect(nav).toHaveAttribute('data-more-below');

      scroll(nav, { top: 0, height: 200, client: 200 });
      expect(nav).not.toHaveAttribute('data-more-above');
      expect(nav).not.toHaveAttribute('data-more-below');
    });
  });
});
