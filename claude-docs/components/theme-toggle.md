# ThemeToggle

`src/components/ThemeToggle/` is the light/dark switch, and the only component that writes the theme attribute. Its `variant` is `corner` (the default) or `inline`; only the look differs.

- **`corner`** is the disc pinned to the window, which the root layout mounts for every page. The root layout is session-free, so it cannot know a page has the shell around it. The shell has its own disc, so the stylesheet hides the corner on those pages with `body:has(.app-shell) > .theme-toggle--corner`. It still shows on the three routes outside the `(shell)` group: `/` (Welcome), `/sign-in` and `/invite/[token]`.
- **`inline`** is the disc in the application shell's bar, at every width. One instance is visible at a time, so there is no second copy whose facets could go stale, and the attribute on `<html>` is always right.

## Contracts

### The theme attribute

`applyTheme()` sets `html[data-theme]` and writes `localStorage['theme']` in a `try`/`catch`. Both it and `STORAGE_KEY` are exported, because two other places drive the same attribute and key:

- **The pre-paint script** in `src/app/pre-paint-scripts.tsx`, rendered in the root layout's `<head>`, re-implements the read half inline, because it must run before any JS module loads. It sets `data-theme` only when a stored choice exists. With none, no attribute is set and `globals.scss` resolves the theme through `prefers-color-scheme`. That is why no `matchMedia` listener is needed: the system-preference tier stays live until the user makes an explicit choice.
- **The Storybook theme decorator** (`.storybook/components.tsx`) calls the same `applyTheme()` rather than keeping a second copy of the write half. Its `auto` branch clears both `data-theme` and `localStorage['theme']`, because clearing only the attribute leaves a stale pin that reasserts itself on reload.

### Reading the theme back

- **`resolveCurrentTheme()` reads the theme, not a bare attribute read.** The attribute is absent unless a choice is stored, so it cannot say what is on screen: on a light system with nothing stored the page is light and the attribute is missing. The component mirrors `globals.scss`'s cascade: `data-theme` when present, else `matchMedia('(prefers-color-scheme: light)')`, else dark. It asks for `light` rather than `dark` because "no preference" has to resolve to dark to match the `:root` default.
- **`index.scss` mirrors the same two light tiers** through the `theme-toggle-light-facets` mixin, with the same selectors. If the cascade is restructured, all three move together.
- **The component reads the theme only in mount effects and its own click handler.** It has no subscription to a later attribute change. In the app that is fine, because the attribute changes only when this component's own click handler changes it. The workshop remounts the story on theme change (a `key` on the frame wrapper). Any component that renders `ThemeToggle` indirectly and needs it to react to an external theme change needs the same remount, or `ThemeToggle` needs a real subscription.

### The swap

- **The swap is two facets rotating through the top.** A `transitionend` listener parks the outgoing facet back to `theme-toggle__facet--pre-enter` once its `transform` transition completes. The fast-double-click guard clears both classes explicitly rather than assuming either facet is at rest.
- **The resting facets are settled in CSS before first paint.** The light facet's `--pre-enter` class is baked into the server-rendered markup, so it is what paints first whatever theme the visitor has, light included, where the sun should already be at rest. The mount effect runs after that paint, so it cannot correct it, or the facet visibly swings from parked to resting. The `theme-toggle-light-facets` mixin settles the visible state instead, keyed off the `data-theme` the pre-paint script stamps; the mount effect only keeps the class list correct for the next click. The mixin is included under both light tiers, because a light system preference with nothing stored paints the page light while leaving the attribute absent.
- **Under `prefers-reduced-motion: reduce` the click handler parks the outgoing facet itself.** The `reduced-motion` block in `index.scss` sets `transition: none`, so no transition runs and no `transitionend` fires. Left to the listener, the outgoing facet stays stuck holding `--out`, rotated and still opaque on top of the facet that just entered, compounding on every further toggle. The preference is read live at click time (`window.matchMedia`), not cached at mount, so changing the OS setting mid-session takes effect without a reload. Zeroing a transition also removes the event something was waiting on, so a change to the reduced-motion CSS keeps this pairing.
- **There is no tooltip**, since the label already names the action.

### Icons

- **Celtic knotwork, inline SVG, no raster and no external asset**: a woven crescent for the dark facet and an interlaced solar disc for the light facet. They are filled artwork, so the `<svg>` elements carry no `stroke`.
- **The fill is not themed.** The crescent is always `$soot` and the sun always `$parchment`, in both themes, set per facet in `index.scss` from the raw palette rather than the runtime tokens. Only the rotate swaps which one shows, and nothing about the icons transitions on a theme change.
- **The two facets are sized apart by 5%** (moon 102%, sun 95%, both holding the pivot corner), because the crescent carries less visual weight. The size is the box's, not `transform: scale()`, because the `--out` and `--pre-enter` classes overwrite `transform` wholesale.

## Styling

- **Hover scales the corner disc by 1.07**, because on the dark theme `$accent` and `$accent-hover` are a shade apart and the colour step alone reads as almost nothing. The inline disc has no scale.
- **`z-index: layer('toggle')`**, above the tucked impersonation banner (`layer('banner')`), which runs the window's width beneath this corner where a pointer can hover. The toggle stays reachable while the banner is open, and pointing at it never opens the banner ([`impersonation-banner.md`](impersonation-banner.md)).
- **`overflow: hidden` on the corner button.** The parked facet sits past the window's right edge. `clip-path` hides it but still lets it count as overflow, which Chrome's device emulator lets the page pan to. The button's own box already holds the visible quarter, so containing the facet there changes nothing on screen.
- **`top: 0`**, the window's top. On a touch screen the banner in the flow scrolls away beneath it ([`styling.md`](../styling.md), "The top inset").
- **The inline disc** is in the page's flow, with no `position: fixed` and no clip-path. The button is padded out to `$control-height` so the target is a finger's, and the focus ring is drawn on the disc.

## Not here

Stories: [`index.stories.tsx`](../../src/components/ThemeToggle/index.stories.tsx), "Layout / Theme Toggle".

- **The corner variant is a quarter disc clipped by the story frame's edge**, which is the design, not a clipped story.
- **Light and dark have no stories.** The toolbar's theme control (or `globals=theme:light` in the link) sets the theme.
- **Manual check, the sun swinging in on first paint**: open `/iframe.html?id=layout-theme-toggle--states&globals=theme:light` directly. The workshop stamps `data-theme` before paint, as the app's init script does, so the link reproduces that timing, which no test covers.
- **`ReducedMotion`** sets `parameters: { reducedMotion: true }`, which the workshop decorator (`.storybook/preview.tsx`) reads to simulate `prefers-reduced-motion: reduce`. It patches `window.matchMedia` to match, and the frame's `--reduced-motion` class zeroes every transition ([`workshop.md`](../workshop.md), the `reducedMotion` pin entry).

Tests: `tests/components/ThemeToggle/index.test.tsx` (the `dom` project). The facets' animation is presentation, and no test asserts it.
