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
are replaced with Celtic knotwork — a woven crescent for the dark facet and
an interlaced solar disc for the light facet, smooth curves with an
over-under weave that reads at the rendered size, not only zoomed in. This
is filled artwork, not stroked line icons (the resume-2026 placeholders
were), so the `<svg>` elements carry no `stroke`. The crescent has no crow —
the earlier plan for a perched crow was dropped.

The fill is **not themed**. The crescent is always `$soot` (the near-black
ground ink) and the sun always `$parchment`, in both themes — set per facet
in `index.scss` from the raw palette, not the runtime tokens. Only the
rotate swaps which one is showing; nothing about the icons transitions on a
theme change. Icons are inline SVG, no raster and no external asset.

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
`applyTheme()` and `STORAGE_KEY` are exported so the M0.31 Ladle theme
decorator drives the same attribute and storage key without a second copy
of the write half. See
[`../design-decisions/m0.31-workshop-theme-decorator.md`](../design-decisions/m0.31-workshop-theme-decorator.md).

## In the workshop

`ThemeToggle` sets its facet and `aria-pressed` from `data-theme` **only in
mount effects** — it has no subscription to a later attribute change. In the
app that is fine: the attribute changes only when _this_ component's own
click handler changes it. In the Ladle workshop the theme also changes from
the toolbar control, so the M0.31 decorator remounts the story on every
theme change (a `key` on the frame wrapper) — that is what makes the facet
track the toolbar. Any future component that renders `ThemeToggle`
indirectly and needs it to react to an external theme change would need the
same remount, or `ThemeToggle` would need a real subscription.

## Styling

Only M0.6/M0.7/M0.8 tokens and mixins: `$text-primary`, `$accent`,
`theme-transition()`, `focus-ring()`, `reduced-motion`. No new hand-picked
colour. `$theme-toggle-icon-arc` is the one component-local constant — it
describes the facet swap's rotation geometry, not a colour or duration the
rest of the app shares, so it isn't a token.

The facets set a fixed `fill` per modifier class — `--dark` gets `$soot`,
`--light` gets `$parchment` — raw palette values rather than tokens, since
they must stay the same colour in both themes. `fill` is deliberately **not**
in the facet's `theme-transition()`: only `transform` is, so the swap is
purely the rotate.

Hover is `background-color: $accent-hover` **plus** `transform: scale(1.12)`
from the pinned corner. On the dark theme `$accent` and `$accent-hover` are
only a shade apart, so the colour step alone reads as almost nothing; the
scale carries the hover and lands the same in both themes without forking a
second hover colour per theme. It rides the shared `theme-transition()`
duration/easing alongside the background, and `reduced-motion` zeroes it
with the rest.

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
