import { useLayoutEffect } from 'react';
import { type GlobalProvider, ThemeState } from '@ladle/react';
import { STORAGE_KEY, applyTheme } from '../src/components/ThemeToggle';
import './theme.scss';
import './story-frame.scss';
import './typography.scss';
import './layout.scss';
import './primitives.scss';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Ladle's load-once entry and the workshop decorator: frames every story in
// the app surface, drives html[data-theme] from the toolbar through
// ThemeToggle's own `applyTheme`, and remounts the story on each switch since
// ThemeToggle reads data-theme only on mount. The `*-base` sheets are scoped
// to the frame so bare element rules stay off Ladle's own chrome.
// See claude-docs/workshop.md, ".ladle/".

// 'light'/'dark' are an explicit choice; 'auto' is the toolbar's unset position.
const syncTheme = (theme: ThemeState): void => {
  if (theme === ThemeState.Light || theme === ThemeState.Dark) {
    applyTheme(theme === ThemeState.Light ? 'light' : 'dark');
    return;
  }
  // Auto: clear the attribute and the persisted key, or Ladle's own init stamp
  // and a stale pin reassert themselves; ./theme.scss then follows the system.
  document.documentElement.removeAttribute('data-theme');
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked — nothing to undo
  }
};

// One half of the `reducedMotion` story pin — the matchMedia patch ThemeToggle's
// click handler reads; story-frame.scss's rule is the other. Undone on cleanup.
const useSimulatedReducedMotion = (enabled: boolean): void => {
  useLayoutEffect(() => {
    if (!enabled || typeof window.matchMedia !== 'function') return;
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string): MediaQueryList =>
      query === REDUCED_MOTION_QUERY
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as MediaQueryList)
        : original(query);
    return () => {
      window.matchMedia = original;
    };
  }, [enabled]);
};

export const Provider: GlobalProvider = ({ children, globalState, storyMeta }) => {
  // A story's `meta.theme` pin wins over the toolbar.
  const pinned = storyMeta?.theme;
  const theme =
    pinned === ThemeState.Light || pinned === ThemeState.Dark ? pinned : globalState.theme;

  // Child effects fire before a parent's, so Ladle's toolbar handler has already
  // set data-theme; this routes the persisted write through `applyTheme`.
  useLayoutEffect(() => {
    syncTheme(theme);
  }, [theme]);

  const reducedMotion = storyMeta?.reducedMotion === true;
  useSimulatedReducedMotion(reducedMotion);

  const frameClassName = reducedMotion
    ? 'ladle-story-frame ladle-story-frame--reduced-motion'
    : 'ladle-story-frame';

  // `key` remounts the story on every theme change (see the header).
  return (
    <div className={frameClassName} key={theme}>
      {children}
    </div>
  );
};
