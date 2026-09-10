import { useLayoutEffect } from 'react';
import { type GlobalProvider, ThemeState } from '@ladle/react';
import { STORAGE_KEY, applyTheme } from '../src/components/ThemeToggle';
import './theme.scss';
import './story-frame.scss';
import './typography.scss';
import './layout.scss';
import './primitives.scss';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

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
// _typography.scss is in the workshop as of M0.32, via ./typography.scss. M0.30
// and M0.31 had kept it out: imported globally it dropped bare element rules
// (`li::before { content: '◆' }`, the `ul`/`a` resets, `section`/`header`
// margins) onto Ladle's own `<ul>`/`<li>`/`<a>` chrome. The fix was to make
// _typography.scss's rules a `typography-base` mixin and `@include` it scoped —
// to `<body>` in the app, to `.ladle-story-frame` here — so a story renders
// prose exactly as a page does and Ladle's chrome, outside the frame, is left
// alone. See claude-docs/design-decisions/m0.32-component-stories.md.
//
// _layout.scss's `layout-base` (the `section`/`.header`/`.footer` structure
// pages build on) gets the same treatment via ./layout.scss, for the same
// reason: a bare `section` selector imported globally would land on Ladle's
// own chrome too.
//
// _primitives.scss's `primitives-base` (`.panel`, `.badge--*`, `.chip--*`,
// `.modal`, `.btn`, `.specimen*`) is scoped the same way via ./primitives.scss
// — these are classes rather than bare elements, but the same story-frame
// scoping keeps every mixin's output in one consistent place.

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

// Ladle serves a real browser, so `prefers-reduced-motion: reduce` reflects
// the actual OS/browser setting — there is no toolbar control that can force
// it the way the theme control forces `data-theme`. A story pins
// `.meta = { reducedMotion: true }` (ThemeToggle's `ReducedMotion` is the
// first) to get it simulated instead, and simulating it takes two parts, both
// needed:
//
//   1. Patch `window.matchMedia` so the query reports a match — the same
//      check MB.1 added to ThemeToggle's click handler to park a facet
//      immediately when no transitionend is coming. Without this, the story
//      would run the app's real logic against a `false` result no OS setting
//      produced, and MB.1's fix would look untested.
//   2. `./story-frame.scss`'s `.ladle-story-frame--reduced-motion` rule zeroes
//      every transition inside the frame, the same as the real media feature
//      does app-wide (not just the `reduced-motion` mixin's own call sites) —
//      so a transition genuinely doesn't run and doesn't produce a
//      `transitionend` the way it wouldn't under the real setting either.
//
// The patch is undone on cleanup so it never leaks into a story that follows
// without the pin.
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
  // A story can pin its own theme with `MyStory.meta = { theme: 'light' | 'dark' }`
  // — M0.31's decision doc left per-story parameters as the extension path, and
  // M0.32's ThemeToggle `Light` / `Dark` stories are the first to use it. A
  // pinned theme wins over the toolbar for that story (so the toolbar does
  // nothing while it's open, which is the point); an unpinned story follows the
  // toolbar exactly as before.
  const pinned = storyMeta?.theme;
  const theme =
    pinned === ThemeState.Light || pinned === ThemeState.Dark ? pinned : globalState.theme;

  // Runs before paint, and — because child effects fire before a parent's —
  // Ladle's own toolbar handler has already set data-theme synchronously by the
  // time a light/dark switch reaches here; this call routes the persisted write
  // through M0.29 and handles the 'auto' clear.
  useLayoutEffect(() => {
    syncTheme(theme);
  }, [theme]);

  // A story pins `.meta = { reducedMotion: true }` the same way `Light`/`Dark`
  // pin `theme` — see useSimulatedReducedMotion above for what pinning it does.
  const reducedMotion = storyMeta?.reducedMotion === true;
  useSimulatedReducedMotion(reducedMotion);

  const frameClassName = reducedMotion
    ? 'ladle-story-frame ladle-story-frame--reduced-motion'
    : 'ladle-story-frame';

  // `key` remounts the story subtree on every theme change, so a component that
  // reads data-theme once — on mount, like ThemeToggle's facet and
  // aria-pressed — follows the switch instead of freezing at its first value.
  return (
    <div className={frameClassName} key={theme}>
      {children}
    </div>
  );
};
