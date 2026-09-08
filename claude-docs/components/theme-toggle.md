# ThemeToggle

M0.29. Ported from resume-2026's `src/components/ThemeToggle/`, with its
choreography kept and its chrome dropped.

## What carries over from resume-2026

- The toggle logic: `applyTheme()` sets `html[data-theme]` and writes
  `localStorage['theme']` in a `try`/`catch`.
- The two-facet rotate-through-the-top swap: an outgoing facet gets
  `theme-toggle__facet--out` (rotate through `$theme-toggle-icon-arc`), the
  entering facet loses both modifier classes, and a `transitionend` listener
  parks the outgoing facet back to `theme-toggle__facet--pre-enter` once its
  `transform` transition completes — including the fast-double-click guard
  that clears both classes explicitly rather than assuming either facet is at
  rest before toggling.

## What was dropped, and why

- **The folded-corner button chrome** — the `::before` border, its
  `$silver-oxide` / `$lavender-oxide` swap, and the clip-path triangle. That
  was resume-2026's paper-card styling, not a token this repo has.
- **`_buttons.scss` and `print-hidden`** — files this repo does not have and
  won't get outside M10.22, which scopes `_print.scss` to the spell recipe
  view only.
- **The `Tooltip` wrapper** — a separate resume-2026 component that is not
  ported. The button's `aria-label` already names the action, so the tooltip
  was redundant for both sighted and screen-reader users.
- **The aria-label text** — resume-2026's label read "...for the paper",
  specific to that resume site. This port uses "Toggle light and dark mode".

## Icons

The two facets are redrawn, not ported: resume-2026's faceted polygon icons
are replaced with Celtic knotwork — smooth interlaced curves, with an
over-under weave that reads at the rendered size, not only zoomed in. The
moon facet contains a crow perched in the crescent, drawn in the same
knotwork line rather than as separate art layered on top.

Icons are inline SVG on `currentColor`: no raster, no external asset, and no
per-theme variant — the same two paths render in both themes because they
inherit the button's `color`, which already changes with the theme via
`$text-primary`/`$accent`.

## Pre-paint init script

`src/app/layout.tsx` inlines a synchronous script (in place of resume-2026's
`gatsby-ssr.ts`) that sets `data-theme` **only when a stored choice exists**.
With no stored choice, no attribute is set and `globals.scss` resolves the
theme through `prefers-color-scheme`, same as if the toggle had never been
clicked. This is a deliberate divergence from resume-2026, which stamps the
resolved theme unconditionally and therefore needs a `matchMedia` listener to
keep pace with a system-preference change — this version never needs one,
because the system-preference tier stays live until the user makes an
explicit choice.

The script and the component share one `applyTheme()` function and one
`STORAGE_KEY` — the pre-paint script re-implements the read half of the
same contract (`localStorage.getItem('theme')` → `setAttribute`) inline
(it has to run before any JS module loads), and the component's
`applyTheme()` is exported so M0.31's Ladle theme decorator can drive the
same attribute without a second copy of the write half.

## Styling

Only M0.6/M0.7/M0.8 tokens and mixins: `$text-primary`, `$accent`,
`theme-transition()`, `focus-ring()`, `reduced-motion`. No new hand-picked
colour. `$theme-toggle-icon-arc` is the one component-local constant — it
describes the facet swap's rotation geometry, not a colour or duration the
rest of the app shares, so it isn't a token.

## Testing

`index.test.tsx` ports resume-2026's suite unchanged apart from the new
label text and the removed Tooltip assertion: accessible name, click-to-light
and click-to-dark with storage persistence, `aria-pressed`, correct initial
facet classes when mounted already in light mode, the `transitionend` park
back to `--pre-enter`, a non-transform `transitionend` being ignored, and
listener cleanup on unmount. All queries are by role and accessible name, per
repo convention.

Vitest is not wired up in this repo until M1.7, so this suite could not be
run through `npm run test:coverage` as part of this task — it was run against
an ad-hoc Vitest + Testing Library harness outside the repo to confirm it
passes, and should be re-verified with the repo's own runner once M1.7 lands.
