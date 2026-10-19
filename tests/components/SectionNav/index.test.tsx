import type { Route } from 'next';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormIcon from '@/components/FormIcon';
import type { SectionNavItem } from '@/components/SectionNav/types';
import { currentHrefs, hrefs } from '../../support/links';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const { default: SectionNav } = await import('@/components/SectionNav');

// The section nav (MB.7; claude-docs/components/section-nav.md): a row of
// tabs that is a bottom bar on a phone, with the sections past the fourth
// behind a More button. Which tabs show at which width is the stylesheet's,
// so a test sees every tab and, shut, no More list.

const ITEMS: readonly SectionNavItem[] = [
  { label: 'Overview', href: '/coven/fixture-coven' as Route, icon: 'overview', exact: true },
  { label: 'Compendium', href: '/admin/compendium', icon: 'compendium' },
  {
    label: 'Categories',
    href: '/admin/categories',
    icon: 'categories',
    matches: ['/admin/category-groups'],
  },
  { label: 'Forms', href: '/admin/forms', icon: 'forms' },
  { label: 'Deities', href: '/admin/deities', icon: 'deities' },
  { label: 'Astrology', href: '/admin/celestial-bodies', icon: 'astrology' },
  { label: 'People', href: '/admin/users', icon: 'people', apart: true },
];
const FEW = ITEMS.slice(0, 4);

const nav = () => screen.getByRole('navigation', { name: 'Test' });
const more = () => within(nav()).queryByRole('button');
// The links in the row, which the shut More list does not add to.
const row = () => within(nav()).getAllByRole('link');

beforeEach(() => {
  pathname.mockReturnValue('/nowhere');
});

