# ThemeToggle

`src/components/ThemeToggle/` — the light/dark switch, and the only component
that writes the theme attribute.

## Shared contract

`applyTheme()` sets `html[data-theme]` and writes `localStorage['theme']` in a
`try`/`catch`. Both it and `STORAGE_KEY` are **exported**, because two other
places drive the same attribute and key:

- **The pre-paint script** inlined in `src/app/layout.tsx` re-implements the read
  half inline (it must run before any JS module loads). It sets `data-theme`
  **only when a stored choice exists** — with none, no attribute is set and
  `globals.scss` resolves the theme through `prefers-color-scheme`. That is why
  no `matchMedia` listener is needed: the system-preference tier stays live
  until the user makes an explicit choice.
- **The Ladle theme decorator** (`.ladle/components.tsx`) calls the same
  `applyTheme()` rather than keeping a second copy of the write half. Its `auto`
  branch clears **both** `data-theme` and `localStorage['theme']` — clearing
  only the attribute leaves a stale pin that reasserts itself on reload.

**The component reads `data-theme` only in mount effects** — it has no
subscription to a later attribute change. In the app that is fine: the attribute
changes only when this component's own click handler changes it. The workshop
gets around it by remounting the story on theme change (a `key` on the frame
wrapper). Any future component that renders `ThemeToggle` indirectly and needs
it to react to an external theme change needs that same remount, or
`ThemeToggle` needs a real subscription.

## Behaviour

The two-facet rotate-through-the-top swap: the outgoing facet gets
`theme-toggle__facet--out` (rotating through `$theme-toggle-icon-arc`), the
entering facet loses both modifier classes, and a `transitionend` listener parks
the outgoing facet back to `theme-toggle__facet--pre-enter` once its `transform`
transition completes. The fast-double-click guard clears both classes explicitly
rather than assuming either facet is at rest before toggling.

`aria-label` is "Toggle light and dark mode"; there is no tooltip, since the
label already names the action for sighted and screen-reader users alike.

## Icons

Celtic knotwork, inline SVG, no raster and no external asset: a woven crescent
for the dark facet, an interlaced solar disc for the light facet. Filled
artwork, so the `<svg>` elements carry **no `stroke`**.

**The fill is not themed.** The crescent is always `$soot`, the sun always
`$parchment`, in both themes — set per facet in `index.scss` from the **raw
palette, not the runtime tokens**, because they must stay the same colour in
both themes. Only the rotate swaps which one is showing; nothing about the icons
transitions on a theme change.

## Styling

Only the shared tokens and mixins: `$text-primary`, `$accent`,
`theme-transition()`, `focus-ring()`, `reduced-motion`. No new hand-picked
colour. `$theme-toggle-icon-arc` is the one component-local constant — it
describes the facet swap's rotation geometry, not a colour or duration the rest
of the app shares, so it is not a token.

- `fill` is deliberately **not** in the facet's `theme-transition()` — only
  `transform` is, so the swap is purely the rotate.
- Hover is `background-color: $accent-hover` **plus** `transform: scale(1.12)`
  from the pinned corner. On the dark theme `$accent` and `$accent-hover` are
  only a shade apart, so the colour step alone reads as almost nothing; the
  scale carries the hover and lands the same in both themes without forking a
  second hover colour per theme. It rides the shared `theme-transition()`
  duration/easing, and `reduced-motion` zeroes it with the rest.

## Stories

[`index.stories.tsx`](../../src/components/ThemeToggle/index.stories.tsx) —
four renders, no test ids and no snapshots; behaviour is asserted in
`index.test.tsx`, not here.

- **Default** — follows the toolbar theme control.
- **Light** / **Dark** — pin their theme with `.meta = { theme: '…' }`, which the
  decorator honours over the toolbar. Light shows the solar-disc facet and
  `aria-pressed="true"`; Dark the crescent and `aria-pressed="false"`.
- **ReducedMotion** — renders like Default; a linkable home for checking the
  component with the OS/browser `prefers-reduced-motion: reduce` setting on,
  which a story cannot force.

## Testing

`index.test.tsx` covers the accessible name, click-to-light and click-to-dark
with storage persistence, `aria-pressed`, the correct initial facet classes when
mounted already in light mode, the `transitionend` park back to `--pre-enter`, a
non-`transform` `transitionend` being ignored, and listener cleanup on unmount.
All queries are by role and accessible name.

**Not yet run through the repo's own runner.** Vitest is not wired up until
M1.7; this suite was verified against an ad-hoc Vitest + Testing Library harness
outside the repo, and should be re-verified once M1.7 lands.
