import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';

// Ported from resume-2026; the aria-label and the Tooltip wrapper changed, the
// rest carries over.
// jsdom's `matchMedia` always answers `false`, so reduced motion needs a stub.
const stubReducedMotion = (matches: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

// jsdom's `matchMedia` always answers `false` — the "system asks for neither"
// case — so a light system needs a stub.
const stubLightSystemPreference = (): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-color-scheme: light)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an accessible toggle button', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toBeInTheDocument();
  });

  it('switches to light mode on click, setting the attribute and storage', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light and dark mode' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  it('switches back to dark mode on a second click, resetting the attribute', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('updates aria-pressed to reflect the current mode', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });

    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('starts with the light facet resting and the dark facet parked when mounted already in light mode', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const [darkFacet, lightFacet] = document.querySelectorAll('.theme-toggle__facet');

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(darkFacet).toHaveClass('theme-toggle__facet--pre-enter');
    expect(lightFacet).not.toHaveClass('theme-toggle__facet--pre-enter');
  });

  it('parks an outgoing facet back to pre-enter once its exit transition finishes', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;

    fireEvent.click(button);
    expect(darkFacet).toHaveClass('theme-toggle__facet--out');

    fireEvent.transitionEnd(darkFacet, { propertyName: 'transform' });

    expect(darkFacet).not.toHaveClass('theme-toggle__facet--out');
    expect(darkFacet).toHaveClass('theme-toggle__facet--pre-enter');
  });

  it('leaves an outgoing facet alone when a non-transform property finishes transitioning', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;

    fireEvent.click(button);
    fireEvent.transitionEnd(darkFacet, { propertyName: 'opacity' });

    expect(darkFacet).toHaveClass('theme-toggle__facet--out');
    expect(darkFacet).not.toHaveClass('theme-toggle__facet--pre-enter');
  });

  // Regression: under reduced motion no transitionend arrives, and the
  // outgoing facet stayed stuck holding --out.
  it('parks an outgoing facet immediately under prefers-reduced-motion, with no transitionend', () => {
    stubReducedMotion(true);
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;

    fireEvent.click(button);

    expect(darkFacet).not.toHaveClass('theme-toggle__facet--out');
    expect(darkFacet).toHaveClass('theme-toggle__facet--pre-enter');
  });

  it('keeps both facets correct across repeated toggles under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;
    const lightFacet = document.querySelector('.theme-toggle__facet--light') as SVGSVGElement;

    fireEvent.click(button);
    fireEvent.click(button);

    // As on first render; neither facet holds --out.
    expect(darkFacet).not.toHaveClass('theme-toggle__facet--out');
    expect(darkFacet).not.toHaveClass('theme-toggle__facet--pre-enter');
    expect(lightFacet).not.toHaveClass('theme-toggle__facet--out');
    expect(lightFacet).toHaveClass('theme-toggle__facet--pre-enter');
  });

  it('waits for transitionend to park a facet when motion is not reduced', () => {
    stubReducedMotion(false);
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle light and dark mode' });
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;

    fireEvent.click(button);

    expect(darkFacet).toHaveClass('theme-toggle__facet--out');
    expect(darkFacet).not.toHaveClass('theme-toggle__facet--pre-enter');
  });

  // jsdom applies no stylesheets, so the paint-timing fix itself is not
  // observable here; this guards the index.scss rule that settles both facets
  // pre-paint off `data-theme`. claude-docs/components/theme-toggle.md,
  // "Behaviour".
  it('settles both facets pre-paint via CSS keyed off data-theme, not just the mount effect', () => {
    // Not `new URL('./index.scss', import.meta.url)`: jsdom resolves
    // `import.meta.url` against the mocked `location`, not a `file:` URL.
    const scssPath = join(process.cwd(), 'src/components/ThemeToggle/index.scss');
    const scss = readFileSync(scssPath, 'utf-8');
    const settledFacets = scss.slice(scss.indexOf('@mixin theme-toggle-light-facets'));

    expect(settledFacets).toMatch(
      /\.theme-toggle__facet--light\.theme-toggle__facet--pre-enter\s*\{[^}]*transform:\s*rotate\(0deg\)/,
    );
    expect(settledFacets).toMatch(/\.theme-toggle__facet--dark\s*\{[^}]*opacity:\s*0/);
  });

  // Both light tiers, not just the stored-choice one: a light system
  // preference never stamps `data-theme`. These mirror globals.scss's own
  // tiers and move together.
  it('settles the facets for a light system preference as well as a stored light choice', () => {
    const scssPath = join(process.cwd(), 'src/components/ThemeToggle/index.scss');
    const scss = readFileSync(scssPath, 'utf-8');

    expect(scss).toMatch(
      /@media\s*\(prefers-color-scheme:\s*light\)\s*\{\s*html:not\(\[data-theme='dark'\]\)\s*\{\s*@include theme-toggle-light-facets/,
    );
    expect(scss).toMatch(/html\[data-theme='light'\]\s*\{\s*@include theme-toggle-light-facets/);
  });

  // Three theme states, not two: dark by default, a light *system* preference
  // that never stamps `data-theme`, and a stored choice. The current theme is
  // resolved as the stylesheet resolves it: attribute, then media query, then
  // dark.
  describe('on a light system with no stored choice', () => {
    beforeEach(() => {
      document.documentElement.removeAttribute('data-theme');
      stubLightSystemPreference();
    });

    it('switches to dark on the first click, not to the light already showing', () => {
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole('button', { name: 'Toggle light and dark mode' }));

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(window.localStorage.getItem('theme')).toBe('dark');
    });

    it('reports aria-pressed as true on mount', () => {
      render(<ThemeToggle />);

      expect(screen.getByRole('button', { name: 'Toggle light and dark mode' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('mounts with the light facet resting and the dark facet parked', () => {
      render(<ThemeToggle />);
      const [darkFacet, lightFacet] = document.querySelectorAll('.theme-toggle__facet');

      expect(darkFacet).toHaveClass('theme-toggle__facet--pre-enter');
      expect(lightFacet).not.toHaveClass('theme-toggle__facet--pre-enter');
    });
  });

  // Nothing stored and no light preference is dark, so the first click goes light.
  it('switches to light on the first click when nothing is stored and the system asks for neither', () => {
    document.documentElement.removeAttribute('data-theme');
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle light and dark mode' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('removes its transitionend listeners on unmount', () => {
    const { unmount } = render(<ThemeToggle />);
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;
    const removeEventListenerSpy = vi.spyOn(darkFacet, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('transitionend', expect.any(Function));
  });
});
