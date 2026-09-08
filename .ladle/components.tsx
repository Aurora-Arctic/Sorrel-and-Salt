import { useLayoutEffect } from 'react';
import { type GlobalProvider, ThemeState } from '@ladle/react';
import { STORAGE_KEY, applyTheme } from '../src/components/ThemeToggle';
import './theme.scss';
import './story-frame.scss';

// Ladle loads this file once, ahead of every story. M0.31 grows it from M0.30's
// passthrough into the workshop decorator. Everything it does was spotted while
// standing up M0.30 — see
// claude-docs/design-decisions/m0.30-ladle-component-workshop.md and
// .../m0.31-workshop-theme-decorator.md.
//
//   1. Frame every story in the app surface. ./story-frame.scss paints the
//      globals.scss <body> tokens ($surface-page / $text-primary) onto the
//      wrapper below and cancels Ladle's .ladle-main gutter, so a component is
//      built and reviewed on the ground it ships on with no per-story setup.
//   2. Make that wrapper a containing block (a `transform` in the SCSS) so a
//      `position: fixed` component — ThemeToggle — pins to the story frame's
//      corner instead of escaping to Ladle's toolbar and sidebar.
//   3. Drive html[data-theme] from the toolbar's theme control
//      (.ladle/config.mjs: addons.theme) through the M0.29 helper — the one
//      place a theme is applied — and remount the story on every switch,
//      because ThemeToggle reads data-theme only on mount.
//
// _typography.scss stays out of the workshop (M0.30 left this open). It emits
// bare element rules — `li::before { content: '◆' }`, the `ul`/`a` resets,
// `section`/`header` margins — that a `@use` can't scope to the story frame, so
// pulling it in either bleeds onto Ladle's own `<ul>`/`<li>`/`<a>` chrome (the
// reason M0.30 pulled it) or needs _typography.scss restructured to nest under
// a selector, which is out of proportion to this task. Components style from
// tokens and mixins, not prose (CLAUDE.md), so a story doesn't need it yet;
// M0.32 revisits if one that renders prose arrives.

// Ladle hands the toolbar control's state as one of 'light' | 'dark' | 'auto'.
// 'light'/'dark' are an explicit choice; 'auto' is the unset position.
const syncTheme = (theme: ThemeState): void => {
  if (theme === ThemeState.Light || theme === ThemeState.Dark) {
    // The exact write the app's ThemeToggle makes — data-theme attribute plus
    // the persisted choice — imported from M0.29, not re-implemented here.
    applyTheme(theme === ThemeState.Light ? 'light' : 'dark');
    return;
  }
  // ThemeState.Auto — leave no explicit choice, so ./theme.scss resolves the
  // theme through `prefers-color-scheme` just as globals.scss does in the app,
  // and M0.29's rule that an absent attribute is a valid state holds in the
  // workshop too. Ladle's own init side effect stamps a resolved light/dark on
  // load; clear it (and the persisted key) so the media query decides.
  document.documentElement.removeAttribute('data-theme');
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked (private browsing, disabled storage) — nothing to undo
  }
};

export const Provider: GlobalProvider = ({ children, globalState }) => {
  const { theme } = globalState;

  // Runs before paint, and — because child effects fire before a parent's —
  // Ladle's own toolbar handler has already set data-theme synchronously by the
  // time a light/dark switch reaches here; this call routes the persisted write
  // through M0.29 and handles the 'auto' clear.
  useLayoutEffect(() => {
    syncTheme(theme);
  }, [theme]);

  // `key` remounts the story subtree on every theme change, so a component that
  // reads data-theme once — on mount, like ThemeToggle's facet and
  // aria-pressed — follows the switch instead of freezing at its first value.
  return (
    <div className="ladle-story-frame" key={theme}>
      {children}
    </div>
  );
};
