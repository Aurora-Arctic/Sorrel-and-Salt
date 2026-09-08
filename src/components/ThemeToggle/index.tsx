'use client';

import { type ReactElement, useEffect, useRef } from 'react';
import './index.scss';

// Keep in sync with the pre-paint init script in src/app/layout.tsx — both
// read/write the same key so the toggle and the flash-prevention script never
// disagree on where the stored choice lives.
export const STORAGE_KEY = 'theme';

// The one place a theme gets applied, so anything that wants to change the
// theme — this component, and M0.31's Ladle decorator — goes through the same
// function rather than each re-implementing the attribute + storage write.
export const applyTheme = (theme: 'light' | 'dark'): void => {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (private browsing, disabled storage) — theme
    // still applies for this page view, just won't persist across reloads
  }
};

// The dark (moon) facet starts resting/visible and the light (sun) facet
// starts parked off to the side (--pre-enter), matching this component's
// dark-mode-by-default markup. If the real starting theme turns out to be
// light (system preference or a stored choice), the effect below corrects
// this pre-paint so there's no flash of the wrong icon.
const OUT_CLASS = 'theme-toggle__facet--out';
const PRE_ENTER_CLASS = 'theme-toggle__facet--pre-enter';

// When a facet finishes animating out (rotate 0 -> arc, through the top),
// reset it straight back to --pre-enter — instant, since that class carries
// its own zero-duration transition — so it's parked and ready for its next
// entrance rather than retracing back down through the top it just exited
// through.
const handleFacetTransitionEnd = (event: TransitionEvent): void => {
  const facet = event.target;
  if (
    event.propertyName === 'transform' &&
    facet instanceof SVGElement &&
    facet.classList.contains(OUT_CLASS)
  ) {
    facet.classList.remove(OUT_CLASS);
    facet.classList.add(PRE_ENTER_CLASS);
  }
};

const ThemeToggle = (): ReactElement => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const darkFacetRef = useRef<SVGSVGElement>(null);
  const lightFacetRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const darkFacet = darkFacetRef.current;
    const lightFacet = lightFacetRef.current;
    darkFacet?.addEventListener('transitionend', handleFacetTransitionEnd);
    lightFacet?.addEventListener('transitionend', handleFacetTransitionEnd);
    return () => {
      darkFacet?.removeEventListener('transitionend', handleFacetTransitionEnd);
      lightFacet?.removeEventListener('transitionend', handleFacetTransitionEnd);
    };
  }, []);

  useEffect(() => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    buttonRef.current?.setAttribute('aria-pressed', String(isLight));
    if (isLight) {
      lightFacetRef.current?.classList.remove(PRE_ENTER_CLASS);
      darkFacetRef.current?.classList.add(PRE_ENTER_CLASS);
    }
  }, []);

  const handleToggle = (): void => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const outgoingFacet = isLight ? lightFacetRef.current : darkFacetRef.current;
    const enteringFacet = isLight ? darkFacetRef.current : lightFacetRef.current;
    // Don't assume either facet is in its "normal" resting class state — a
    // click before the previous transition/transitionend finished can leave a
    // facet holding the other modifier (e.g. still --out from an exit that
    // got interrupted), so clear both explicitly rather than toggling just
    // the one each side is expected to have. Otherwise the entering facet can
    // get stuck never losing --out, staying parked out of view instead of
    // coming back to rest.
    outgoingFacet?.classList.remove(PRE_ENTER_CLASS);
    outgoingFacet?.classList.add(OUT_CLASS);
    enteringFacet?.classList.remove(OUT_CLASS, PRE_ENTER_CLASS);
    applyTheme(isLight ? 'dark' : 'light');
    buttonRef.current?.setAttribute('aria-pressed', String(!isLight));
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className="theme-toggle"
      aria-label="Toggle light and dark mode"
      aria-pressed={false}
      onClick={handleToggle}
    >
      <span className="theme-toggle__facets">
        {/*
          Facet paths are placeholders — Celtic knotwork replacements (moon
          with a perched crow, sun as a woven interlace) are being drawn
          separately and land as a follow-up commit on this branch. See
          claude-docs/components/theme-toggle.md.
        */}
        <svg
          ref={darkFacetRef}
          className="theme-toggle__facet theme-toggle__facet--dark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <svg
          ref={lightFacetRef}
          className="theme-toggle__facet theme-toggle__facet--light theme-toggle__facet--pre-enter"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </span>
    </button>
  );
};

export default ThemeToggle;
