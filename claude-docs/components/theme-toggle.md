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

**Reading the theme back is `resolveCurrentTheme()`, not a bare attribute
read** (MB.23). Because the attribute is absent unless a choice is stored, it
cannot by itself say what is on screen: on a light system with nothing stored
the page is light and the attribute is missing. So the component mirrors
`globals.scss`'s cascade — `data-theme` when present, else
`matchMedia('(prefers-color-scheme: light)')`, else dark. It asks for `light`
rather than `dark` deliberately: "no preference" has to resolve to dark to
match the `:root` default. Reading the attribute alone made the first click on
such a system apply `light`, the theme already showing, so it visibly did
nothing. `index.scss` mirrors the same two light tiers through the
`theme-toggle-light-facets` mixin, for the same reason and with the same
selectors; if that cascade is ever restructured, all three move together.

**The component reads the theme only in mount effects and its own click
handler** — it has no subscription to a later attribute change. In the app that is fine: the attribute
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

**The resting facets are settled in CSS, before first paint** (MB.2). The light
facet's `--pre-enter` class is baked into the server-rendered markup, so it is
what paints first whatever theme the visitor actually has — including light,
where the sun should already be at rest. The mount effect used to be the only
thing that corrected it, which ran _after_ that paint and let the facet visibly
swing from parked to resting. `index.scss`'s `theme-toggle-light-facets` mixin
settles the _visible_ state instead, keyed off the same `data-theme` the
pre-paint init script stamps; the mount effect still runs, but only to keep the
real class list correct for the next click. MB.23 is why the mixin is included
under both light tiers rather than the attribute alone: a light _system_
preference with nothing stored paints the page light while leaving the attribute
absent, and the crescent sat on a light page until the effect swapped it — the
exact swing MB.2 removed, still happening for anyone who had never clicked.

**Under `prefers-reduced-motion: reduce` the click handler parks the outgoing
facet itself** rather than waiting for a `transitionend` that never comes — the
`reduced-motion` block in `index.scss` sets `transition: none`, so no transition
runs and no event fires. Left to the listener, the outgoing facet stayed stuck
holding `--out`: rotated by `$theme-toggle-icon-arc` and still opaque, on top of
the facet that had just entered, compounding on every further toggle. The
preference is read live at click time (`window.matchMedia`), not cached at
mount, so changing the OS setting mid-session takes effect without a reload.
Any future change to the reduced-motion CSS has to keep this pairing in mind:
zeroing a transition also removes the event something was waiting on.

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

**The two facets are sized apart by 5%.** The crescent's knotwork carries less
visual weight than the sun's at the same box size, so the moon gets a 102% box
nudged up and right off the pivot corner (riding slightly higher and further
into the corner) and the sun a 95% box that grows and shrinks along its left and
bottom edges so its top-right pivot stays put. Sized via the box rather than
`transform: scale()`, because the `--out` / `--pre-enter` classes overwrite
`transform` wholesale for the rotate choreography.

## Styling

Only the shared tokens and mixins: `$text-primary`, `$accent`,
`theme-transition()`, `focus-ring()`, `reduced-motion`. No new hand-picked
colour. `$theme-toggle-icon-arc` is the one component-local constant — it
describes the facet swap's rotation geometry, not a colour or duration the rest
of the app shares, so it is not a token.

- `fill` is deliberately **not** in the facet's `theme-transition()` — only
  `transform` is, so the swap is purely the rotate.
- Hover is `background-color: $accent-hover` **plus** `transform: scale(1.07)`
  from the pinned corner. On the dark theme `$accent` and `$accent-hover` are
  only a shade apart, so the colour step alone reads as almost nothing; the
  scale carries the hover and lands the same in both themes without forking a
  second hover colour per theme. It rides the shared `theme-transition()`
  duration/easing, and `reduced-motion` zeroes it with the rest.

## Stories

[`index.stories.tsx`](../../src/components/ThemeToggle/index.stories.tsx) —
four renders, no test ids and no snapshots; behaviour is asserted in
`tests/components/ThemeToggle/index.test.tsx`, not here.

- **Default** — follows the toolbar theme control.
- **Light** / **Dark** — pin their theme with `.meta = { theme: '…' }`, which the
  decorator honours over the toolbar. Light shows the solar-disc facet and
  `aria-pressed="true"`; Dark the crescent and `aria-pressed="false"`.
- **ReducedMotion** — `.meta = { reducedMotion: true }`, which the workshop
  decorator (`.ladle/components.tsx`) reads to simulate
  `prefers-reduced-motion: reduce`: it patches `window.matchMedia` to match and
  the frame's `--reduced-motion` class zeroes every transition, so this story
  reproduces the real setting rather than only linking to it — see
  [`workshop.md`](../workshop.md)'s `reducedMotion` pin entry.

## Testing

`tests/components/ThemeToggle/index.test.tsx` covers the accessible name, click-to-light and click-to-dark
with storage persistence, `aria-pressed`, the correct initial facet classes when
mounted already in light mode, the `transitionend` park back to `--pre-enter`, a
non-`transform` `transitionend` being ignored, and listener cleanup on unmount.
All queries are by role and accessible name.

Three of them cover the reduced-motion park (MB.1): the immediate park on a
single click, both facets still correct after two toggles, and — the other side
of the branch — the facet still waiting on `transitionend` when motion is not
reduced. They stub `window.matchMedia` via `vi.stubGlobal`, since jsdom's own
implementation always answers `false` for `(prefers-reduced-motion: reduce)`.

Runs in the `unit` (jsdom) Vitest project — `npm run test:coverage`.
