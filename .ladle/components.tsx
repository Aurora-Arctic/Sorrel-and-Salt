import { useLayoutEffect } from 'react';
import { type GlobalProvider, ThemeState } from '@ladle/react';
import { STORAGE_KEY, applyTheme } from '../src/components/ThemeToggle';
import './theme.scss';
import './story-frame.scss';
import './typography.scss';
import './layout.scss';
import './primitives.scss';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Ladle loads this file once, ahead of every story: it is the workshop
// decorator. It frames every story in the app surface (./story-frame.scss),
// drives html[data-theme] from the toolbar's theme control through
// ThemeToggle's own `applyTheme`, and remounts the story on every switch,
// because ThemeToggle reads data-theme only on mount.
//
// The three `*-base` sheets imported above scope _typography/_layout/_primitives
// to `.ladle-story-frame`. Imported globally instead, their bare element rules
// (`li::before { content: '◆' }`, the `ul`/`a` resets, `section` margins) land
// on Ladle's own `<ul>`/`<li>`/`<a>` chrome. See claude-docs/workshop.md.

// The toolbar control's state: 'light'/'dark' are an explicit choice, 'auto' is
// the unset position.
const syncTheme = (theme: ThemeState): void => {
  if (theme === ThemeState.Light || theme === ThemeState.Dark) {
    // The exact write the app's ThemeToggle makes, imported rather than
    // re-implemented here.
    applyTheme(theme === ThemeState.Light ? 'light' : 'dark');
    return;
  }
  // Auto — leave no explicit choice, so ./theme.scss resolves the theme through
  // `prefers-color-scheme` as globals.scss does. Ladle's own init stamps a
  // resolved light/dark on load; clear it, and the persisted key with it, or a
  // stale pin reasserts itself.
  document.documentElement.removeAttribute('data-theme');
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked (private browsing, disabled storage) — nothing to undo
  }
};

// `prefers-reduced-motion: reduce` is a real OS setting Ladle has no control
// for, so a story pins `.meta = { reducedMotion: true }` to simulate it. This
// is one half — the matchMedia patch ThemeToggle's click handler reads;
// story-frame.scss's `--reduced-motion` rule is the other, and both are needed
// (claude-docs/workshop.md, ".ladle/"). Undone on cleanup, so it never leaks
// into a story that follows without the pin.
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
  // `MyStory.meta = { theme: 'light' | 'dark' }` wins over the toolbar for that
  // story — the toolbar does nothing while it is open, which is the point. An
  // unpinned story follows the toolbar.
  const pinned = storyMeta?.theme;
  const theme =
    pinned === ThemeState.Light || pinned === ThemeState.Dark ? pinned : globalState.theme;

  // Runs before paint, and because child effects fire before a parent's,
  // Ladle's own toolbar handler has already set data-theme by the time a
  // light/dark switch reaches here. This routes the persisted write through
  // `applyTheme` and handles the 'auto' clear.
  useLayoutEffect(() => {
    syncTheme(theme);
  }, [theme]);

  const reducedMotion = storyMeta?.reducedMotion === true;
  useSimulatedReducedMotion(reducedMotion);

  const frameClassName = reducedMotion
    ? 'ladle-story-frame ladle-story-frame--reduced-motion'
    : 'ladle-story-frame';

  // `key` remounts the story subtree on every theme change, so a component
  // reading data-theme once on mount follows the switch instead of freezing at
  // its first value.
  return (
    <div className={frameClassName} key={theme}>
      {children}
    </div>
  );
};
