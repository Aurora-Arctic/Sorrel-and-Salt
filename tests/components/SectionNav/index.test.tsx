import type { Route } from 'next';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    // A `matches` address marks the section it belongs to; `isAtPath` owns the rest.
    ['/admin/category-groups', ['/admin/categories']],
  ])('marks only the section at %s as current', (path, expected) => {
    pathname.mockReturnValue(path);

    render(<SectionNav label="Test" sections={ITEMS} />);

    expect(currentHrefs(row())).toEqual(expected);
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
});
