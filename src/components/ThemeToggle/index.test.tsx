import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ThemeToggle from '.';

// Ported from resume-2026's ThemeToggle test suite. The aria-label changed
// ("...for the paper" was specific to that resume site) and the Tooltip
// wrapper is gone, so queries target the new label and there's no tooltip
// assertion to port — everything else (toggle behaviour, facet class
// choreography, listener cleanup) carries over unchanged.
// Stubs `matchMedia` so `(prefers-reduced-motion: reduce)` reports `matches`.
// jsdom's own `matchMedia` always answers `false`, so reduced motion can only
// be exercised by replacing it.
const stubReducedMotion = (matches: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches && query === '(prefers-reduced-motion: reduce)',
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

  // Regression: index.scss zeroes the facet transition under reduced motion,
  // so no transitionend arrives and the outgoing facet used to stay stuck
  // holding --out — rotated askew and still opaque over the entering facet.
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

    // Back in dark mode: the crescent rests and the sun is parked, exactly as
    // on first render. Neither facet is left holding --out.
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

  // Regression (MB.2): the light facet's --pre-enter class is baked into the
  // server-rendered markup, so it's what paints first regardless of theme.
  // The mount effect above used to be the only correction for a light
  // starting theme, and it ran after that first paint — letting the sun
  // visibly swing in from parked. jsdom doesn't apply real stylesheets, so
  // the paint-timing fix itself isn't observable here (see the `Light` story
  // for the manual check); this instead guards the index.scss rule that
  // settles both facets' visible state pre-paint, off the same `data-theme`
  // attribute the layout.tsx init script stamps before the browser paints
  // anything — so a future edit can't quietly drop it back to effect-only.
  it('settles both facets pre-paint via CSS keyed off data-theme, not just the mount effect', () => {
    const scssPath = fileURLToPath(new URL('./index.scss', import.meta.url));
    const scss = readFileSync(scssPath, 'utf-8');
    const lightRuleBlock = scss.slice(scss.indexOf("html[data-theme='light']"));

    expect(lightRuleBlock).toMatch(
      /\.theme-toggle__facet--light\.theme-toggle__facet--pre-enter\s*\{[^}]*transform:\s*rotate\(0deg\)/,
    );
    expect(lightRuleBlock).toMatch(/\.theme-toggle__facet--dark\s*\{[^}]*opacity:\s*0/);
  });

  it('removes its transitionend listeners on unmount', () => {
    const { unmount } = render(<ThemeToggle />);
    const darkFacet = document.querySelector('.theme-toggle__facet--dark') as SVGSVGElement;
    const removeEventListenerSpy = vi.spyOn(darkFacet, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('transitionend', expect.any(Function));
  });
});
