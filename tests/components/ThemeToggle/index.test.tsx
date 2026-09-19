import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';

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

// Stubs `matchMedia` so `(prefers-color-scheme: light)` reports `matches` —
// the exact query globals.scss keys its light tier off. jsdom's own
// `matchMedia` always answers `false`, which *is* the "system asks for
// neither" case, so a light system can only be exercised by replacing it.
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
  // server-rendered markup, so it paints first regardless of theme, and a mount
  // effect corrects it only after that paint. jsdom applies no real stylesheets,
  // so the paint-timing fix itself isn't observable here (see the `Light` story
  // for the manual check); this instead guards the index.scss rule that settles
  // both facets' visible state pre-paint, off the same `data-theme` attribute
  // the layout.tsx init script stamps before the browser paints anything — so a
  // future edit can't quietly drop it back to effect-only.
  it('settles both facets pre-paint via CSS keyed off data-theme, not just the mount effect', () => {
    // Not `fileURLToPath(new URL('./index.scss', import.meta.url))`: Vitest's
    // jsdom environment resolves `import.meta.url` against the mocked
    // browser `location` (matching real-browser semantics), not a `file:`
    // URL, so that pattern resolves to the wrong path here.
    const scssPath = join(process.cwd(), 'src/components/ThemeToggle/index.scss');
    const scss = readFileSync(scssPath, 'utf-8');
    const settledFacets = scss.slice(scss.indexOf('@mixin theme-toggle-light-facets'));

    expect(settledFacets).toMatch(
      /\.theme-toggle__facet--light\.theme-toggle__facet--pre-enter\s*\{[^}]*transform:\s*rotate\(0deg\)/,
    );
    expect(settledFacets).toMatch(/\.theme-toggle__facet--dark\s*\{[^}]*opacity:\s*0/);
  });

  // MB.23: and applied to *both* light tiers, not just the stored-choice one.
  // A light system preference never stamps `data-theme`, so an attribute-only
  // rule left the crescent showing on a light page until the mount effect
  // swapped it a paint later. These selectors mirror globals.scss's own light
  // tiers; if that cascade is ever restructured, both have to move together.
  it('settles the facets for a light system preference as well as a stored light choice', () => {
    const scssPath = join(process.cwd(), 'src/components/ThemeToggle/index.scss');
    const scss = readFileSync(scssPath, 'utf-8');

    expect(scss).toMatch(
      /@media\s*\(prefers-color-scheme:\s*light\)\s*\{\s*html:not\(\[data-theme='dark'\]\)\s*\{\s*@include theme-toggle-light-facets/,
    );
    expect(scss).toMatch(/html\[data-theme='light'\]\s*\{\s*@include theme-toggle-light-facets/);
  });

  // Regression (MB.23): there are three theme states, not two (globals.scss).
  // Dark is the `:root` default; a light *system* preference resolves through
  // `prefers-color-scheme` without ever stamping `data-theme`, because
  // layout.tsx's init script only stamps a *stored* choice. Reading the
  // attribute alone therefore reported "not light" on a light system with
  // nothing stored, so the first click applied `light` — the theme already
  // showing — and visibly did nothing. The current theme has to be resolved
  // the same way the stylesheet resolves it: attribute first, then the media
  // query, then dark.
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

  // The other half of that rule: nothing stored and no light preference is
  // dark, per globals.scss's `:root` default — so the first click goes light.
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