describe('SectionNav', () => {
  it('links every section at its address, in order', () => {
    render(<SectionNav label="Test" sections={ITEMS} />);

    expect(hrefs(row())).toEqual(ITEMS.map(({ href }) => href));
  });

  it.each([
    // An exact entry is current only at its own address.
    ['/coven/fixture-coven', ['/coven/fixture-coven']],
    ['/coven/fixture-coven/members', []],
    // Any other is current beneath its address, and on its `matches`.
    ['/admin/categories', ['/admin/categories']],
    ['/admin/category-groups', ['/admin/categories']],
    ['/admin/users/some-user', ['/admin/users']],
    ['/admin/forms-archive', []],
  ])('marks only the section at %s as current', (path, expected) => {
    pathname.mockReturnValue(path);

    render(<SectionNav label="Test" sections={ITEMS} />);

    expect(currentHrefs(row())).toEqual(expected);
  });

  // One mark means "a form" everywhere: the Forms tab wears the generic form
  // icon, the salt spoon, not a mark of its own (M12.7).
  it('draws the generic form icon on the Forms tab', () => {
    const { container: spoon } = render(<FormIcon name={null} />);
    render(<SectionNav label="Test" sections={ITEMS} />);

    const forms = within(nav()).getByRole('link', { name: 'Forms' });
    expect(forms.querySelector('svg')!.innerHTML).toBe(spoon.querySelector('svg')!.innerHTML);
  });

  it('draws no More button when the sections fit', () => {
    render(<SectionNav label="Test" sections={FEW} />);

    expect(more()).not.toBeInTheDocument();
  });

  describe('More', () => {
    it('is shut at first, naming the list it controls', () => {
      render(<SectionNav label="Test" sections={ITEMS} />);

      const button = more()!;
      expect(button).toHaveAccessibleName('More');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(document.getElementById(button.getAttribute('aria-controls')!)).toBeInTheDocument();
      // Shut, its links are out of the accessibility tree.
      expect(within(nav()).getAllByRole('link')).toHaveLength(ITEMS.length);
    });

    it('opens on a press to list the sections past the fourth, and shuts on a second', () => {
      render(<SectionNav label="Test" sections={ITEMS} />);

      fireEvent.click(more()!);

      expect(more()).toHaveAttribute('aria-expanded', 'true');
      const list = document.getElementById(more()!.getAttribute('aria-controls')!)!;
      expect(hrefs(within(list).getAllByRole('link'))).toEqual(
        ITEMS.slice(4).map(({ href }) => href),
      );

      fireEvent.click(more()!);

      expect(more()).toHaveAttribute('aria-expanded', 'false');
    });

    it('shuts on Escape and returns focus to the button', () => {
      render(<SectionNav label="Test" sections={ITEMS} />);
      fireEvent.click(more()!);
      const list = document.getElementById(more()!.getAttribute('aria-controls')!)!;
      within(list).getAllByRole('link')[0].focus();

      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

      expect(more()).toHaveAttribute('aria-expanded', 'false');
      expect(more()).toHaveFocus();
    });

    it('shuts on a press outside it', () => {
      render(<SectionNav label="Test" sections={ITEMS} />);
      fireEvent.click(more()!);

      fireEvent.pointerDown(document.body);

      expect(more()).toHaveAttribute('aria-expanded', 'false');
    });

    it('stays open on a press inside the nav', () => {
      render(<SectionNav label="Test" sections={ITEMS} />);
      fireEvent.click(more()!);

      fireEvent.pointerDown(row()[0]);

      expect(more()).toHaveAttribute('aria-expanded', 'true');
    });

    it('shuts after a client-side navigation', () => {
      pathname.mockReturnValue('/admin/compendium');
      const { rerender } = render(<SectionNav label="Test" sections={ITEMS} />);
      fireEvent.click(more()!);

      pathname.mockReturnValue('/admin/users');
      rerender(<SectionNav label="Test" sections={ITEMS} />);

      expect(more()).toHaveAttribute('aria-expanded', 'false');
    });

    it('takes the page you are on, marked current, when it is one of the hidden sections', () => {
      pathname.mockReturnValue('/admin/celestial-bodies');

      render(<SectionNav label="Test" sections={ITEMS} />);

      expect(more()).toHaveAccessibleName('More: Astrology');
      expect(more()).toHaveAttribute('aria-current', 'page');
    });

    it('does not take a visible section as its own', () => {
      pathname.mockReturnValue('/admin/forms');

      render(<SectionNav label="Test" sections={ITEMS} />);

      expect(more()).toHaveAccessibleName('More');
      expect(more()).not.toHaveAttribute('aria-current');
    });
  });

  describe('the on-screen keyboard', () => {
    class Viewport extends EventTarget {
      height = 800;
    }
    let viewport: Viewport;

    beforeEach(() => {
      viewport = new Viewport();
      vi.stubGlobal('visualViewport', viewport);
      vi.stubGlobal('innerHeight', 800);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('marks the nav while the visual viewport is under three quarters of the window', () => {
      render(<SectionNav label="Test" sections={ITEMS} />);
      expect(nav()).not.toHaveAttribute('data-keyboard');

      act(() => {
        viewport.height = 400;
        viewport.dispatchEvent(new Event('resize'));
      });
      expect(nav()).toHaveAttribute('data-keyboard', 'open');

      act(() => {
        viewport.height = 790;
        viewport.dispatchEvent(new Event('resize'));
      });
      expect(nav()).not.toHaveAttribute('data-keyboard');
    });
  });

  // Wider than the phone shows as many leading tabs as fit the row, measured in
  // the browser. happy-dom draws no layout, so the widths are stood in for: every
  // tab 100px, the chevron none, the list 450px wide.
  describe('wider than the phone', () => {
    beforeEach(() => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('min-width'),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          disconnect() {}
        },
      );
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains('section-nav__chevron') ? 0 : 100;
      });
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(450);
    });
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    const hiddenHrefs = () =>
      row()
        .filter((link) => link.closest('li')?.classList.contains('section-nav__item--extra'))
        .map((link) => link.getAttribute('href'));

    it('hides the tabs that do not fit behind More, keeping all that do', () => {
      render(<SectionNav label="Test" sections={ITEMS} />);

      // Three tabs and More fit 450px; the other four are More's.
      expect(hiddenHrefs()).toEqual(ITEMS.slice(3).map(({ href }) => href));
      expect(more()).not.toHaveAttribute('aria-current');
    });

    it('lets More wear the current page when it is among the hidden', () => {
      pathname.mockReturnValue('/admin/users');
      render(<SectionNav label="Test" sections={ITEMS} />);

      expect(more()).toHaveAttribute('aria-current', 'page');
    });

    it('fits the row afresh after a navigation', () => {
      // The current tab is set at a heavier weight, so it measures wider: a
      // fit kept from the last page would still show three tabs.
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.classList.contains('section-nav__chevron')) return 0;
        return this.querySelector(':scope > [aria-current="page"]') ? 200 : 100;
      });
      pathname.mockReturnValue('/admin');
      const { rerender } = render(<SectionNav label="Test" sections={ITEMS} />);
      expect(hiddenHrefs()).toEqual(ITEMS.slice(3).map(({ href }) => href));

      pathname.mockReturnValue('/admin/users');
      rerender(<SectionNav label="Test" sections={ITEMS} />);

      // Two tabs and More, wearing the 200px People, fit 450px.
      expect(hiddenHrefs()).toEqual(ITEMS.slice(2).map(({ href }) => href));
      expect(more()).toHaveAttribute('aria-current', 'page');
    });

    it('draws no More when every tab fits', () => {
      render(<SectionNav label="Test" sections={FEW.slice(0, 3)} />);

      expect(hiddenHrefs()).toEqual([]);
      expect(more()).toBeNull();
    });
  });
});
